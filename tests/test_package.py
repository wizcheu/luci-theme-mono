import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("build", ROOT / "scripts/build.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def unpack(data):
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        return {member.name.removeprefix("./"): (tar.extractfile(member).read(), member) for member in tar.getmembers() if member.isfile()}


class PackageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.out = Path(cls.temp.name)
        cls.ipk = build.build(cls.out, 0)
        cls.outer = unpack(cls.ipk.read_bytes())
        cls.data = unpack(cls.outer["data.tar.gz"][0])
        cls.control = unpack(cls.outer["control.tar.gz"][0])

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_reproducible_build_and_checksums(self):
        first = self.ipk.read_bytes()
        second = build.build(self.out / "again", 0).read_bytes()
        self.assertEqual(first, second)
        import hashlib
        manifest = json.loads((self.out / "manifest.json").read_text())
        self.assertEqual(manifest["sha256"], hashlib.sha256(first).hexdigest())
        for path, digest in manifest["files"].items():
            self.assertEqual(hashlib.sha256(self.data[path][0]).hexdigest(), digest)

    def test_opkg_structure_architecture_and_runtime_files(self):
        self.assertEqual(set(self.outer), {"debian-binary", "control.tar.gz", "data.tar.gz"})
        self.assertEqual(self.outer["debian-binary"][0], b"2.0\n")
        self.assertIn(b"Architecture: all\n", self.control["control"][0])
        self.assertIn(b"Depends: luci-base, rpcd-mod-luci\n", self.control["control"][0])
        self.assertIn("usr/share/ucode/luci/template/themes/mono/header.ut", self.data)
        self.assertIn("usr/share/ucode/luci/template/themes/mono/sysauth.ut", self.data)
        self.assertIn("www/luci-static/resources/menu-mono.js", self.data)
        self.assertIn("www/luci-static/mono/compat.css", self.data)
        with tarfile.open(fileobj=io.BytesIO(self.outer["data.tar.gz"][0]), mode="r:gz") as tar:
            directories = {m.name.removeprefix("./").rstrip("/") for m in tar.getmembers() if m.isdir()}
            for path in self.data:
                self.assertIn(Path(path).parent.as_posix(), directories)
        for path, (_, member) in self.data.items():
            self.assertFalse(path.startswith(("preview/", "tests/", "node_modules/", "etc/config/")))
            self.assertEqual(member.uid, 0)
            self.assertEqual(member.gid, 0)
        self.assertEqual(self.data["etc/uci-defaults/30_luci-theme-mono"][1].mode, 0o755)
        self.assertIn(("?v=" + build.metadata()).encode(), self.data["usr/share/ucode/luci/template/themes/mono/header.ut"][0])

    def test_shell_hooks_parse_and_buildroot_install_has_no_side_effects(self):
        for name in ("preinst", "postinst", "postrm"):
            text = self.control[name][0]
            subprocess.run(["sh", "-n"], input=text, check=True)
            subprocess.run(["sh"], input=text, env={**os.environ, "IPKG_INSTROOT": "/build/root"}, check=True)

    def test_legacy_luci_rejected_without_mutation(self):
        script = self.control["preinst"][0].decode().replace("/usr/share/ucode/luci/runtime.uc", str(self.out / "missing-runtime.uc"))
        result = subprocess.run(["sh"], input=script, text=True, env={**os.environ, "IPKG_INSTROOT": ""}, capture_output=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn("unsupported legacy runtime", result.stderr)

    def uci_environment(self, directory):
        state = directory / "uci.json"
        state.write_text(json.dumps({"luci.main.mediaurlbase": "/luci-static/argon", "luci.themes": "internal", "luci.themes.Argon": "/luci-static/argon"}))
        executable = directory / "uci"
        executable.write_text(f"#!{sys.executable}\n" + """import os, json, sys
from pathlib import Path
p = Path(os.environ['UCI_STATE'])
s = json.loads(p.read_text())
a = [arg for arg in sys.argv[1:] if arg != '-q']
if a[0] == 'get':
    if a[1] not in s: sys.exit(1)
    print(s[a[1]])
elif a[0] == 'set':
    k, v = a[1].split('=', 1); s[k] = v
elif a[0] == 'delete':
    s.pop(a[1], None)
p.write_text(json.dumps(s))
""")
        executable.chmod(0o755)
        return state, {**os.environ, "PATH": str(directory) + os.pathsep + os.environ["PATH"], "UCI_STATE": str(state), "IPKG_INSTROOT": ""}

    def test_registration_is_idempotent_and_keeps_selected_theme(self):
        with tempfile.TemporaryDirectory() as temporary:
            state, env = self.uci_environment(Path(temporary))
            script = self.data["etc/uci-defaults/30_luci-theme-mono"][0]
            for _ in range(2):
                subprocess.run(["sh"], input=script, env=env, check=True)
            data = json.loads(state.read_text())
            self.assertEqual(data["luci.main.mediaurlbase"], "/luci-static/argon")
            self.assertEqual(data["luci.themes.Mono"], "/luci-static/mono")
            self.assertEqual(data["luci.themes.Argon"], "/luci-static/argon")

    def test_upgrade_keeps_registration_and_active_theme(self):
        with tempfile.TemporaryDirectory() as temporary:
            state, env = self.uci_environment(Path(temporary))
            initial = {"luci.main.mediaurlbase": "/luci-static/mono", "luci.themes.Mono": "/luci-static/mono", "luci.themes.Argon": "/luci-static/argon"}
            state.write_text(json.dumps(initial))
            subprocess.run(["sh", "-s", "--", "upgrade"], input=self.control["postrm"][0], env=env, check=True)
            self.assertEqual(json.loads(state.read_text()), initial)

    def test_removal_only_resets_selection_when_mono_is_active(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            state, env = self.uci_environment(directory)
            script = self.control["postrm"][0].decode().replace("/tmp/luci-indexcache.", str(directory / "luci-indexcache."))
            for current in ("/luci-static/argon", "/luci-static/mono"):
                state.write_text(json.dumps({"luci.main.mediaurlbase": current, "luci.themes.Mono": "/luci-static/mono", "luci.themes.Argon": "/luci-static/argon"}))
                subprocess.run(["sh"], input=script, text=True, env=env, check=True)
                data = json.loads(state.read_text())
                self.assertNotIn("luci.themes.Mono", data)
                self.assertEqual(data["luci.themes.Argon"], "/luci-static/argon")
                self.assertEqual(data.get("luci.main.mediaurlbase"), current if current.endswith("argon") else None)


if __name__ == "__main__":
    unittest.main()

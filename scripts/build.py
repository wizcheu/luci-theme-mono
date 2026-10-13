#!/usr/bin/env python3
"""Build a deterministic, architecture-independent opkg IPK without an SDK."""
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tarfile

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = "luci-theme-mono"


def metadata():
    makefile = (ROOT / "Makefile").read_text()
    version = re.search(r"^PKG_VERSION:=(\S+)$", makefile, re.M).group(1)
    release = re.search(r"^PKG_RELEASE:=(\S+)$", makefile, re.M).group(1)
    return f"{version}-{release}"


def archive(files: dict[str, tuple[bytes, int]], epoch: int) -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w", format=tarfile.GNU_FORMAT) as tar:
        directories = {parent.as_posix() for name in files for parent in Path(name).parents if parent.as_posix() != "."}
        for name in sorted(directories):
            item = tarfile.TarInfo("./" + name + "/")
            item.type, item.mode, item.mtime = tarfile.DIRTYPE, 0o755, epoch
            item.uid = item.gid = 0
            item.uname = item.gname = "root"
            tar.addfile(item)
        for name, (data, mode) in sorted(files.items()):
            item = tarfile.TarInfo("./" + name)
            item.size, item.mode, item.mtime = len(data), mode, epoch
            item.uid = item.gid = 0
            item.uname = item.gname = "root"
            tar.addfile(item, io.BytesIO(data))
    compressed = io.BytesIO()
    with gzip.GzipFile(filename="", fileobj=compressed, mode="wb", mtime=0) as stream:
        stream.write(buffer.getvalue())
    return compressed.getvalue()


def payload():
    files = {}
    for source, target in (("htdocs", "www"), ("ucode", "usr/share/ucode/luci"), ("root", "")):
        for path in sorted((ROOT / source).rglob("*")):
            if path.is_symlink():
                raise ValueError(f"Symlinks are not supported: {path}")
            if not path.is_file():
                continue
            relative = path.relative_to(ROOT / source).as_posix()
            destination = "/".join(filter(None, (target, relative)))
            data = path.read_bytes()
            if path.suffix == ".ut":
                data = re.sub(rb'("\{\{ (?:media|resource) \}\}/[^"\s]+\.(?:css|js))"',
                              lambda m: m[1] + b'?v=' + metadata().encode() + b'"', data)
            files[destination] = (data, 0o755 if source == "root" and relative.startswith("etc/uci-defaults/") else 0o644)
    for name in ("LICENSE", "NOTICE"):
        files[f"usr/share/{PACKAGE}/{name}"] = ((ROOT / name).read_bytes(), 0o644)
    return files


def build(out: Path, epoch: int):
    version = metadata()
    files = payload()
    data = archive(files, epoch)
    control = f"""Package: {PACKAGE}
Version: {version}
Depends: luci-base, rpcd-mod-luci
Source: custom
Section: luci
Architecture: all
Maintainer: wizcheu
Installed-Size: {sum(len(content) for content, _ in files.values())}
Description: A monochrome LuCI theme inspired by shadcn/ui, for ucode-based LuCI.
License: Apache-2.0
"""
    preinst = """#!/bin/sh
if [ -z "$IPKG_INSTROOT" ] && [ ! -f /usr/share/ucode/luci/runtime.uc ]; then
    echo 'Mono requires ucode-based LuCI. This firmware uses an unsupported legacy runtime.' >&2
    exit 1
fi
exit 0
"""
    postinst = """#!/bin/sh
[ -n "$IPKG_INSTROOT" ] && exit 0
if ( . /etc/uci-defaults/30_luci-theme-mono ); then
    rm -f /etc/uci-defaults/30_luci-theme-mono
fi
rm -f /tmp/luci-indexcache.*
rm -rf /tmp/luci-modulecache/
[ ! -x /etc/init.d/rpcd ] || /etc/init.d/rpcd reload
exit 0
"""
    postrm = """#!/bin/sh
[ -n "$IPKG_INSTROOT" ] && exit 0
[ "$1" = upgrade ] && exit 0
if [ "$(uci -q get luci.main.mediaurlbase)" = /luci-static/mono ]; then
    uci -q delete luci.main.mediaurlbase
fi
uci -q delete luci.themes.Mono
uci commit luci
rm -f /tmp/luci-indexcache.*
exit 0
"""
    control_files = {"control": (control.encode(), 0o644), "preinst": (preinst.encode(), 0o755),
                     "postinst": (postinst.encode(), 0o755), "postrm": (postrm.encode(), 0o755)}
    package = archive({"debian-binary": (b"2.0\n", 0o644), "control.tar.gz": (archive(control_files, epoch), 0o644),
                       "data.tar.gz": (data, 0o644)}, epoch)
    out.mkdir(parents=True, exist_ok=True)
    name = f"{PACKAGE}_{version}_all.ipk"
    (out / name).write_bytes(package)
    digest = hashlib.sha256(package).hexdigest()
    (out / "SHA256SUMS").write_text(f"{digest}  {name}\n")
    manifest = {"package": PACKAGE, "version": version, "architecture": "all", "sha256": digest,
                "files": {path: hashlib.sha256(content).hexdigest() for path, (content, _) in files.items()}}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built {out / name} ({len(package):,} bytes)")
    return out / name


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "dist")
    parser.add_argument("--epoch", type=int, default=int(os.environ.get("SOURCE_DATE_EPOCH", "0")))
    args = parser.parse_args()
    build(args.out, args.epoch)

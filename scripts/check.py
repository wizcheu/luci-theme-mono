#!/usr/bin/env python3
"""Check release metadata and every production script before packaging."""
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
makefile = (ROOT / 'Makefile').read_text()
version = re.search(r'^PKG_VERSION:=(\S+)$', makefile, re.M).group(1)
for name in ('package.json', 'package-lock.json'):
    data = json.loads((ROOT / name).read_text())
    assert data['version'] == version, f'{name} version differs from Makefile'
    if 'packages' in data:
        assert data['packages']['']['version'] == version
tag = os.environ.get('GITHUB_REF', '')
if tag.startswith('refs/tags/'):
    assert tag == f'refs/tags/v{version}', 'Release tag differs from package version'
for path in (ROOT / 'root').rglob('*.json'):
    json.loads(path.read_text())
for path in (ROOT / 'htdocs').rglob('*.js'):
    subprocess.run(['node', '--check', str(path)], check=True)
subprocess.run(['sh', '-n', str(ROOT / 'root/etc/uci-defaults/30_luci-theme-mono')], check=True)
print(f'Mono {version}: release metadata, JSON and runtime syntax checks passed.')

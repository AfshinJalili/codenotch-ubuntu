#!/usr/bin/env python3
"""Build an extension zip with an explicit file list; never package account data."""
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
subprocess.run(['glib-compile-schemas', '--strict', str(ROOT / 'schemas')], check=True)
files = ['metadata.json', 'extension.js', 'model.js', 'design.js', 'draw.js', 'glyphs.js',
         'prefs.js', 'stylesheet.css', 'LICENSE', 'README.md',
         'reader/codenotch_reader.py', 'reader/activity.py',
         'schemas/org.gnome.shell.extensions.codenotch.gschema.xml', 'schemas/gschemas.compiled']
target = ROOT / 'dist/codenotch@local.shell-extension.zip'
target.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(ROOT / name, name)
print(target)

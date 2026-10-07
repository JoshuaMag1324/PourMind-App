"""Build the mobile web package and a self-contained HTML test build."""
from pathlib import Path
import argparse
import re
import zipfile
import base64
import json
import mimetypes

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, default=root.parent / 'mobile-build')
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)

html = (root / 'index.html').read_text()
html = html.replace('<head>', '<head>\n<meta name="pourmind-standalone" content="true">')
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>' + (root / 'styles.css').read_text() + '</style>')
html = re.sub(r'\s*<link[^>]+(?:rel="manifest"|rel="apple-touch-icon"|rel="icon")[^>]*>', '', html)
for filename in ['data.js', 'methods.js', 'app.js', 'mobile.js']:
    script = (root / filename).read_text().replace('</script', '<\\/script')
    if filename == 'data.js':
        for photo in json.loads((root / 'photo-files.json').read_text()):
            mime = mimetypes.guess_type(photo)[0] or 'application/octet-stream'
            uri = 'data:' + mime + ';base64,' + base64.b64encode((root / photo).read_bytes()).decode()
            script = script.replace(json.dumps(photo), json.dumps(uri))
    html = html.replace(f'<script src="{filename}" defer></script>', '<script defer>\n' + script + '\n</script>')
# Inline scripts run after the document exists; defer only applies to external scripts.
scripts = re.findall(r'<script defer>[\s\S]*?</script>', html)
html = re.sub(r'\s*<script defer>[\s\S]*?</script>', '', html)
html = html.replace('</body>', '\n' + '\n'.join(scripts) + '\n</body>')
(args.output / 'PourMind-Mobile.html').write_text(html)

files = ['index.html', 'styles.css', 'data.js', 'methods.js', 'app.js', 'mobile.js', 'sw.js', 'manifest.webmanifest']
files += ['icons/' + name for name in ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']]
files += ['photo-files.json'] + json.loads((root / 'photo-files.json').read_text())
files += ['recipes/photo-map.json', 'recipes/bar-assistant-LICENSE.txt', 'recipes/opendrinks-LICENSE.txt', 'THIRD_PARTY_NOTICES.md']
with zipfile.ZipFile(args.output / 'PourMind-iPhone-Test.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for filename in files:
        archive.write(root / filename, 'PourMind-iPhone-Test/web/' + filename)
    archive.write(root / 'tools' / 'PHONE_TESTING.md', 'PourMind-iPhone-Test/START_HERE.md')
    archive.write(root / 'tools' / 'start_testing.py', 'PourMind-iPhone-Test/start_testing.py')
    archive.writestr('PourMind-iPhone-Test/Start-Windows.bat', '@echo off\r\ncd /d "%~dp0"\r\npy -3 start_testing.py\r\npause\r\n')
    archive.writestr('PourMind-iPhone-Test/Start-Mac.command', '#!/bin/sh\ncd "$(dirname "$0")"\npython3 start_testing.py\n')
print('Created:', args.output / 'PourMind-iPhone-Test.zip')
print('Created:', args.output / 'PourMind-Mobile.html')

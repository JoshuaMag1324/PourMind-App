"""Validate and compile the specialty-shot reference."""
import json
import re
import unicodedata
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'shots/catalogue.json').read_text())
ids, names = set(), set()
for shot in data['shots']:
    name = re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', shot['name']).encode('ascii', 'ignore').decode().lower())
    assert shot['id'] not in ids and name not in names, 'Duplicate shot'
    ids.add(shot['id']); names.add(name)
    assert shot['method'] in ['Shaken', 'Layered']
    assert shot['ingredients'] and len(shot['steps']) == 4
    assert all(isinstance(i['oz'], (int, float)) and i['oz'] >= .5 and i['oz'] * 2 == int(i['oz'] * 2) and i['name'].strip() for i in shot['ingredients'])
    assert shot['totalOz'] == sum(i['oz'] for i in shot['ingredients'])
    assert .5 <= shot['totalOz'] <= 2
    assert all(shot.get(key) for key in ['name', 'flavor', 'taste', 'garnish', 'note'])
(root / 'shots-data.js').write_text('/* Compiled from shots/catalogue.json. */\n\'use strict\';\nglobalThis.POURMIND_SHOTS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(f"Built {len(data['shots'])} unique specialty shots")

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
    assert shot['ingredients'] and 5 <= len(shot['steps']) <= 8
    assert shot['servings'] in [1, 2]
    assert all(shot.get(k) for k in ['technique', 'upgrade', 'techniqueTip', 'adaptation', 'sources'])
    assert all(source['url'].startswith('https://') and source['title'] for source in shot['sources'])
    def valid_ingredient(i):
        return i['name'].strip() and ((isinstance(i.get('oz'), (int, float)) and i['oz'] >= .5 and i['oz'] * 2 == int(i['oz'] * 2)) if 'oz' in i else (isinstance(i.get('count'), int) and i['count'] > 0 and i.get('unit') in ['dash', 'dashes']))
    assert all(valid_ingredient(i) for i in shot['ingredients'])
    if shot.get('prep'):
        assert shot['prep']['title'] and shot['prep']['yield'] and shot['prep']['steps']
        assert all(valid_ingredient(i) for i in shot['prep']['ingredients'])
    assert shot['totalOz'] == sum(i.get('oz', 0) for i in shot['ingredients'])
    assert .5 <= shot['totalOz'] <= 2 * shot['servings']
    assert all(shot.get(key) for key in ['name', 'flavor', 'taste', 'garnish', 'note'])
(root / 'shots-data.js').write_text('/* Compiled from shots/catalogue.json. */\n\'use strict\';\nglobalThis.POURMIND_SHOTS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(f"Built {len(data['shots'])} unique specialty shots")

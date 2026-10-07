"""Compile editable wine and teaching references. No network or third-party dependency."""
from pathlib import Path
import json
import unicodedata
import re

root = Path(__file__).resolve().parents[1]
knowledge = json.loads((root / 'reference/knowledge.json').read_text())
wines = []
overrides = {
    'Airén': {'acidity': 'Low to medium'},
    'Palomino': {'acidity': 'Low to medium'},
    'Pedro Ximénez': {'acidity': 'Low to medium'},
    'Grenache Blanc': {'acidity': 'Medium'},
    'Grenache Gris': {'acidity': 'Medium'},
    'Torrontés': {'sweetness': 'Usually dry', 'acidity': 'Medium'},
    'Muscat of Alexandria / Zibibbo': {'sweetness': 'Dry to sweet; check the style'},
    'Tannat': {'body': 'Full', 'tannin': 'High'},
    'Chardonnay': {'body': 'Light to full', 'acidity': 'Medium to high'},
    'Pinot Gris / Pinot Grigio': {'body': 'Light to full', 'sweetness': 'Dry to off-dry'},
    'Chenin Blanc': {'body': 'Light to full'},
    'Viognier': {'acidity': 'Low to medium'},
    'Marsanne': {'acidity': 'Low to medium'},
    'Roussanne': {'acidity': 'Medium'},
    'Sémillon': {'acidity': 'Low to medium', 'sweetness': 'Dry to sweet; check the style'},
    'Muscat / Moscato': {'sweetness': 'Dry to sweet; check the style'},
    'Moschofilero': {'body': 'Light', 'sweetness': 'Usually dry'},
    'Furmint': {'sweetness': 'Dry to sweet; check the style'},
    'Welschriesling': {'sweetness': 'Dry to sweet; check the style'},
    'Petit Manseng': {'body': 'Medium to full'},
    'Gutedel / Chasselas': {'body': 'Light', 'acidity': 'Low to medium'},
    'Arneis': {'acidity': 'Medium'},
    'Merlot': {'body': 'Medium to full', 'acidity': 'Medium', 'tannin': 'Medium'},
    'Grenache / Garnacha': {'tannin': 'Low to medium'},
    'Dolcetto': {'acidity': 'Low to medium', 'tannin': 'Medium to high'},
    'Barbera': {'body': 'Medium', 'acidity': 'High', 'tannin': 'Low'},
    'Grignolino': {'tannin': 'Medium to high'},
    'Nerello Mascalese': {'body': 'Light to medium'},
    'Brachetto': {'body': 'Light', 'acidity': 'Medium to high'},
    'Lambrusco varieties': {'sweetness': 'Dry to sweet; check the label'},
    'Dornfelder': {'sweetness': 'Dry to off-dry'},
    'Frontenac': {'sweetness': 'Dry to sweet; check the style'},
    'Mavrodaphne': {'body': 'Medium to full', 'sweetness': 'Often sweet; dry styles also exist'},
    'White Zinfandel': {'sweetness': 'Usually off-dry to medium-sweet', 'acidity': 'Medium'},
    'Moscato d’Asti': {'body': 'Light', 'serve': '6–8°C / 43–46°F'},
    'Amarone della Valpolicella': {'tannin': 'Medium to high'},
    'Madeira (Sercial)': {'sweetness': 'Drier style; some residual sugar', 'acidity': 'High'},
    'Madeira (Bual / Boal)': {'sweetness': 'Medium-sweet', 'acidity': 'High'},
}
def slug(name):
    folded = ''.join(c for c in unicodedata.normalize('NFKD', name.lower()) if not unicodedata.combining(c))
    return re.sub('[^a-z0-9]+', '-', folded).strip('-')
for filename, category in [('white-wines.txt','White'), ('red-wines.txt','Red'), ('wine-styles.txt',None)]:
    for line in (root / 'reference' / filename).read_text().splitlines():
        if not line.strip() or line.startswith('#'): continue
        cells = [x.strip() for x in line.split('|')]
        if category: name, profile, taste, regions, aliases = cells; cat = category
        else: name, cat, profile, taste, regions, aliases = cells
        p = knowledge['profiles'][profile]
        pairings = [{'food': food, 'why': knowledge['reasons'][profile][food]} for food in p['foods']]
        wine = dict(id=slug(name), name=name, category=cat, type='Grape variety' if category else 'Named style', taste=taste, regions=regions, aliases=[x.strip() for x in aliases.split(',') if x.strip()], pairings=pairings)
        wine.update({k:v for k,v in p.items() if k != 'foods'})
        wine.update(overrides.get(name, {}))
        wines.append(wine)
assert set(overrides) <= {w['name'] for w in wines}, 'An override has no matching wine'
assert len({w['id'] for w in wines}) == len(wines), 'Duplicate wine ID'
assert all(len(w['taste']) > 40 for w in wines)
food_ids = {f['id'] for f in knowledge['foods']}
assert all(p['food'] in food_ids for w in wines for p in w['pairings'])
# Identify exact members from the maintained recipe catalogue, not from name guesses.
recipes = []
for line in (root / 'recipes/catalogue.txt').read_text().splitlines():
    if line.strip() and not line.startswith('#'):
        cells = line.split('|'); recipes.append((cells[0], cells[2]))
for family in knowledge['families']:
    groups = family.pop('recipeFamilies')
    family['recipes'] = [name for name,group in recipes if group in groups]
members = [name for f in knowledge['families'] for name in f['recipes']]
assert len(members) == len(set(members)) == len(recipes), 'Each recipe must have one teaching family'
names = {name for name,_ in recipes}
knowledge['cocktailPairings'] = {food: [dict(name=name, why=why) for name,why in pairs] for food,pairs in knowledge['cocktailPairings'].items()}
assert all(pair['name'] in names for pairs in knowledge['cocktailPairings'].values() for pair in pairs)
assert all(name in names for spirit in knowledge['spirits'] for name in spirit['recipes'])
output = {k: knowledge[k] for k in ['foods','families','spirits','cocktailPairings']}
output['wines'] = wines
(root / 'discovery-data.js').write_text('// Generated by tools/build_reference.py. Edit reference/ source files.\nglobalThis.POURMIND_REFERENCE = ' + json.dumps(output, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(f'Compiled {len(wines)} wines, {len(knowledge["families"])} families covering {len(members)} recipes.')

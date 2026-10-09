const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const context={},root=path.resolve(__dirname,'..');
for(const file of ['data.js','methods.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const names=name=>Array.from(context.relatedRecipes(name));
assert.equal(names('Whiskey Sour')[0],'New York Sour');
assert.ok(!names('Whiskey Sour').includes('Southside'));
assert.equal(names('El Diablo')[0],'Mexican Mule');
assert.ok(names('Espresso Martini').includes('Black Russian'));
assert.ok(!names('Dry Martini').includes('Martinez'));
assert.ok(names('Negroni').includes('Boulevardier'));
assert.deepEqual(names('Unknown recipe'),[]);
for(const drink of context.POURMIND_DATA.drinks){const matches=context.relatedRecipeMatches(drink[0]);assert.ok(matches.length<=4);assert.equal(new Set(matches.map(m=>m.name)).size,matches.length);assert.ok(matches.every(m=>m.name!==drink[0]&&m.reason.length>10));}
console.log('PASS: specific related cocktails; variations, shared flavors, ranked bases, no filler or duplicates');

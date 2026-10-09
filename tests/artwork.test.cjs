const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),coverage=JSON.parse(fs.readFileSync(path.join(root,'recipes/iba-coverage.json'),'utf8')).cocktails;
const mapping=JSON.parse(fs.readFileSync(path.join(root,'recipes/photo-map.json'),'utf8')),offline=new Set(JSON.parse(fs.readFileSync(path.join(root,'photo-files.json'),'utf8')));
const hashes=new Set(),files=new Set();
for(const p of coverage){const image=mapping[p.recipeName];assert.equal(image.kind,'AI-generated illustration',p.ibaName);assert.equal(image.credit,'PourMind');assert.ok(image.file.startsWith('photos/original-iba-'));assert.ok(offline.has(image.file));assert.match(image.referenceBasis,/IBA serving specifications/);const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,image.file))).digest('hex');assert.equal(hash,image.imageSha256);hashes.add(hash);files.add(image.file);}
assert.equal(hashes.size,102);assert.equal(files.size,102);console.log('PASS: 102 unique original images, accurate credits, verified checksums and offline artwork coverage');

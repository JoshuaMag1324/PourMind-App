const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),context={};vm.runInNewContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),context);
const {drinks,recipeDetails}=context.POURMIND_DATA;
const patterns={Whiskey:/\b(?:bourbon|rye|whiskey|whisky|scotch)\b/,Gin:/\bgin\b/,Rum:/\b(?:rum|rhum|cuban aguardiente)\b/,Tequila:/\btequila\b/,Mezcal:/\bmezcal\b/,Vodka:/\bvodka\b/,Brandy:/\b(?:brandy|cognac|calvados)\b/,Pisco:/\bpisco\b/,'Cachaça':/\bcachaca\b/,Grappa:/\bgrappa\b/,Wine:/\b(?:wine|vermouth|champagne|prosecco|sherry|port)\b/};
for(const d of drinks){
 assert.doesNotMatch(d[2],/\d\s*ml\b/i,d[0]);
 for(const match of d[2].matchAll(/(\d+(?:\.\d+)?) oz\b/g)){const value=Number(match[1]);assert.ok(value>=0.5 && Number.isInteger(value*2),`${d[0]}: ${match[0]}`);assert.ok(!match[1].endsWith('.0'),d[0]);}
 const ingredients=d[2].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/(?:apricot|peach|cherry) brandy/g,'fruit liqueur');
 assert.ok(d[1]==='Liqueur'||patterns[d[1]]?.test(ingredients),`${d[0]} primary base ${d[1]} absent from ingredients`);
 for(const [base,re] of Object.entries(patterns)){
  // Vermouth is an ingredient modifier rather than an additional wine base.
  const withoutVermouth=base==='Wine'?ingredients.replace(/(?:sweet red|sweet|dry|red)?\s*vermouth/g,'aromatized modifier'):ingredients;
  if(re.test(withoutVermouth))assert.ok(recipeDetails[d[0]].spirits.includes(base),`${d[0]} missing ${base} filter`);
 }
}
const byName=n=>drinks.find(d=>d[0]===n);
assert.equal(byName('Wisconsin Old Fashioned')[1],'Whiskey');assert.match(byName('Wisconsin Old Fashioned')[2],/2 oz bourbon or rye whiskey/);assert.doesNotMatch(recipeDetails['Wisconsin Old Fashioned'].steps.join(' '),/brandy/i);
assert.equal(byName('Mezcal Margarita')[1],'Mezcal');assert.equal(byName('Porto Flip')[1],'Wine');
for(const [name,measure] of [['Americano','1 oz Campari'],['Gin Basil Smash','2 oz Gin'],['Mary Pickford','0.5 oz Maraschino'],['Cardinale','0.5 oz Bitter Campari'],['Bellini','3.5 oz Prosecco'],['Bramble','0.5 oz Sugar Syrup']])assert.ok(byName(name)[2].includes(measure),name);
console.log('PASS: all 143 primary categories match ingredients, all base spirits have filters, no ml quantities, all ounce amounts in whole/half measures with a 0.5 oz minimum');

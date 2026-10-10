const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data={};
for(const name of ['data.js','discovery-data.js']) vm.runInNewContext(fs.readFileSync(path.join(root,name),'utf8'),data);
const ref=data.POURMIND_REFERENCE,catalogue=data.POURMIND_DATA;
assert.equal(ref.wines.length,244);
assert.equal(ref.families.length,15);
assert.equal(new Set(ref.wines.map(w=>w.id)).size,ref.wines.length);
const members=ref.families.flatMap(f=>f.recipes);
assert.equal(members.length,143);assert.equal(new Set(members).size,143);
assert.deepEqual([...members].sort(),[...catalogue.drinks.map(d=>d[0])].sort());
for(const wine of ref.wines){for(const field of ['taste','body','acidity','sweetness','tannin','serve','regions']) assert.ok(wine[field]?.length>2,`${wine.name}: ${field}`);assert.ok(wine.pairings.length>0);for(const p of wine.pairings)assert.ok(ref.foods.some(f=>f.id===p.food)&&p.why.length>25);}
for(const pairs of Object.values(ref.cocktailPairings))for(const p of pairs)assert.ok(catalogue.recipeDetails[p.name]&&p.why.length>25);
for(const spirit of ref.spirits)for(const [style,taste]of spirit.styles)assert.ok(style&&taste.length>25);
const wine=id=>ref.wines.find(w=>w.id===id);
assert.equal(wine('white-zinfandel').category,'Rosé');
assert.equal(wine('riesling').category,'White');assert.match(wine('riesling').sweetness,/dry to sweet/i);
assert.equal(wine('pinot-noir').category,'Red');assert.match(wine('fino-sherry').sweetness,/dry/i);
assert.match(wine('moscato-d-asti').sweetness,/sweet/i);
const base=process.env.POURMIND_TEST_URL||'http://127.0.0.1:8000/';
(async()=>{
 const options={executablePath:'/usr/bin/chromium',args:['--no-sandbox']};
 if(base.startsWith('https:')&&process.env.HTTPS_PROXY){const u=new URL(process.env.HTTPS_PROXY);options.proxy={server:`${u.protocol}//${u.hostname}${u.port?':'+u.port:''}`};if(u.username)options.proxy.username=decodeURIComponent(u.username);if(u.password)options.proxy.password=decodeURIComponent(u.password);}
 const browser=await chromium.launch(options);
 try {
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const p=await ctx.newPage(),errors=[];p.on('pageerror',err=>errors.push(err.message));
  await ctx.addInitScript(()=>{if(!localStorage.getItem('pourmind:inventory'))localStorage.setItem('pourmind:inventory',JSON.stringify(['Gin','Fresh limes']));if(!localStorage.getItem('pourmind:saved'))localStorage.setItem('pourmind:saved',JSON.stringify(['Daiquiri']));if(!localStorage.getItem('pourmind:academy-progress-v1'))localStorage.setItem('pourmind:academy-progress-v1',JSON.stringify({lessons:['measure'],guides:[],positions:{},journal:[]}));});
  await p.goto(base);await p.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:60000});
  const go=async id=>{await p.locator(`.mobile-nav [data-view="${id}"]`).tap();};
  const close=async()=>{await p.getByRole('button',{name:'Close dialog',exact:true}).tap();};
  const cat=async id=>{if(id==='Spirits'){await p.locator('#main [data-view="spirits"]').tap();return;}if(!await p.locator(`[data-discovery="category"][data-id="${id}"]`).count())await p.locator('#main [data-view="wines"]').tap();await p.locator(`[data-discovery="category"][data-id="${id}"]`).tap();};
  await go('recipes');await p.locator('#main [data-view="wines"]').tap();
  assert.equal(await p.locator('.reference-card').count(),12);
  await p.locator('[data-discovery="more-reference"]').tap();assert.equal(await p.locator('.reference-card').count(),24);
  await p.getByLabel('Search wines and spirits',{exact:true}).fill('resling');assert.equal(await p.locator('.reference-card').count(),1);
  await p.getByRole('button',{name:'Explore Riesling',exact:true}).tap();
  assert.match(await p.locator('#dialog-content').innerText(),/Lime, green apple, white peach/);
  await p.getByRole('button',{name:'Add Riesling to My bar',exact:true}).tap();await p.getByRole('button',{name:'Add Riesling to My bar',exact:true}).tap();
  assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('pourmind:inventory'))),['Gin','Fresh limes','Riesling']);
  await close();await p.getByLabel('Search wines and spirits',{exact:true}).fill('');
  for(const category of ['White','Red','Rosé','Sparkling','Fortified']){await cat(category);const names=await p.locator('.reference-card h3').allTextContents();assert.ok(names.every(name=>ref.wines.find(w=>w.name===name).category===category));assert.ok(names.length>0);}
  await cat('White');await p.getByLabel('Search wines and spirits',{exact:true}).fill('chardonay');assert.equal(await p.locator('.reference-card').count(),1);await p.getByRole('button',{name:'Explore Chardonnay',exact:true}).tap();assert.match(await p.locator('#dialog-content').innerText(),/malolactic fermentation/);await close();
  await cat('Spirits');await p.getByLabel('Search wines and spirits',{exact:true}).fill('');assert.equal(await p.locator('.reference-card').count(),6);await p.getByRole('button',{name:'Explore Whiskey',exact:true}).tap();assert.match(await p.locator('#dialog-content').innerText(),/Bourbon/);await p.locator('#dialog-content [data-discovery="recipe"][data-id="Old Fashioned"]').tap();assert.equal(await p.locator('#dialog-title').innerText(),'Old Fashioned');await close();
  await go('learn');await p.locator('#main [data-view="families"]').tap();assert.equal(await p.locator('.family-card').count(),15);
  await p.getByLabel('Find a family or cocktail',{exact:true}).fill('Margarita');assert.equal(await p.locator('.family-card').count(),1);await p.locator('[data-discovery="family"]').tap();assert.match(await p.locator('#dialog-content').innerText(),/orange liqueur/i);await p.locator('#dialog-content [data-discovery="recipe"][data-id="Margarita"]').tap();assert.equal(await p.locator('#dialog-title').innerText(),'Margarita');assert.match(await p.locator('#dialog-content').innerText(),/fresh lime juice/);await close();
  await p.getByLabel('Find a family or cocktail',{exact:true}).fill('');
  // Open every teaching family; its examples resolve to the actual recipe catalogue.
  for(const f of ref.families){await p.locator(`[data-discovery="family"][data-id="${f.id}"]`).tap();assert.equal(await p.locator('.family-recipe').count(),f.recipes.length);await close();}
  await go('learn');await p.locator('#main [data-view="pairings"]').tap();assert.ok(await p.locator('[data-discovery="wine"]').count()>0);
  // Every food group has meaningful wine and cocktail suggestions and working recipe links.
  for(const f of ref.foods){await p.getByLabel('What are you serving?',{exact:true}).selectOption(f.id);assert.ok(await p.locator('[data-discovery="wine"]').count()>0);await p.locator('[data-discovery="pairing-kind"][data-id="cocktail"]').tap();assert.equal(await p.locator('.pairing-cocktail').count(),3);const name=ref.cocktailPairings[f.id][0].name;await p.locator('.pairing-cocktail [data-discovery="recipe"]').first().tap();assert.equal(await p.locator('#dialog-title').innerText(),name);await close();await p.locator('[data-discovery="pairing-kind"][data-id="wine"]').tap();}
  // Mobile/tablet/desktop main views and dialogs never overflow horizontally.
  for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:900});for(const section of ['reference','families','pairings']){await p.evaluate(()=>document.querySelector('.mobile-nav [data-view="recipes"]').click());if(section==='families'||section==='pairings')await p.evaluate(()=>document.querySelector('.mobile-nav [data-view="learn"]').click());const target=section==='reference'?'wines':section;await p.locator(`#main [data-view="${target}"]`).click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${section} width ${width}`);assert.equal(await p.locator(`.mobile-nav [data-view="${section==='reference'?'recipes':'learn'}"]`).getAttribute('aria-current'),'page');const btn=p.locator(section==='families'?'[data-discovery="family"]':'[data-discovery="wine"]').first();await btn.click();assert.ok(await p.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await close();}}
  const caches=await p.evaluate(async()=>{const name=(await window.caches.keys()).find(n=>n.startsWith('pourmind-mobile-'));const c=await window.caches.open(name);return(await c.keys()).map(r=>new URL(r.url).pathname);});assert.ok(caches.some(x=>x.endsWith('/discovery-data.js'))&&caches.some(x=>x.endsWith('/discovery.js')));
  await ctx.setOffline(true);await p.reload();await p.waitForSelector('.hero');await p.evaluate(()=>document.querySelector('.mobile-nav [data-view="bar"]').click());assert.ok(await p.locator('#inventory-list').innerText().then(x=>x.includes('Riesling')));await p.evaluate(()=>document.querySelector('.mobile-nav [data-view="recipes"]').click());await p.locator('#main [data-view="wines"]').click();await cat('All wines');await p.getByLabel('Search wines and spirits',{exact:true}).fill('Riesling');await p.getByRole('button',{name:'Explore Riesling',exact:true}).click();assert.match(await p.locator('#dialog-content').innerText(),/Food pairing ideas/);await close();assert.equal(await p.locator('#saved-count').innerText(),'1');
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('pourmind:academy-progress-v1')).lessons[0]),'measure');
  assert.deepEqual(errors,[]);console.log(`PASS: ${ref.wines.length} wine profiles, ${ref.families.length} families, ${ref.foods.length} food groups; mobile, persistence, duplicate prevention and offline reference.`);
 } finally {await browser.close();}
})().catch(err=>{console.error(err);process.exit(1)});

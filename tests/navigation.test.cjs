const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.POURMIND_TEST_URL||'http://127.0.0.1:8000/');
  const nav=width<768?'.mobile-nav':'.desktop-nav';const go=async view=>p.locator(`${nav} [data-view="${view}"]`).click();
  await go('recipes');await p.locator('.recipe-open[data-name="Daiquiri"]').click();await p.locator('#dialog-content [data-action="favorite"]').click();await p.getByRole('button',{name:'Close dialog',exact:true}).click();
  await p.getByRole('searchbox',{name:'Search recipes'}).fill('Negroni');await p.getByRole('button',{name:'Saved recipes',exact:true}).click();assert.equal(await p.locator('.recipe-card').count(),1);assert.equal(await p.locator('.recipe-card h3').innerText(),'Daiquiri');
  await go('recipes');assert.equal(await p.getByRole('searchbox',{name:'Search recipes'}).inputValue(),'Negroni');
  await go('learn');assert.match(p.url(),/#learn$/);await p.reload();assert.equal(await p.locator('.stage-card').count(),5);
  await p.locator('#main [data-view="families"]').click();assert.match(p.url(),/#families$/);await p.getByRole('button',{name:'Explore Daiquiri variations',exact:true}).click();
  await p.goBack();assert.equal(await p.locator('#dialog').evaluate(d=>d.open),false);assert.equal(await p.locator('.stage-card').count(),5);await p.goForward();assert.equal(await p.locator('.family-card').count(),15);
  await go('recipes');await p.getByRole('searchbox',{name:'Search recipes'}).fill('');
  const names=await p.locator('.recipe-open').evaluateAll(buttons=>buttons.map(b=>b.dataset.name));
  for(const name of names){await p.locator('.recipe-open').filter({hasText:name}).first().evaluate((button,n)=>{document.querySelectorAll('.recipe-open').forEach(b=>{if(b.dataset.name===n)b.click()})},name);assert.ok(await p.locator('.cocktail-food-pairings li').count()>0,name);await p.getByRole('button',{name:'Close dialog',exact:true}).click();}
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: saved filters isolated, library search retained, route refresh/back/forward, modal cleanup, food pairings in all 143 cocktail details, desktop and phone.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

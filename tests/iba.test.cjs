const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),context={};vm.runInNewContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),context);
const coverage=JSON.parse(fs.readFileSync(path.join(root,'recipes/iba-coverage.json'),'utf8'));
const data=context.POURMIND_DATA;
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.POURMIND_TEST_URL||'http://127.0.0.1:8000/');await page.locator('.desktop-nav [data-view="recipes"]').click();
 assert.equal(await page.locator('.recipe-card').count(),143);
 await page.waitForFunction(()=>{const images=[...document.querySelectorAll('.recipe-image img')];images.forEach(i=>i.loading='eager');return images.every(i=>i.complete&&i.naturalWidth>0);});
 for(const entry of coverage.cocktails){await page.getByRole('searchbox',{name:'Search recipes'}).fill(entry.ibaName);assert.equal(await page.locator(`.recipe-open[data-name="${entry.recipeName}"]`).count(),1,entry.ibaName);}
 await page.getByRole('searchbox',{name:'Search recipes'}).fill('');
 for(const base of ['Pisco','Wine','Cachaça','Mezcal','Grappa','Liqueur']){await page.locator(`[data-category="${base}"]`).click();const names=await page.locator('.recipe-info h3').allTextContents();assert.ok(names.length>0,base);assert.ok(names.every(n=>data.recipeDetails[n].spirits.includes(base)));}
 await page.locator('[data-category="All"]').click();
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});
  for(const name of ['IBA Tiki','Zombie','Ramos Fizz','Pisco Sour','Long Island Iced Tea','Ve.N.To']){await page.getByRole('searchbox',{name:'Search recipes'}).fill(name);await page.locator(`.recipe-open[data-name="${name}"]`).click();assert.equal(await page.locator('#dialog-title').innerText(),name);await page.locator('.dialog-photo').evaluate(i=>i.decode());assert.ok(await page.locator('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.keyboard.press('Escape');}
 }
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:60000});await page.context().setOffline(true);await page.reload();await page.locator('.mobile-nav [data-view="recipes"]').click();await page.getByRole('searchbox',{name:'Search recipes'}).fill('Zombie');await page.locator('.recipe-open[data-name="Zombie"]').click();await page.locator('.dialog-photo').evaluate(i=>i.decode());assert.equal(await page.locator('#dialog-title').innerText(),'Zombie');assert.deepEqual(errors,[]);
 console.log('PASS: all 102 IBA names find one canonical recipe; 143 images; new filters; desktop/mobile details; offline new recipes');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

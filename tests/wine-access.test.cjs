// Reproduce an installed education build holding old cached scripts, then recover it.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),oldCommit='9bb1f850a89e6c93f714a112d154302ae4d4367e';
const oldFiles=new Map(['index.html','app.js','academy.js','styles.css','mobile.js','sw.js'].map(file=>[file,execFileSync('git',['show',`${oldCommit}:${file}`],{cwd:root,maxBuffer:5*1024*1024})]));
let current=false,currentWorker=false,releaseAvailable=true;
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const file=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
 if(file.includes('..')){res.writeHead(400);return res.end();}
 if(file==='release.json'&&!releaseAvailable){res.writeHead(503);return res.end('Try online again');}
 const old=(!current||file==='sw.js'&&!currentWorker)&&oldFiles.get(file);
 const filename=path.join(root,file);if(!old&&!fs.existsSync(filename)){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(old||fs.readFileSync(filename));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await p.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:60000});
 await p.evaluate(()=>{localStorage.setItem('pourmind:saved',JSON.stringify(['Daiquiri']));localStorage.setItem('pourmind:inventory',JSON.stringify(['Gin','Riesling']));localStorage.setItem('pourmind:learned-questions',JSON.stringify(['stir-old-fashioned']));localStorage.setItem('pourmind:academy-progress-v1',JSON.stringify({lessons:['measure'],guides:[],positions:{},journal:[]}));localStorage.setItem('pourmind:recipe-collection-v1',JSON.stringify([{id:'kept-draft',title:'Private draft to retain'}]));});
 const saved=await p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
 current=true;await p.reload();assert.equal(await p.locator('.hero [data-view="wines"]').count(),0,'Old cached script hides the wine link after ordinary reload');
 releaseAvailable=false;await p.goto(base+'wines.html');await p.getByRole('button',{name:'Try again',exact:true}).waitFor();assert.ok((await p.evaluate(()=>caches.keys())).includes('pourmind-mobile-v4'),'Failed online check preserves offline files');
 assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))),saved);
 releaseAvailable=true;currentWorker=true;await p.getByRole('button',{name:'Try again',exact:true}).click();await p.waitForURL(/#wines$/);await p.waitForSelector('#reference-results');
 assert.match(await p.locator('.reference-count').innerText(),/244 wines/);assert.equal(await p.locator('.reference-card').count(),12);
 await p.getByLabel('Search wines and spirits',{exact:true}).fill('resling');await p.getByRole('button',{name:'Explore Riesling',exact:true}).click();assert.match(await p.locator('#dialog-content').innerText(),/white peach/);await p.getByRole('button',{name:'Close dialog',exact:true}).click();
 assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))),saved,'Recovery keeps favorites, inventory, quiz, academy and private drafts unchanged');
 await p.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:60000});await p.waitForFunction(async()=>!(await caches.keys()).includes('pourmind-mobile-v4'));
 await p.locator('.mobile-nav [data-view="home"]').click();await p.getByRole('button',{name:'Wine library',exact:true}).click();await p.locator('[data-discovery="category"][data-id="Red"]').click();assert.match(await p.locator('.reference-card').first().innerText(),/Cabernet Sauvignon/);
 await p.locator('.mobile-nav [data-view="bar"]').click();assert.equal(await p.locator('#main [data-view="wines"]').count(),0);await p.locator('.mobile-nav [data-view="recipes"]').click();await p.locator('#main [data-view="wines"]').click();assert.match(await p.locator('.reference-card').first().innerText(),/Chardonnay/);assert.equal(await p.locator('[data-discovery="category"][data-id="All wines"]').getAttribute('aria-pressed'),'true');
 assert.deepEqual(errors,[]);console.log('PASS: reproduced old cached wine-less app; direct wine link refreshes old files and preserves all saved data; failed online recovery retains offline files; home/Library wine entry points work; My Bar stays personal.');
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);server.close();process.exit(1)});

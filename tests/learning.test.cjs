const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const sandbox={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../learning.js'),'utf8'),sandbox);
const {topics,questions}=sandbox.POURMIND_LEARNING;
assert.equal(questions.length,30);
assert.equal(new Set(questions.map(q=>q.id)).size,30);
for(const topic of topics)assert.equal(questions.filter(q=>q.topic===topic.id).length,6);
for(const q of questions){assert.equal(q.options.length,3);assert.ok(q.correct>=0&&q.correct<3);assert.ok(q.explanation.length>30);assert.ok(topics.some(t=>t.id===q.topic));}
const base=process.env.POURMIND_TEST_URL||'http://127.0.0.1:8005/';
(async()=>{
 const options={executablePath:'/usr/bin/chromium',args:['--no-sandbox']};
 if(base.startsWith('https:')&&process.env.HTTPS_PROXY){const u=new URL(process.env.HTTPS_PROXY);options.proxy={server:`${u.protocol}//${u.hostname}${u.port?':'+u.port:''}`};if(u.username)options.proxy.username=decodeURIComponent(u.username);if(u.password)options.proxy.password=decodeURIComponent(u.password);}
 const browser=await chromium.launch(options);
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:60000});
  await page.getByText('Ready for offline use',{exact:true}).waitFor();
  await page.locator('.mobile-nav [data-view="learn"]').tap();
  assert.equal(await page.locator('.learning-topic').count(),5);
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'0');
  const current=async()=>{const title=await page.locator('#dialog-title').innerText();const q=questions.find(q=>q.question===title);assert.ok(q,title);return q;};
  const answer=async()=>{const q=await current();await page.locator(`dialog [data-answer="${q.correct}"]`).tap();assert.match(await page.locator('#quiz-feedback').innerText(),/That’s right/);assert.equal(await page.locator('#quiz-next').isDisabled(),false);return q;};
  await page.getByRole('button',{name:'Start Mixing techniques',exact:true}).tap();
  const first=await current();const wrong=(first.correct+1)%3;
  await page.locator(`dialog [data-answer="${wrong}"]`).tap();
  assert.ok((await page.locator('#quiz-feedback').innerText()).includes(first.explanation));
  assert.equal(await page.locator('#quiz-next').isDisabled(),true);
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'0');
  await answer();await page.locator(`dialog [data-answer="${first.correct}"]`).tap();
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'1');
  await page.getByRole('button',{name:'Close dialog',exact:true}).tap();await page.reload();await page.locator('.mobile-nav [data-view="learn"]').tap();
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'1');
  console.log('PASS: 30 questions, five topics, explanations on mistakes, retry gating and immediate saved progress');
  await context.setOffline(true);
  await page.reload();await page.locator('.mobile-nav [data-view="learn"]').tap();
  for(const topic of topics){
   await page.getByRole('button',{name:'Start '+topic.title,exact:true}).tap();const ids=new Set();
   for(let i=0;i<6;i++){const q=await answer();assert.equal(q.topic,topic.id);assert.ok(!ids.has(q.id));ids.add(q.id);await page.locator('#quiz-next').tap();}
   await page.getByRole('heading',{name:'Practice complete.',exact:true}).waitFor();
   await page.getByRole('button',{name:'Choose another topic',exact:true}).tap();
  }
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'30');
  await page.getByRole('button',{name:'Try mixed practice',exact:true}).tap();const mixed=new Set();
  for(let i=0;i<10;i++){const q=await answer();assert.ok(!mixed.has(q.id));mixed.add(q.id);await page.locator('#quiz-next').tap();}
  await page.getByRole('heading',{name:'Practice complete.',exact:true}).waitFor();
  await page.getByRole('button',{name:'Choose another topic',exact:true}).tap();await page.reload();await page.locator('.mobile-nav [data-view="learn"]').tap();
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'30');
  assert.equal(await page.getByRole('button',{name:/^Practice (Mixing techniques|Know your ingredients|Cocktail families|Glassware & finishing|Balance & good habits)$/}).count(),5);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);}
  await page.setViewportSize({width:390,height:844});if(!base.startsWith('https:'))await page.screenshot({path:'/workspace/scratch/learning-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);await context.setOffline(false);
  console.log('PASS: all topic rounds and mixed practice work offline; repeat practice cannot inflate progress; progress survives reload; responsive layouts');
  const legacy=await browser.newContext({viewport:{width:390,height:844}});
  await legacy.addInitScript(()=>{localStorage.setItem('pourmind:training','true');localStorage.setItem('pourmind:saved','["Negroni"]');});
  const old=await legacy.newPage();await old.goto(base);await old.locator('.mobile-nav [data-view="learn"]').click();assert.equal(await old.getByRole('progressbar').getAttribute('aria-valuenow'),'3');assert.equal(await old.locator('#saved-count').innerText(),'1');
  await old.getByRole('button',{name:'Try mixed practice',exact:true}).click();const oldTitle=await old.locator('#dialog-title').innerText();assert.ok(!['stir-old-fashioned','shake-daiquiri','express-orange'].includes(questions.find(q=>q.question===oldTitle).id));
  console.log('PASS: original three-question completion migrates accurately, favorites retained, mixed practice prioritizes new questions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const root=path.resolve(__dirname,'..');const data={};
for(const file of ['data.js','academy-data.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),data);
const academy=data.POURMIND_ACADEMY;
assert.equal(academy.lessons.length,8);assert.equal(Object.keys(academy.guides).length,12);assert.equal(academy.exercises.length,4);assert.equal(academy.stages.length,5);
assert.equal(new Set(academy.lessons.map(x=>x.id)).size,8);
for(const [name,reasons]of Object.entries(academy.guides)){assert.equal(reasons.length,data.POURMIND_DATA.recipeDetails[name].steps.length);assert.ok(reasons.every(x=>x.length>35));}
const base=process.env.POURMIND_TEST_URL||'http://127.0.0.1:8000/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:60000});
  const learn=async()=>{await page.locator('.mobile-nav [data-view="learn"]').tap();};
  const tab=async id=>{await page.locator(`[data-academy="tab"][data-id="${id}"]`).first().tap();};
  const close=async()=>{await page.getByRole('button',{name:'Close dialog',exact:true}).tap();};
  const progress=async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pourmind:academy-progress-v1')));
  await learn();assert.equal(await page.locator('.stage-card').count(),5);await tab('lessons');
  for(const lesson of academy.lessons){
   await page.locator('.academy-card').filter({has:page.getByRole('heading',{name:lesson.title,exact:true})}).getByRole('button',{name:'Start lesson',exact:true}).tap();
   for(let i=0;i<3;i++){await page.getByRole('heading',{name:lesson.sections[i].title,exact:true}).waitFor();await page.getByRole('button',{name:'Continue',exact:true}).tap();}
   assert.equal(await page.getByRole('button',{name:'Complete lesson',exact:true}).isDisabled(),true);
   await page.locator(`[data-academy="lesson-answer"][data-id="${(lesson.check.correct+1)%3}"]`).tap();
   assert.equal(await page.getByRole('button',{name:'Complete lesson',exact:true}).isDisabled(),true);
   assert.ok((await page.locator('#lesson-feedback').innerText()).includes(lesson.check.explanation));
   await page.locator(`[data-academy="lesson-answer"][data-id="${lesson.check.correct}"]`).tap();await page.getByRole('button',{name:'Complete lesson',exact:true}).tap();await close();
  }
  assert.equal((await progress()).lessons.length,8);
  await page.reload();await learn();await tab('guides');
  await page.locator('.guide-card').filter({has:page.getByRole('heading',{name:'Daiquiri',exact:true})}).getByRole('button',{name:'Start walkthrough',exact:true}).tap();
  await page.getByRole('button',{name:'Next step',exact:true}).tap();await close();await page.reload();await learn();await tab('guides');
  await page.locator('.guide-card').filter({has:page.getByRole('heading',{name:'Daiquiri',exact:true})}).getByRole('button',{name:'Start walkthrough',exact:true}).tap();
  assert.match(await page.locator('dialog .eyebrow').innerText(),/Step 2 of 4/i);await page.getByRole('button',{name:'Previous',exact:true}).tap();await close();
  for(const name of Object.keys(academy.guides)){
   await page.locator('.guide-card').filter({has:page.getByRole('heading',{name,exact:true})}).getByRole('button',{name:'Start walkthrough',exact:true}).tap();
   const steps=data.POURMIND_DATA.recipeDetails[name].steps;
   for(let i=0;i<steps.length;i++){assert.equal(await page.locator('.guide-instruction').innerText(),steps[i]);assert.equal(await page.locator('.why-box p').innerText(),academy.guides[name][i]);await page.locator('[data-academy="guide-next"]').tap();}
   await page.getByLabel('What did you learn?',{exact:true}).fill(`I learned how the technique and ingredients work together in ${name}.`);
   await page.getByRole('button',{name:'Save walkthrough',exact:true}).tap();await close();await tab('guides');
  }
  assert.equal((await progress()).guides.length,12);assert.equal((await progress()).journal.length,12);
  await tab('practice');
  for(const exercise of academy.exercises){
   await page.locator('.academy-card').filter({has:page.getByRole('heading',{name:exercise.title,exact:true})}).getByRole('button',{name:'Try exercise',exact:true}).tap();
   await page.getByLabel(exercise.prompts[0],{exact:true}).fill('I compared measured servings and kept every other variable consistent.');
   await page.getByLabel(exercise.prompts[1],{exact:true}).fill('A small measured change made the result different; I recorded the amount.');
   await page.getByLabel('What would you try next? (optional)',{exact:true}).fill('Repeat with the same ice and a smaller adjustment.');
   await page.getByRole('button',{name:'Save experiment',exact:true}).tap();await close();
  }
  assert.equal((await progress()).journal.length,16);
  await tab('path');assert.equal(await page.locator('.stage-card .demo-label').filter({hasText:'Stage completed'}).count(),5);
  console.log('PASS: eight complete lessons with checks, twelve annotated guides and resume, four exercises, journal and staged progress');
  await page.locator('.mobile-nav [data-view="community"]').tap();await page.getByRole('button',{name:'Create recipe',exact:true}).tap();
  const title='Lime <img src=x onerror=window.PWNED=1>';
  await page.getByLabel('Recipe name',{exact:true}).fill(title);await page.getByLabel('Creator name',{exact:true}).fill('Test creator');await page.getByLabel('Cocktail family',{exact:true}).fill('Sour rehearsal');
  await page.getByLabel('Measured ingredients — one per line',{exact:true}).fill('water\n0.75 oz lime juice');
  await page.getByLabel('Method — one step per line',{exact:true}).fill('Shake the measured ingredients with ice.\nFine-strain into a chilled coupe.');
  await page.getByLabel('Glass',{exact:true}).fill('Coupe');await page.getByLabel('Garnish',{exact:true}).fill('Lime wheel');
  await page.getByLabel('Why do these ingredients and techniques work together?',{exact:true}).fill('Lime supplies acidity while syrup supplies sweetness, and shaking combines and chills the measured ingredients.');
  await page.getByRole('button',{name:'Save private draft',exact:true}).tap();assert.match(await page.locator('#draft-error').innerText(),/measured quantity/);
  await page.getByLabel('Measured ingredients — one per line',{exact:true}).fill('2 oz water\n0.75 oz lime juice\n0.5 oz simple syrup');
  await page.getByLabel('Your cocktail photo (optional)',{exact:true}).setInputFiles(path.join(root,'icons/icon-192.png'));await page.locator('#draft-photo-preview').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Save private draft',exact:true}).tap();assert.match(await page.locator('#draft-error').innerText(),/permission/);
  await page.getByLabel('I own this photo or have permission to share it.',{exact:true}).check();await page.getByRole('button',{name:'Save private draft',exact:true}).tap();
  await page.locator('dialog').getByRole('heading',{name:title,exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.PWNED),undefined);
  const exported=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download recipe file',exact:true}).tap()]);const recipePath=await exported[0].path();const original=JSON.parse(fs.readFileSync(recipePath,'utf8'));assert.equal(original.recipe.feedback.length,0);assert.match(original.recipe.photo,/^data:image\/jpeg/);
  await close();await page.reload();await page.locator('.mobile-nav [data-view="community"]').tap();assert.equal(await page.locator('.community-card').count(),1);
  const peerContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,acceptDownloads:true}),peer=await peerContext.newPage();peer.on('pageerror',e=>errors.push(e.message));await peer.goto(base);await peer.locator('.mobile-nav [data-view="community"]').tap();await peer.locator('#recipe-import').setInputFiles(recipePath);
  await peer.locator('dialog').getByRole('heading',{name:title,exact:true}).waitFor();assert.equal(await peer.evaluate(()=>window.PWNED),undefined);
  await peer.getByLabel('Your name',{exact:true}).fill('A friend');await peer.getByLabel('What worked, what changed, or what would you try next?',{exact:true}).fill('Reducing syrup by a measured quarter-teaspoon kept the lime brighter.');await peer.getByRole('button',{name:'Save feedback',exact:true}).tap();
  const returned=await Promise.all([peer.waitForEvent('download'),peer.getByRole('button',{name:'Download recipe file',exact:true}).tap()]);const returnPath=await returned[0].path();
  await page.locator('#recipe-import').setInputFiles(returnPath);await page.locator('.feedback-list article').waitFor();assert.equal(await page.locator('.feedback-list article').count(),1);await close();await page.locator('#recipe-import').setInputFiles(returnPath);await page.locator('dialog').getByRole('heading',{name:title,exact:true}).waitFor();assert.equal(await page.locator('.feedback-list article').count(),1);await close();
  const invalid={format:'pourmind-recipe',version:1,recipe:{...original.recipe,photo:'data:image/svg+xml;base64,PHN2Zz4='}};
  await page.locator('#recipe-import').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});await page.getByText('The recipe photo must be a supported image under 375 KB.',{exact:true}).waitFor();assert.equal(await page.locator('.community-card').count(),1);
  await page.locator('#recipe-import').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{bad-json')});await page.getByText('This file is not valid recipe JSON.',{exact:true}).waitFor();
  console.log('PASS: measured draft validation, photo upload and permission, safe rendering, export/import, returned feedback merge and duplicate protection');
  await context.setOffline(true);await page.reload();await learn();await tab('lessons');assert.equal(await page.getByRole('button',{name:'Revisit lesson',exact:true}).count(),8);await tab('practice');assert.equal(await page.locator('.journal-entry').count(),16);await page.locator('.mobile-nav [data-view="community"]').tap();await page.getByRole('button',{name:'Open recipe',exact:true}).tap();assert.equal(await page.locator('.feedback-list article').count(),1);await close();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});for(const v of ['learn','community']){await page.locator(`.mobile-nav [data-view="${v}"]`).evaluate(el=>el.click());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${v} overflow at ${width}`);}}
  assert.deepEqual(errors,[]);console.log('PASS: offline lessons, journal, photo and recipe collection retain progress; phone/tablet/desktop layouts; no JavaScript errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});

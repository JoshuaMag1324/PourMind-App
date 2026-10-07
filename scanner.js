/* Private, on-device bottle-label reading. No photograph is sent to a server. */
'use strict';
globalThis.POURMIND_SCANNER = (() => {
  let a, generation=0, currentWorker=null, active=false, previewURL='', candidates=[];
  const e=value=>a.escapeHTML(value);
  const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const names=[
    ['Bourbon',['bourbon']],['Rye whiskey',['rye whiskey','rye whisky']],['Scotch whisky',['scotch whisky','scotch whiskey','single malt']],['Whiskey',['whiskey','whisky','jack daniels','jameson']],
    ['Gin',['gin']],['Rum',['rum','rhum']],['Tequila',['tequila']],['Mezcal',['mezcal']],['Vodka',['vodka']],['Brandy',['brandy']],['Cognac',['cognac']],['Pisco',['pisco']],['Calvados',['calvados']],
    ['Dry vermouth',['dry vermouth','vermouth dry']],['Sweet vermouth',['sweet vermouth','vermouth rosso','rosso vermouth']],['Vermouth',['vermouth']],
    ['Campari',['campari']],['Aperol',['aperol']],['Cointreau',['cointreau']],['Triple sec',['triple sec']],['Orange liqueur',['orange liqueur','curacao']],['Maraschino liqueur',['maraschino']],['Green Chartreuse',['green chartreuse']],['Yellow Chartreuse',['yellow chartreuse']],['Chartreuse',['chartreuse']],['Amaro',['amaro','averna','amaro nonino']],['Absinthe',['absinthe']],['Bitters',['bitters','angostura','peychaud']],
    ['Tonic water',['tonic water']],['Ginger beer',['ginger beer']],['Ginger ale',['ginger ale']],['Soda water',['soda water','club soda']],['Simple syrup',['simple syrup']],['Agave syrup',['agave syrup','agave nectar']],['Lime juice',['lime juice']],['Lemon juice',['lemon juice']],['Orange juice',['orange juice']],['Pineapple juice',['pineapple juice']],['Cranberry juice',['cranberry juice']],['Cream of coconut',['cream of coconut']]
  ];
  function suggest(text) {
    const source=' '+normalize(text)+' ';
    const matches=[];
    const dictionary=names.concat(POURMIND_REFERENCE.wines.map(w=>[w.name,[w.name,...w.name.split('/').map(x=>x.trim()),...w.aliases]]));
    for(const [name,aliases] of dictionary){const alias=aliases.map(normalize).filter(x=>x.length>=3).sort((x,y)=>y.length-x.length).find(x=>source.includes(' '+x+' '));if(alias)matches.push({name,alias});}
    // Suppress generic categories when a more specific label was read.
    const specific=[['Whiskey',['Bourbon','Rye whiskey','Scotch whisky']],['Brandy',['Cognac','Calvados']],['Vermouth',['Dry vermouth','Sweet vermouth']],['Chartreuse',['Green Chartreuse','Yellow Chartreuse']]];
    return matches.filter(m=>!specific.some(([generic,styles])=>m.name===generic&&matches.some(x=>styles.includes(x.name)))).filter((m,i,all)=>all.findIndex(x=>x.name===m.name)===i).map(x=>x.name).slice(0,40);
  }
  function cleanup() {
    generation++;active=false;
    if(currentWorker){const old=currentWorker;currentWorker=null;old.terminate().catch(()=>{});}
    if(previewURL){URL.revokeObjectURL(previewURL);previewURL='';}
    candidates=[];
    document.querySelectorAll('#scan-camera,#scan-photo').forEach(input=>input.value='');
    const workspace=document.querySelector('#scan-workspace');if(workspace)workspace.innerHTML='';
  }
  function open() {
    cleanup();active=true;
    a.openDialog(`<div class="dialog-body scanner-detail"><div class="eyebrow">Private label reader</div><h2 id="dialog-title">Scan My Bar</h2><p>Photograph a bottle label or choose a clear photo of several labels. We’ll read the text on this device, then you choose what to add.</p><p class="storage-note">Good light, sharp focus and straight-on labels help. This reader finds printed names; it cannot identify an unlabeled bottle or fruit by appearance. Photos are not uploaded or saved.</p><div class="actions scanner-inputs"><label class="button file-button">Take a photo<input class="sr-only" id="scan-camera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></label><label class="button secondary file-button">Choose photo<input class="sr-only" id="scan-photo" type="file" accept="image/jpeg,image/png,image/webp"></label></div><p class="field-help">JPG, PNG or WebP · up to 20 MB. On PC, either button opens the file picker.</p><div id="scan-progress" role="status" aria-live="polite"></div><div id="scan-workspace"></div></div>`);
  }
  function progress(text,value=null) {
    if(!active||!document.querySelector('#scan-progress'))return;
    document.querySelector('#scan-progress').innerHTML=`<p>${e(text)}</p>${value===null?'':`<progress max="100" value="${Math.round(value*100)}" aria-label="Reading label progress"></progress>`}`;
  }
  async function prepare(file) {
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP photo.');
    if(file.size>20*1024*1024)throw new Error('Choose a photo smaller than 20 MB.');
    const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');
    const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    return canvas;
  }
  async function workerFor(token) {
    const embedded=globalThis.POURMIND_OCR_ASSETS;
    const blobURLs=[];
    let lang='eng',options={workerBlobURL:false,cacheMethod:'none',logger:message=>{if(token!==generation)return;progress(message.status==='recognizing text'?'Reading the bottle labels…':'Preparing the private label reader…',message.progress);}};
    if(embedded){
      const blob=(text)=>{const url=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));blobURLs.push(url);return url;};
      options.workerPath=blob(embedded.worker);options.workerBlobURL=false;
      options.corePath=blob(embedded.core)+'#core.js';
      const modelURL=URL.createObjectURL(new Blob([Uint8Array.from(atob(embedded.language),c=>c.charCodeAt(0))],{type:'application/gzip'}));blobURLs.push(modelURL);
      options.langPath=modelURL+'#language';
    } else {
      options.workerPath=new URL('vendor/ocr/worker.min.js',location.href).href;
      options.corePath=new URL('vendor/ocr/tesseract-core-lstm.wasm.js',location.href).href;
      options.langPath=new URL('vendor/ocr/',location.href).href;
    }
    try {
      const worker=await Tesseract.createWorker(lang,1,options);
      if(token!==generation){await worker.terminate();return null;}
      currentWorker=worker;await worker.setParameters({tessedit_pageseg_mode:'11'});return worker;
    } finally {for(const url of blobURLs)URL.revokeObjectURL(url);}
  }
  function reviewMarkup(text,confidence) {
    return `<img class="scan-preview" src="${previewURL}" alt="Photo being reviewed"><h3>Review your items</h3><p>Check each suggestion and edit its name. Only selected items are added to My Bar.</p><p class="storage-note">Text-reading confidence: ${Math.round(confidence)}%. This is not a guarantee that a suggested ingredient is correct.</p><form id="scan-confirm"><div id="scan-items">${candidates.map((name,i)=>row(name,i)).join('')}</div>${candidates.length?'':'<p class="scan-empty">No familiar labels were found. You can type an item below or try a closer, sharper photo.</p>'}<button class="text-button" type="button" data-scan="add-row">Add another item</button><div class="actions"><button class="button" type="submit">Add selected to My Bar</button><button class="button secondary" type="button" data-scan="retry">Try another photo</button><button class="text-button" type="button" data-scan="cancel">Cancel scan</button></div><p id="scan-review-error" class="form-error" role="status"></p></form><details class="scan-text"><summary>Text read from the photo</summary><pre>${e(text.trim()||'No readable text found.')}</pre></details>`;
  }
  function row(name,i) {
    return `<div class="scan-item"><input type="checkbox" id="scan-check-${i}" checked aria-label="Include item ${i+1}"><label class="sr-only" for="scan-name-${i}">Scanned item ${i+1} name</label><input class="input" id="scan-name-${i}" value="${e(name)}" maxlength="80" placeholder="Enter the bottle or ingredient name"></div>`;
  }
  async function read(file) {
    if(!file)return;
    cleanup();active=true;const token=generation;
    document.querySelector('#scan-workspace').innerHTML='';document.querySelectorAll('.scanner-inputs input').forEach(x=>x.disabled=true);progress('Preparing your photo…');
    try {
      const canvas=await prepare(file);if(token!==generation)return;
      previewURL=URL.createObjectURL(file);
      const worker=await workerFor(token);if(!worker)return;
      const result=await worker.recognize(canvas);if(token!==generation)return;
      await worker.terminate();if(currentWorker===worker)currentWorker=null;
      candidates=suggest(result.data.text);document.querySelector('#scan-workspace').innerHTML=reviewMarkup(result.data.text,result.data.confidence);progress('Reading complete. Nothing has been added yet.');
    } catch(error) {
      if(token!==generation)return;
      progress(error.message?.startsWith('Choose ')?error.message:'The label reader could not read this photo. Try a clear JPG or PNG, or enter your ingredients manually.');
      document.querySelector('#scan-workspace').innerHTML='<p class="storage-note">Your existing inventory has not changed.</p>';
      if(currentWorker){await currentWorker.terminate().catch(()=>{});currentWorker=null;}
    } finally {if(token===generation)document.querySelectorAll('.scanner-inputs input').forEach(x=>x.disabled=false);}
  }
  function init(bridge) {
    a=bridge;
    a.dialog.addEventListener('close',()=>{if(active)cleanup();});
    a.dialog.addEventListener('change',event=>{if(['scan-camera','scan-photo'].includes(event.target.id))read(event.target.files[0]);});
    a.dialog.addEventListener('click',event=>{const button=event.target.closest('[data-scan]');if(!button)return;if(button.dataset.scan==='cancel'){a.dialog.close();return;}if(button.dataset.scan==='retry')open();if(button.dataset.scan==='add-row'){const i=document.querySelectorAll('.scan-item').length;if(i>=40)return;document.querySelector('#scan-items').insertAdjacentHTML('beforeend',row('',i));document.querySelector('#scan-name-'+i).focus();}});
    a.dialog.addEventListener('submit',event=>{
      if(event.target.id!=='scan-confirm')return;event.preventDefault();
      const selected=[...event.target.querySelectorAll('.scan-item')].filter(x=>x.querySelector('input[type="checkbox"]').checked).map(x=>x.querySelector('.input').value.trim());
      if(!selected.length||selected.some(x=>!x)){document.querySelector('#scan-review-error').textContent='Select at least one item and give every selected item a name.';return;}
      const result=a.addInventoryBatch(selected);a.dialog.close();a.renderView('bar');a.toast(result.persisted?`${result.added} ${result.added===1?'item':'items'} added to My Bar.${result.duplicates?' '+result.duplicates+' already in your bar.':''}`:'Selected items kept for this visit; browser storage is unavailable.');
    });
  }
  return {init,open,suggest};
})();

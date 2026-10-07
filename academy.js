'use strict';
globalThis.POURMIND_ACADEMY_UI = (() => {
  const content = POURMIND_ACADEMY;
  let a, tab = 'path', lessonId, lessonPage = 0, lessonPassed = false, guideName, guideStep = 0;
  let progress, collection, editingId = null, draftPhoto = '', shareFilter = 'all';
  const e = value => a.escapeHTML(value);
  const action = (type, value, label, cls = 'button secondary') => `<button class="${cls}" data-academy="${type}" data-id="${e(value)}">${label}</button>`;
  const field = (name, label, value = '', options = {}) => `<label class="input-label" for="${name}">${label}</label>${options.multiline ? `<textarea class="input" id="${name}" name="${name}" rows="${options.rows || 3}" maxlength="${options.max || 1200}" ${options.required ? 'required' : ''} ${options.min ? `minlength="${options.min}"` : ''}>${e(value)}</textarea>` : `<input class="input" id="${name}" name="${name}" value="${e(value)}" maxlength="${options.max || 100}" ${options.required ? 'required' : ''}>`}`;
  const findLesson = id => content.lessons.find(x => x.id === id);
  const findExercise = id => content.exercises.find(x => x.id === id);
  const saveProgress = () => a.writeStore('academy-progress-v1', progress);
  const saveCollection = () => a.writeStore('recipe-collection-v1', collection);
  const unique = values => [...new Set(values)];
  const newId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
  const dateLabel = value => new Date(value).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});
  function nav() {
    return `<div class="academy-tabs" role="group" aria-label="Learning sections">${[['path','Your path'],['lessons','Lessons'],['guides','Guided recipes'],['practice','Practice & journal'],['quiz','Knowledge checks']].map(([id,label]) => `<button class="filter" data-academy="tab" data-id="${id}" aria-pressed="${tab === id}">${label}</button>`).join('')}</div>`;
  }
  function stageDone(stage) {
    return stage.lessons.every(id => progress.lessons.includes(id)) && stage.guides.every(name => progress.guides.includes(name)) && (stage.exercises || (stage.exercise ? [stage.exercise] : [])).every(id => progress.journal.some(j => j.exercise === id));
  }
  function lessonCard(lesson) {
    const done = progress.lessons.includes(lesson.id);
    return `<article class="surface academy-card"><span class="demo-label">${lesson.duration} · ${done ? 'Completed' : 'Short lesson'}</span><h3>${e(lesson.title)}</h3><p>${e(lesson.sections[0].text.split('. ')[0])}.</p>${action('lesson', lesson.id, done ? 'Revisit lesson' : 'Start lesson')}</article>`;
  }
  function renderLearn() {
    const titles = {path:'Your next confident pour.',lessons:'Learn the why.',guides:'One step. One reason.',practice:'Make it. Notice it. Learn.',quiz:'Check what you know.'};
    let body = '';
    if (tab === 'path') {
      const next = content.lessons.find(l => !progress.lessons.includes(l.id));
      body = `<section class="surface learning-overview"><div><div class="eyebrow">Your learning path</div><h2>${next ? e(next.title) : 'Keep exploring the craft.'}</h2><p>${next ? 'Continue with a short lesson, then put the skill into practice.' : 'Revisit a guided recipe or create a variation of your own.'}</p>${next ? action('lesson',next.id,'Continue learning','button') : action('tab','practice','Explore practice','button')}</div><div class="learning-stats"><div><strong>${progress.lessons.length}/8</strong><span>Lessons completed</span></div><div><strong>${progress.guides.length}/12</strong><span>Guided walkthroughs</span></div><div><strong>${progress.journal.length}</strong><span>Journal entries</span></div></div></section><div class="stage-list">${content.stages.map((stage,i) => `<section class="surface stage-card"><div class="stage-number">${stageDone(stage) ? a.icon('check') : i+1}</div><div><span class="demo-label">${stageDone(stage) ? 'Stage completed' : 'Explore at your pace'}</span><h3>${e(stage.title)}</h3><p>${e(stage.description)}</p><div class="stage-links">${stage.lessons.map(id => action('lesson',id,`${progress.lessons.includes(id) ? '✓ ' : ''}${e(findLesson(id).title)}`,'filter')).join('')}${stage.guides.map(name => action('guide',name,`Guide: ${e(name)}`,'filter')).join('')}${(stage.exercises || (stage.exercise ? [stage.exercise] : [])).map(id => action('exercise',id,`Practice: ${e(findExercise(id).title)}`,'filter')).join('')}</div></div></section>`).join('')}</div>`;
    }
    if (tab === 'lessons') body = `<div class="academy-grid">${content.lessons.map(lessonCard).join('')}</div>`;
    if (tab === 'guides') body = `<p class="section-intro">Twelve classic recipes, with measured ingredients and a reason behind every step. Complete a walkthrough and record what you learned.</p><div class="academy-grid guide-grid">${Object.keys(content.guides).map(name => `<article class="surface academy-card guide-card"><img src="${a.photos[name]}" alt="${e(name)} cocktail" loading="lazy"><span class="demo-label">${progress.guides.includes(name) ? 'Walkthrough completed' : a.recipeDetails[name].family}</span><h3>${e(name)}</h3><p>${a.recipeDetails[name].steps.length} steps · Technique explained</p>${action('guide',name,'Start walkthrough')}</article>`).join('')}</div>`;
    if (tab === 'practice') body = `<p class="section-intro">Change one variable, observe the result and keep a useful note. You can also rehearse techniques with water or compare recipes without making a drink.</p><div class="academy-grid">${content.exercises.map(x => `<article class="surface academy-card"><span class="demo-label">Practical exercise</span><h3>${e(x.title)}</h3><p>${e(x.goal)}</p>${action('exercise',x.id,'Try exercise')}</article>`).join('')}</div><section class="journal-section"><div class="section-head"><h2>Your learning journal</h2>${progress.journal.length ? action('export-journal','','Export journal','text-button') : ''}</div><p class="storage-note">${a.storageReady() ? 'Private notes saved on this device.' : 'Notes are kept for this visit; browser storage is unavailable.'}</p>${progress.journal.length ? [...progress.journal].reverse().map(j => `<article class="surface journal-entry"><small>${e(dateLabel(j.date))} · ${j.type === 'guide' ? 'Guided walkthrough' : 'Practical exercise'}</small><h3>${e(j.title)}</h3><p class="preserve-lines">${e(j.observation)}</p>${j.change ? `<h4>Change and result</h4><p class="preserve-lines">${e(j.change)}</p>` : ''}${j.next ? `<h4>Next time</h4><p class="preserve-lines">${e(j.next)}</p>` : ''}${action('delete-journal',j.id,'Delete note','text-button')}</article>`).join('') : '<div class="empty-state"><h3>Your experiments belong here.</h3><p>Finish a guided walkthrough or an exercise to save your first observation.</p></div>'}</section>`;
    if (tab === 'quiz') body = a.knowledgePracticeMarkup();
    a.main.innerHTML = a.heading('Learning, with a little craft', titles[tab], 'Eight short lessons. Twelve guided recipes. A path from your first measured pour to your own creations.') + nav() + body;
  }
  function openLesson(id, page = null) {
    const lesson = findLesson(id); if (!lesson) return;
    lessonId = id; lessonPage = page === null ? Math.min(progress.positions[id] || 0, lesson.sections.length) : page;
    lessonPassed = false;
    const section = lesson.sections[lessonPage];
    a.openDialog(`<div class="dialog-body"><div class="eyebrow">${e(lesson.title)} · ${lessonPage+1} of ${lesson.sections.length+1}</div><h2 id="dialog-title">${e(section ? section.title : 'Check your understanding')}</h2>${section ? `<p class="lesson-text">${e(section.text)}</p><ul>${section.points.map(x => `<li>${e(x)}</li>`).join('')}</ul><div class="lesson-connection"><small>Put it into practice</small><p>${e(lesson.recipe)} guided walkthrough</p></div>` : `<p>${e(lesson.check.question)}</p><div class="quiz-options">${lesson.check.options.map((x,i) => `<button class="quiz-option" data-academy="lesson-answer" data-id="${i}" aria-pressed="false">${e(x)}</button>`).join('')}</div><p id="lesson-feedback" class="quiz-feedback" role="status" aria-live="polite"></p>`}<div class="actions">${lessonPage ? action('lesson-back',id,'Previous') : ''}${section ? action('lesson-next',id,'Continue','button') : `<button class="button" data-academy="complete-lesson" data-id="${id}" disabled>Complete lesson</button>`}</div></div>`);
  }
  function openGuide(name, step = null) {
    const why = content.guides[name]; if (!why) return;
    guideName = name; const recipe = a.drinks.find(d => d[0] === name);
    const steps = a.recipeDetails[name].steps;
    guideStep = step === null ? Math.min(progress.positions['guide:'+name] || 0, steps.length) : step;
    a.openDialog(`<img class="guide-photo" src="${a.photos[name]}" alt="${e(name)} cocktail"><div class="dialog-body"><p class="photo-credit">${e(a.recipeDetails[name].imageKind)} · ${e(a.recipeDetails[name].imageCredit)}</p><div class="eyebrow">Guided ${e(name)} · ${guideStep < steps.length ? `Step ${guideStep+1} of ${steps.length}` : 'Reflection'}</div><h2 id="dialog-title">${guideStep < steps.length ? 'Make the step count.' : 'What did you notice?'}</h2><details class="guide-ingredients"><summary>Ingredients, glass and garnish</summary><ul>${recipe[2].split(' • ').map(x => `<li>${e(x)}</li>`).join('')}</ul><p>${e(recipe[5])} · ${e(recipe[6])}</p></details>${guideStep < steps.length ? `<p class="guide-instruction">${e(steps[guideStep])}</p><div class="why-box"><h3>Why this matters</h3><p>${e(why[guideStep])}</p></div><div class="actions">${guideStep ? action('guide-back',name,'Previous') : ''}${action('guide-next',name,guideStep === steps.length-1 ? 'Reflect on the walkthrough' : 'Next step','button')}</div>` : `<p>Record something about the technique, ingredients or your result. A thoughtful rehearsal counts too.</p><form id="guide-reflection">${field('guide-observation','What did you learn?', '', {multiline:true, required:true, min:12})}<div class="actions">${action('guide-back',name,'Previous')}<button class="button" type="submit">Save walkthrough</button></div></form>`}</div>`);
  }
  function openExercise(id) {
    const exercise = findExercise(id); if (!exercise) return;
    a.openDialog(`<div class="dialog-body"><div class="eyebrow">Practical exercise</div><h2 id="dialog-title">${e(exercise.title)}</h2><p>${e(exercise.goal)}</p><ol>${exercise.steps.map(x => `<li>${e(x)}</li>`).join('')}</ol>${action('guide',exercise.recipe,`Open ${e(exercise.recipe)} guide`)}<h3>Record your experiment</h3><form id="exercise-reflection" data-id="${id}">${field('exercise-observation',exercise.prompts[0],'',{multiline:true,required:true,min:12})}${field('exercise-change',exercise.prompts[1],'',{multiline:true,required:true,min:12})}${field('exercise-next','What would you try next? (optional)','',{multiline:true})}<div class="actions"><button class="button" type="submit">Save experiment</button></div></form></div>`);
  }
  function download(filename, data) {
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  function journal(entry) {
    progress.journal.push({...entry,id:newId(),date:new Date().toISOString()});
    const persisted = saveProgress(); tab = 'practice'; a.renderView('learn');
    a.openDialog(`<div class="dialog-body"><div class="eyebrow">Your learning journal</div><h2 id="dialog-title">${persisted ? 'Observation saved.' : 'Observation kept for this visit.'}</h2><p>${e(entry.observation)}</p><div class="actions">${action('tab','practice','View journal','button')}${entry.exercise === 'create-original' ? action('new-recipe','','Create a private recipe') : action('tab','path','Continue your path')}</div></div>`);
  }
  function recipeById(id) { return collection.find(x => x.id === id); }
  function renderCommunity() {
    const entries = collection.filter(x => shareFilter === 'all' || (shareFilter === 'saved' ? x.saved : x.origin === shareFilter));
    a.main.innerHTML = a.heading('Learn from one another', 'A recipe worth sharing.', 'Create a private draft, exchange a recipe file and share what you learned. Your collection and feedback stay on this device.') + `<section class="surface sharing-intro"><div><h2>Your craft. Your explanation.</h2><p>Include measured ingredients, the method and the reason behind your choices. Friends can import your file and return their notes.</p></div><div class="actions">${action('new-recipe','','Create recipe','button')}<label class="button secondary file-button">Import recipe file<input type="file" id="recipe-import" accept=".json,application/json" class="sr-only"></label>${action('example-recipe','','Try an example','text-button')}</div></section><div class="academy-tabs" role="group" aria-label="Recipe collection filters">${[['all','All recipes'],['draft','Private drafts'],['imported','Imported recipes'],['saved','Saved recipes']].map(([id,label]) => `<button class="filter" data-academy="share-filter" data-id="${id}" aria-pressed="${shareFilter === id}">${label}</button>`).join('')}</div><p class="storage-note">${a.storageReady() ? 'Files are shared only when you choose to download and send them.' : 'Browser storage is unavailable. Export a recipe file to retain it after this visit.'}</p><div class="academy-grid">${entries.map(x => `<article class="surface academy-card community-card">${x.photo ? `<img src="${x.photo}" alt="${e(x.title)} recipe photo" loading="lazy">` : '<div class="recipe-placeholder" aria-hidden="true">'+a.icon('book')+'</div>'}<span class="demo-label">${x.origin === 'draft' ? 'Private draft' : x.example ? 'Example recipe' : 'Imported recipe'}</span><h3>${e(x.title)}</h3><p>By ${e(x.author)} · ${e(x.family)}</p><p>${e(x.why)}</p>${action('shared-recipe',x.id,'Open recipe')}</article>`).join('') || '<div class="empty-state"><h3>Start with a good idea.</h3><p>Create a draft or import a recipe file from someone you know. Teaching notes turn a recipe into something others can learn from.</p></div>'}</div>`;
  }
  function openRecipeForm(id = null, variation = false) {
    const existing = recipeById(id); editingId = existing && !variation ? id : null; draftPhoto = existing ? existing.photo : '';
    const x = existing || {};
    a.openDialog(`<div class="dialog-body"><div class="eyebrow">Private recipe draft</div><h2 id="dialog-title">${editingId ? 'Refine your recipe.' : variation ? 'Make your own variation.' : 'Give your idea a recipe.'}</h2><p>Write a measured recipe and explain your choices. Nothing is published automatically.</p><form id="recipe-draft">${field('draft-title','Recipe name',variation ? (x.title || '')+' variation' : x.title || '',{required:true,max:80})}${field('draft-author','Creator name',variation ? '' : x.author || '',{required:true,max:60})}${field('draft-family','Cocktail family',x.family || '',{required:true,max:60})}${field('draft-ingredients','Measured ingredients — one per line',(x.ingredients || []).join('\n'),{multiline:true,rows:5,required:true,max:2000})}<p class="field-help">For example: 2 oz gin, 0.75 oz lemon juice, 0.5 oz simple syrup, each on its own line.</p>${field('draft-steps','Method — one step per line',(x.steps || []).join('\n'),{multiline:true,rows:5,required:true,max:4000})}${field('draft-glass','Glass',x.glass || '',{required:true})}${field('draft-garnish','Garnish',x.garnish || '',{required:true})}${field('draft-inspiration','What inspired this recipe? (optional)',x.inspiration || '',{multiline:true})}${field('draft-why','Why do these ingredients and techniques work together?',x.why || '',{multiline:true,required:true,min:20})}${field('draft-substitutions','Substitutions or things to try (optional)',x.substitutions || '',{multiline:true})}<label class="input-label" for="draft-photo">Your cocktail photo (optional)</label><input class="input" id="draft-photo" type="file" accept="image/jpeg,image/png,image/webp"><p class="field-help">JPEG, PNG or WebP, up to 4 MB.</p><img class="draft-photo-preview" id="draft-photo-preview" ${draftPhoto ? `src="${draftPhoto}"` : 'hidden'} alt="Selected recipe photo preview"><label class="check-label"><input type="checkbox" id="photo-permission" ${draftPhoto && !variation ? 'checked' : ''}> I own this photo or have permission to share it.</label>${draftPhoto ? action('remove-photo','','Remove photo','text-button') : ''}<p id="draft-error" class="form-error" role="alert"></p><div class="actions"><button class="button" id="save-draft" type="submit">Save private draft</button></div></form></div>`);
  }
  function openSharedRecipe(id) {
    const x = recipeById(id); if (!x) return;
    a.openDialog(`${x.photo ? `<img class="dialog-photo" src="${x.photo}" alt="${e(x.title)} cocktail photo">` : ''}<div class="dialog-body"><div class="eyebrow">${x.origin === 'draft' ? 'Private draft' : x.example ? 'Example recipe' : 'Imported recipe'} · ${e(x.family)}</div><h2 id="dialog-title">${e(x.title)}</h2><p>Creator: ${e(x.author)}${x.origin === 'imported' && !x.example ? ' (as provided in the file)' : ''}</p>${x.photo ? '<p class="photo-credit">Photo supplied by the recipe creator.</p>' : ''}<div class="actions">${action('export-recipe',id,'Download recipe file','button')}${action('save-shared',id,x.saved ? 'Unsave recipe' : 'Save recipe')}${action(x.origin === 'draft' ? 'edit-recipe' : 'variation',id,x.origin === 'draft' ? 'Edit draft' : 'Create a variation')}</div><h3>What you’ll need</h3><ul>${x.ingredients.map(y => `<li>${e(y)}</li>`).join('')}</ul><h3>How to make it</h3><ol>${x.steps.map(y => `<li>${e(y)}</li>`).join('')}</ol><p>${e(x.glass)} · ${e(x.garnish)}</p>${x.inspiration ? `<h3>Inspiration</h3><p class="preserve-lines">${e(x.inspiration)}</p>` : ''}<h3>Why it works</h3><p class="preserve-lines">${e(x.why)}</p>${x.substitutions ? `<h3>Things to try</h3><p class="preserve-lines">${e(x.substitutions)}</p>` : ''}<h3>I tried this</h3><p>Keep an observation here. Download the recipe again to include your feedback when you return the file to its creator.</p><form id="recipe-feedback" data-id="${id}">${field('feedback-author','Your name','',{required:true,max:60})}${field('feedback-note','What worked, what changed, or what would you try next?','',{multiline:true,required:true,min:12,max:800})}<div class="actions"><button class="button secondary" type="submit">Save feedback</button></div></form><div class="feedback-list">${x.feedback.map(f => `<article><strong>${e(f.author)}</strong><p class="preserve-lines">${e(f.note)}</p><small>${e(dateLabel(f.date))}</small></article>`).join('')}</div>${action('delete-recipe',id,x.origin === 'draft' ? 'Delete draft' : 'Remove from collection','text-button')}</div>`);
  }
  function checkedRecipe(input) {
    const text = (value, max, min = 1) => {if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new Error('A recipe field is missing or too long.'); return value.trim();};
    if (!input || typeof input !== 'object') throw new Error('This file does not contain a recipe.');
    const lines = (values,max,min) => {if (!Array.isArray(values) || values.length < min || values.length > max) throw new Error('Include at least two measured ingredients and two method steps.'); return values.map(x => text(x,500));};
    const ingredients = lines(input.ingredients,20,2);
    if (ingredients.some(x => !/^\d+(?:[./]\d+)?\s+\S/.test(x) || !Number.isFinite(x.split(' ')[0].includes('/') ? Number(x.split(' ')[0].split('/')[0])/Number(x.split(' ')[0].split('/')[1]) : Number(x.split(' ')[0])) || (x.split(' ')[0].includes('/') ? Number(x.split(' ')[0].split('/')[0])/Number(x.split(' ')[0].split('/')[1]) : Number(x.split(' ')[0])) <= 0)) throw new Error('Start every ingredient with a measured quantity, such as 2 oz gin or 1 lime.');
    const photo = input.photo || '';
    if (typeof photo !== 'string' || (photo && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo) || photo.length > 500000))) throw new Error('The recipe photo must be a supported image under 375 KB.');
    const feedback = input.feedback || [];
    if (!Array.isArray(feedback) || feedback.length > 50) throw new Error('This recipe contains too many feedback notes.');
    return {id:typeof input.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(input.id) ? input.id : newId(),title:text(input.title,80),author:text(input.author,60),family:text(input.family,60),ingredients,steps:lines(input.steps,15,2),glass:text(input.glass,100),garnish:text(input.garnish,100),why:text(input.why,1200,20),inspiration:input.inspiration ? text(input.inspiration,1200) : '',substitutions:input.substitutions ? text(input.substitutions,1200) : '',photo,feedback:feedback.map(f => {if (!f || typeof f.id !== 'string' || f.id.length > 80 || !Number.isFinite(Date.parse(f.date))) throw new Error('A feedback note is invalid.');return {id:f.id,author:text(f.author,60),note:text(f.note,800,12),date:new Date(f.date).toISOString()};})};
  }
  async function importFile(file) {
    if (!file) return;
    try {
      if (file.size > 2000000) throw new Error('Choose a recipe JSON file smaller than 2 MB.');
      const data = JSON.parse(await file.text());
      if (data.format !== 'pourmind-recipe' || data.version !== 1) throw new Error('Choose a PourMind recipe file downloaded from Share.');
      const imported = checkedRecipe(data.recipe); const existing = recipeById(imported.id);
      if (existing) {
        const same = ['title','author','family','ingredients','steps','glass','garnish','why','inspiration','substitutions','photo'].every(key => JSON.stringify(existing[key]) === JSON.stringify(imported[key]));
        if (!same) throw new Error('A recipe with this ID has changed. Import it as a new variation rather than overwriting your collection.');
        const notes = unique([...existing.feedback,...imported.feedback].map(f => f.id));
        if (notes.length > 50) throw new Error('This recipe has reached its 50-feedback-note limit.');
        existing.feedback = notes.map(id => existing.feedback.find(f => f.id === id) || imported.feedback.find(f => f.id === id));
      } else {if (collection.length >= 40) throw new Error('Your collection holds 40 recipes. Export and remove an older recipe before adding another.');collection.push({...imported,origin:'imported',saved:false});}
      const persisted = saveCollection(); shareFilter = 'all'; a.renderView('community'); openSharedRecipe(imported.id);
      a.toast(persisted ? 'Recipe imported. Matching returned files add feedback without overwriting your recipe.' : 'Imported for this visit. Download the file to keep it.');
    } catch (error) {a.toast(error instanceof SyntaxError ? 'This file is not valid recipe JSON.' : error.message);}
  }
  async function loadPhoto(file) {
    if (!file) return;
    const error = document.querySelector('#draft-error'), submit = document.querySelector('#save-draft');
    error.textContent = ''; submit.disabled = true;
    try {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 4000000) throw new Error('Choose a JPEG, PNG or WebP photo under 4 MB.');
      const bitmap = await createImageBitmap(file), scale = Math.min(1,800/Math.max(bitmap.width,bitmap.height));
      const canvas = document.createElement('canvas');canvas.width = Math.round(bitmap.width*scale);canvas.height = Math.round(bitmap.height*scale);const drawing = canvas.getContext('2d');drawing.fillStyle = '#ffffff';drawing.fillRect(0,0,canvas.width,canvas.height);drawing.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const photo = canvas.toDataURL('image/jpeg',0.8);
      if (photo.length > 500000) throw new Error('This photo is too detailed to save. Choose a smaller image.');
      if (!document.querySelector('#recipe-draft') || submit !== document.querySelector('#save-draft')) return;
      draftPhoto = photo;const preview = document.querySelector('#draft-photo-preview');preview.src = draftPhoto;preview.hidden = false;document.querySelector('#photo-permission').checked = false;
    } catch (cause) {if (document.querySelector('#draft-error') === error) error.textContent = cause.message || 'This photo could not be read.';}
    finally {if (document.querySelector('#save-draft') === submit) submit.disabled = false;}
  }
  function onClick(event) {
    const button = event.target.closest('[data-academy]'); if (!button) return;
    const id = button.dataset.id;
    switch (button.dataset.academy) {
      case 'tab': tab = ['path','lessons','guides','practice','quiz'].includes(id) ? id : 'path'; if (a.dialog.open) a.dialog.close();a.renderView('learn');break;
      case 'lesson': openLesson(id);break;
      case 'lesson-next': case 'lesson-back': {
        const delta = button.dataset.academy === 'lesson-next' ? 1 : -1;const lesson = findLesson(id);if (!lesson) break;
        progress.positions[id] = Math.max(0,Math.min(lesson.sections.length,lessonPage+delta));saveProgress();openLesson(id,progress.positions[id]);break;
      }
      case 'lesson-answer': {
        const lesson = findLesson(lessonId);if (!lesson) break;const correct = Number(id) === lesson.check.correct;
        document.querySelectorAll('[data-academy="lesson-answer"]').forEach(x => x.setAttribute('aria-pressed',String(x===button)));
        document.querySelector('#lesson-feedback').textContent = `${correct ? 'That’s right.' : 'Try again.'} ${lesson.check.explanation}`;
        lessonPassed = correct;document.querySelector('[data-academy="complete-lesson"]').disabled = !correct;break;
      }
      case 'complete-lesson': {
        if (!lessonPassed || id !== lessonId) break;progress.lessons = unique([...progress.lessons,id]);progress.positions[id] = 0;saveProgress();renderLearn();
        a.openDialog(`<div class="dialog-body"><div class="eyebrow">Lesson completed</div><h2 id="dialog-title">Put the idea into practice.</h2><p>${e(findLesson(id).title)} is part of your learning progress.</p><div class="actions">${action('guide',findLesson(id).recipe,`Guide: ${e(findLesson(id).recipe)}`,'button')}${action('tab','path','View learning path')}</div></div>`);break;
      }
      case 'guide': openGuide(id || button.dataset.name);break;
      case 'guide-next': case 'guide-back': {
        if (id !== guideName) break;const delta = button.dataset.academy === 'guide-next' ? 1 : -1;guideStep = Math.max(0,Math.min(a.recipeDetails[id].steps.length,guideStep+delta));progress.positions['guide:'+id] = guideStep;saveProgress();openGuide(id,guideStep);break;
      }
      case 'exercise': openExercise(id);break;
      case 'export-journal': download('PourMind-learning-journal.json',{format:'pourmind-journal',version:1,entries:progress.journal});a.toast('Journal file downloaded.');break;
      case 'delete-journal': if (confirm('Delete this private journal entry?')) {progress.journal = progress.journal.filter(j => j.id !== id);saveProgress();renderLearn();}break;
      case 'new-recipe': openRecipeForm();break;
      case 'shared-recipe': openSharedRecipe(id);break;
      case 'edit-recipe': if (recipeById(id)?.origin === 'draft') openRecipeForm(id);break;
      case 'variation': openRecipeForm(id,true);break;
      case 'remove-photo': draftPhoto = '';document.querySelector('#draft-photo-preview').hidden = true;document.querySelector('#draft-photo').value = '';break;
      case 'share-filter': shareFilter = id;renderCommunity();break;
      case 'save-shared': {const x = recipeById(id);if (x) {x.saved = !x.saved;saveCollection();renderCommunity();openSharedRecipe(id);}break;}
      case 'export-recipe': {const x = recipeById(id);if (x) {download(x.title.replace(/[^a-z0-9]+/gi,'-')+'.pourmind.json',{format:'pourmind-recipe',version:1,recipe:checkedRecipe(x)});a.toast('Recipe file downloaded with teaching notes and feedback.');}break;}
      case 'delete-recipe': if (confirm('Remove this recipe from your device? Download a copy first if you want to keep it.')) {collection = collection.filter(x => x.id !== id);saveCollection();a.dialog.close();renderCommunity();}break;
      case 'example-recipe': {
        if (!recipeById('example-honey-lime')) {const source = a.drinks.find(d => d[0] === 'Daiquiri');collection.push({id:'example-honey-lime',title:'Honey Lime Rehearsal',author:'PourMind example',family:'Sour rehearsal',ingredients:['2 oz chilled water','1 oz fresh lime juice','0.75 oz honey syrup'],steps:['Shake water, lime and honey syrup with ice.','Fine-strain into a chilled coupe.','Compare the tartness and sweetness, then record your observation.'],glass:source[5],garnish:'Lime wheel',why:'This alcohol-free rehearsal keeps the spirit–citrus–sweetness proportions visible while practicing measuring and shaking. Honey syrup adds sweetness and a different aroma from plain simple syrup.',inspiration:'A learning exercise based on the Daiquiri structure.',substitutions:'Try simple syrup instead of honey syrup and compare the aroma. This is a rehearsal, not a classic Daiquiri recipe.',photo:'',feedback:[],origin:'imported',example:true,saved:false});saveCollection();}
        a.renderView('community');openSharedRecipe('example-honey-lime');break;
      }
    }
  }
  function onSubmit(event) {
    const form = event.target;
    if (!['guide-reflection','exercise-reflection','recipe-draft','recipe-feedback'].includes(form.id)) return;
    event.preventDefault();for (const input of form.querySelectorAll('[required]')) {if (input.value.trim().length < Math.max(1,input.minLength)) {input.setCustomValidity('Add a complete response before saving.');input.reportValidity();input.addEventListener('input',()=>input.setCustomValidity(''),{once:true});return;}}const data = new FormData(form);
    if (form.id === 'guide-reflection') {
      const observation = String(data.get('guide-observation') || '').trim();if (observation.length < 12) return;
      progress.guides = unique([...progress.guides,guideName]);progress.positions['guide:'+guideName] = 0;journal({type:'guide',title:guideName+' walkthrough',observation});
    }
    if (form.id === 'exercise-reflection') {
      const exercise = findExercise(form.dataset.id);if (!exercise) return;
      const observation = String(data.get('exercise-observation') || '').trim(), change = String(data.get('exercise-change') || '').trim();if (observation.length < 12 || change.length < 12) return;
      journal({type:'exercise',exercise:exercise.id,title:exercise.title,observation,change,next:String(data.get('exercise-next') || '').trim()});
    }
    if (form.id === 'recipe-draft') {
      try {
        if (draftPhoto && !document.querySelector('#photo-permission').checked) throw new Error('Confirm that you own the photo or have permission to share it.');
        const previous = recipeById(editingId);
        const x = checkedRecipe({id:editingId || newId(),title:data.get('draft-title'),author:data.get('draft-author'),family:data.get('draft-family'),ingredients:String(data.get('draft-ingredients')).split('\n').map(x=>x.trim()).filter(Boolean),steps:String(data.get('draft-steps')).split('\n').map(x=>x.trim()).filter(Boolean),glass:data.get('draft-glass'),garnish:data.get('draft-garnish'),inspiration:data.get('draft-inspiration'),why:data.get('draft-why'),substitutions:data.get('draft-substitutions'),photo:draftPhoto,feedback:previous?.feedback || []});
        const entry = {...x,origin:'draft',saved:previous?.saved || false};if (previous) collection = collection.map(y=>y.id===entry.id ? entry : y);else {if (collection.length>=40) throw new Error('Your collection holds 40 recipes. Export and remove an older one first.');collection.push(entry);}
        const persisted = saveCollection();shareFilter = 'all';a.renderView('community');openSharedRecipe(entry.id);a.toast(persisted ? 'Private draft saved on this device.' : 'Draft kept for this visit. Download a recipe file to retain it.');
      } catch (error) {document.querySelector('#draft-error').textContent = error.message;}
    }
    if (form.id === 'recipe-feedback') {
      const x = recipeById(form.dataset.id);if (!x) return;if (x.feedback.length >= 50) {a.toast('This recipe has reached its 50-feedback-note limit.');return;}
      const author = String(data.get('feedback-author') || '').trim(), note = String(data.get('feedback-note') || '').trim();if (!author || note.length < 12) return;
      x.feedback.push({id:newId(),author,note,date:new Date().toISOString()});const persisted = saveCollection();openSharedRecipe(x.id);a.toast(persisted ? 'Feedback saved. Download the recipe file to return your notes.' : 'Feedback kept for this visit. Download the recipe file to retain it.');
    }
  }
  function init(api) {
    a = api;
    const state = a.readStore('academy-progress-v1',{}), object = state && typeof state === 'object' ? state : {};
    progress = {lessons:unique((Array.isArray(object.lessons) ? object.lessons : []).filter(id => findLesson(id))),guides:unique((Array.isArray(object.guides) ? object.guides : []).filter(name => content.guides[name])),positions:{},journal:(Array.isArray(object.journal) ? object.journal : []).filter(j=>j && typeof j.id==='string' && typeof j.title==='string' && typeof j.observation==='string' && Number.isFinite(Date.parse(j.date))).map(j=>({id:j.id,type:j.type,title:j.title,observation:j.observation,change:typeof j.change==='string' ? j.change : '',next:typeof j.next==='string' ? j.next : '',date:j.date,exercise:j.exercise}))};
    if (object.positions && typeof object.positions === 'object') for (const [key,value] of Object.entries(object.positions)) if (Number.isInteger(value) && value>=0 && value<=4) progress.positions[key] = value;
    const items = a.readStore('recipe-collection-v1',[]);collection = [];
    if (Array.isArray(items)) for (const item of items.slice(0,40)) {try {collection.push({...checkedRecipe(item),origin:item.origin==='draft' ? 'draft' : 'imported',example:item.example===true,saved:item.saved===true});}catch { /* Ignore malformed stored records. */ }}
    document.addEventListener('click',onClick);document.addEventListener('submit',onSubmit);
    document.addEventListener('change',event=>{if (event.target.id==='recipe-import') importFile(event.target.files[0]);if (event.target.id==='draft-photo') loadPhoto(event.target.files[0]);});
  }
  return {init,renderLearn,renderCommunity};
})();

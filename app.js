'use strict';
(() => {
const { drinks, photos, recipeDetails } = POURMIND_DATA;
const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bottle: '<path d="M9 3h6M10 3v5l-4 5v8h12v-8l-4-5V3M6 14h12"/>',
  book: '<path d="M12 6v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
  trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>'
};
function icon(name, extra = '') { return `<svg ${extra} viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.spark}</svg>`; }
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const main = document.querySelector('main');
const dialog = document.querySelector('#dialog');
const dialogContent = document.querySelector('#dialog-content');
let storageAvailable = true;
function readStore(key, fallback) {
  try { const value = localStorage.getItem(`pourmind:${key}`); return value ? JSON.parse(value) : fallback; }
  catch { storageAvailable = false; return fallback; }
}
function writeStore(key, value) {
  try { localStorage.setItem(`pourmind:${key}`, JSON.stringify(value)); return true; }
  catch { storageAvailable = false; toast('Changes are kept for this visit. Browser storage is unavailable.'); return false; }
}
const storedSaved = readStore('saved', []);
const saved = new Set(Array.isArray(storedSaved) ? storedSaved.filter(name => drinks.some(d => d[0] === name)) : []);
const storedInventory = readStore('inventory', []);
let inventory = Array.isArray(storedInventory) ? storedInventory.filter(x => typeof x === 'string' && x.length < 81) : [];
const { topics: learningTopics, questions: learningQuestions } = POURMIND_LEARNING;
const legacyLearned = readStore('training', false) === true ? ['stir-old-fashioned', 'shake-daiquiri', 'express-orange'] : [];
const storedLearned = readStore('learned-questions', legacyLearned);
const learned = new Set(Array.isArray(storedLearned) ? storedLearned.filter(id => learningQuestions.some(q => q.id === id)) : []);
let view = 'home', category = 'All', query = '', toastTimer;
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('visible');
  if (dialog.open) {
    const status = document.querySelector('#dialog-status');
    if (status) status.textContent = message;
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3300);
}
function favoriteButton(d) {
  const active = saved.has(d[0]);
  return `<button class="favorite" data-action="favorite" data-name="${escapeHTML(d[0])}" aria-label="${active ? 'Unsave' : 'Save'} ${escapeHTML(d[0])}" aria-pressed="${active}">${icon('bookmark')}</button>`;
}
function recipeCard(d) {
  return `<article class="recipe-card"><button class="recipe-open" data-action="recipe" data-name="${escapeHTML(d[0])}" aria-label="View ${escapeHTML(d[0])} recipe"><div class="recipe-image"><img src="${photos[d[0]]}" alt="${escapeHTML(d[0])} cocktail" loading="lazy" width="400" height="480"></div><div class="recipe-info"><small>${escapeHTML(d[1])}</small><h3>${escapeHTML(d[0])}</h3><p>${escapeHTML(d[2])}</p></div></button>${favoriteButton(d)}</article>`;
}
function renderHome() {
  const featured = ['Margarita', 'Negroni', 'Espresso Martini', 'Whiskey Sour'].map(name => drinks.find(d => d[0] === name));
  main.innerHTML = `<section class="hero"><div class="hero-copy"><div class="eyebrow">Your home bar, elevated</div><h1>A little craft.<br>A <em>better</em> cocktail.</h1><p>Learn the why behind a great cocktail. Follow short lessons, practice with guided recipes, and find your confidence behind the bar.</p><div class="actions"><button class="button" data-view="learn">Start learning ${icon('arrow')}</button><button class="button secondary" data-view="recipes">Explore recipes</button></div><div class="hero-note">${icon('check')}86 recipes. Endless good evenings.</div></div><div class="hero-art"><img src="${photos['Old Fashioned']}" alt="An Old Fashioned cocktail with orange peel" width="600" height="600"><div class="photo-label"><div><small>A timeless favorite</small><h3>Old Fashioned</h3></div><button class="round-button" data-action="recipe" data-name="Old Fashioned" aria-label="View Old Fashioned recipe">${icon('arrow')}</button></div></div></section>
    <section class="quick-grid" aria-label="Explore PourMind"><button class="quick-card" data-view="bar"><span class="quick-icon">${icon('bottle')}</span><span><strong>Your bar, your possibilities</strong><small>${inventory.length ? `${inventory.length} ingredients in your bar` : 'Start with what you have'}</small></span>${icon('arrow','class="arrow"')}</button><button class="quick-card" data-view="learn"><span class="quick-icon">${icon('book')}</span><span><strong>A little know-how</strong><small>Learn the fundamentals</small></span>${icon('arrow','class="arrow"')}</button><button class="quick-card" data-action="inspiration"><span class="quick-icon">${icon('spark')}</span><span><strong>Find your next pour</strong><small>A little inspiration for tonight</small></span>${icon('arrow','class="arrow"')}</button></section>
    <section aria-labelledby="favorites-heading"><div class="section-head"><div><div class="eyebrow">Worth a place in your repertoire</div><h2 id="favorites-heading">Meet the classics.</h2></div><button class="text-button" data-view="recipes">View all ${icon('arrow')}</button></div><div class="recipe-grid">${featured.map(recipeCard).join('')}</div></section><section class="craft-banner"><div><h3>Great cocktails start with the basics.</h3><p>A few simple techniques can change everything in your glass.</p></div><button class="button secondary" data-view="learn">Learn the craft ${icon('arrow')}</button></section>`;
}
function heading(eyebrow, title, subtitle) { return `<div class="page-heading"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>`; }
function renderLibrary() {
  main.innerHTML = heading('A recipe for every mood', view === 'saved' ? 'Your favorites, on the house.' : 'Find your next favorite.', view === 'saved' ? 'The drinks you want to come back to. Saved in this browser, ready when you are.' : 'From timeless classics to a twist on the familiar. Search by name, spirit, or ingredient.') + `<div class="library-tools"><label class="search-box">${icon('search')}<input id="recipe-search" type="search" placeholder="Try Negroni, gin, or lime…" aria-label="Search recipes" value="${escapeHTML(query)}"><button class="search-clear" data-action="clear-search" aria-label="Clear search">${icon('close')}</button></label><div class="filter-row" aria-label="Filter by spirit">${['All','Whiskey','Gin','Rum','Tequila','Vodka','Brandy'].map(c => `<button class="filter" data-category="${c}" aria-pressed="${category === c}">${c}</button>`).join('')}</div></div><div class="results-meta"><span id="result-count" role="status" aria-live="polite"></span><span>Made for your home bar</span></div><div id="recipe-results" class="recipe-grid library-grid"></div>`;
  renderResults();
}
function renderResults() {
  const q = query.trim().toLowerCase();
  const results = drinks.filter(d => (view !== 'saved' || saved.has(d[0])) && (category === 'All' || recipeDetails[d[0]].spirits.includes(category)) && `${d[0]} ${recipeDetails[d[0]].spirits.join(' ')} ${d[2]}`.toLowerCase().includes(q));
  document.querySelector('#result-count').textContent = `${results.length} ${results.length === 1 ? 'recipe' : 'recipes'}${category !== 'All' ? ` · ${category}` : ''}`;
  const hasSaved = view === 'saved' && saved.size === 0;
  document.querySelector('#recipe-results').innerHTML = results.length ? results.map(recipeCard).join('') : `<div class="empty-state">${icon(hasSaved ? 'bookmark' : 'search')}<h2>${hasSaved ? 'Make a little collection.' : 'No matches this time.'}</h2><p>${hasSaved ? 'Tap the bookmark on any cocktail to keep your favorites here.' : 'Try another ingredient, or clear the filters to see every recipe.'}</p><button class="button" ${hasSaved ? 'data-view="recipes"' : 'data-action="reset-search"'}>${hasSaved ? 'Explore recipes' : 'Clear all filters'}</button></div>`;
  const clear = document.querySelector('.search-clear');
  clear.style.visibility = query ? 'visible' : 'hidden';
}
function renderBar() {
  main.innerHTML = heading('Make the most of what you have', 'Welcome to your bar.', 'A bottle of this. A squeeze of that. Keep your ingredients together and let the possibilities grow.') + `<div class="bar-layout"><section class="surface"><h2>Your ingredients <small>(${inventory.length})</small></h2><p>Add bottles, mixers, citrus, and the little extras.</p><form id="ingredient-form"><label class="input-label" for="ingredient">Ingredient name</label><div class="add-form"><input class="input" id="ingredient" placeholder="e.g. Gin or fresh limes" required maxlength="80" autocomplete="off"><button class="button" type="submit">Add ${icon('arrow')}</button></div></form><div id="inventory-list">${inventory.length ? inventory.map((name, i) => `<div class="inventory-item">${icon('bottle')}<span>${escapeHTML(name)}</span><button class="icon-button" data-action="remove-ingredient" data-index="${i}" aria-label="Remove ${escapeHTML(name)}">${icon('trash')}</button></div>`).join('') : '<div class="empty-state"><h3>A fresh start.</h3><p>Add your first ingredient above. There’s no perfect bar — just yours.</p></div>'}</div><p class="storage-note">${storageAvailable ? 'Your bar is saved on this device.' : 'Your bar is kept for this visit; browser storage is unavailable.'}</p></section><aside class="surface"><span class="demo-label">Scan demo</span><h2>Picture the possibilities.</h2><p>Try a sample bar to see how inventory works. Camera recognition is a future feature.</p><button class="button secondary" data-action="sample-bar">${icon('bottle')}Add sample ingredients</button><p class="storage-note">Adds sample bottles and mixers alongside your ingredients.</p></aside></div>`;
}
function knowledgePracticeMarkup() {
  return `<section class="surface learn-card"><div><div class="eyebrow">Build your bar knowledge</div><h2>A little practice. A more confident pour.</h2><p style="margin-top:18px">${learningQuestions.length} questions across ${learningTopics.length} topics, with an explanation for every answer. Learn at your own pace and revisit anything you want to practice.</p><ul class="lesson-points"><li>${icon('check')}Six questions in each topic</li><li>${icon('check')}Ten questions in mixed practice</li><li>${icon('check')}${storageAvailable ? 'Your progress saved on this device' : 'Your progress kept for this visit'}</li></ul></div><div class="training-summary"><span class="demo-label">Your learning progress</span><div><strong>${learned.size} / ${learningQuestions.length}</strong></div><p>${learned.size === learningQuestions.length ? 'You’ve answered every question correctly. Keep your knowledge fresh with another practice.' : 'Questions answered correctly. Mixed practice starts with questions you haven’t completed yet.'}</p><div class="progress" aria-label="Questions answered correctly" role="progressbar" aria-valuemin="0" aria-valuemax="${learningQuestions.length}" aria-valuenow="${learned.size}"><div style="width:${100 * learned.size / learningQuestions.length}%"></div></div><button class="button" data-action="quiz">Try mixed practice ${icon('arrow')}</button></div></section><section class="learning-topics" aria-labelledby="topics-heading"><div class="section-head"><div><div class="eyebrow">One topic at a time</div><h2 id="topics-heading">Choose what to learn.</h2></div></div><div class="learning-grid">${learningTopics.map(topic => {
    const questions = learningQuestions.filter(q => q.topic === topic.id);
    const done = questions.filter(q => learned.has(q.id)).length;
    return `<article class="surface learning-topic"><h3>${escapeHTML(topic.title)}</h3><p>${escapeHTML(topic.description)}</p><p class="topic-progress">${done} of ${questions.length} answered correctly</p><button class="button secondary" data-action="quiz" data-topic="${topic.id}" aria-label="${done === questions.length ? 'Practice' : 'Start'} ${escapeHTML(topic.title)}">${done === questions.length ? 'Practice again' : 'Start topic'} ${icon('arrow')}</button></article>`;
  }).join('')}</div></section>`;
}
function renderLearn() { POURMIND_ACADEMY_UI.renderLearn(); }
function renderView(next, focus = true) {
  view = next;
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  ({home:renderHome, recipes:renderLibrary, saved:renderLibrary, bar:renderBar, learn:renderLearn, community:() => POURMIND_ACADEMY_UI.renderCommunity()}[view] || renderHome)();
  document.title = `PourMind — ${ {home:'Discover',recipes:'Recipes',saved:'Saved recipes',bar:'My bar',learn:'Learn the craft',community:'Recipe sharing'}[view] }`;
  updateSavedButtons();
  if (focus) { window.scrollTo({top:0,behavior:'instant'}); main.focus({preventScroll:true}); }
}
function updateSavedButtons() {
  document.querySelector('#saved-count').textContent = saved.size;
  document.querySelectorAll('[data-action="favorite"]').forEach(button => {
    const active = saved.has(button.dataset.name);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', `${active ? 'Unsave' : 'Save'} ${button.dataset.name}`);
    if (!button.classList.contains('favorite')) button.innerHTML = `${icon('bookmark')}${active ? 'Saved to favorites' : 'Save recipe'}`;
  });
}
function toggleFavorite(name) {
  saved.has(name) ? saved.delete(name) : saved.add(name);
  const persisted = writeStore('saved', [...saved]);
  updateSavedButtons();
  if (view === 'saved') renderResults();
  if (persisted) toast(saved.has(name) ? 'Recipe saved to your favorites.' : 'Recipe removed from favorites.');
}
function openDialog(content) {
  dialogContent.innerHTML = content + '<p class="sr-only" id="dialog-status" role="status" aria-live="polite"></p>';
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  updateSavedButtons();
  const title = document.querySelector('#dialog-title');
  title.setAttribute('tabindex', '-1');
  title.focus({preventScroll:true});
}
function openRecipe(name) {
  const d = drinks.find(d => d[0] === name);
  if (!d) return;
  const related = relatedRecipes(name);
  const detail = recipeDetails[name];
  const credit = `${detail.imageKind} · ${detail.imageCredit}`;
  openDialog(`<img class="dialog-photo" src="${photos[name]}" alt="${escapeHTML(name)} cocktail"><div class="dialog-body"><p class="photo-credit">${escapeHTML(credit)}</p><div class="eyebrow">${escapeHTML(detail.spirits.join(' + '))} · The cocktail library</div><h2 id="dialog-title">${escapeHTML(name)}</h2><div class="actions"><button class="button secondary" data-action="favorite" data-name="${escapeHTML(name)}" aria-pressed="${saved.has(name)}">${icon('bookmark')}${saved.has(name) ? 'Saved to favorites' : 'Save recipe'}</button></div><p class="serving-note">${escapeHTML(detail.note)}</p>${POURMIND_ACADEMY.guides[name] ? `<button class="button guide-entry" data-academy="guide" data-name="${escapeHTML(name)}">Start guided walkthrough ${icon('arrow')}</button>` : ''}<h3>What you’ll need</h3><ul>${d[2].split(' • ').map(x => `<li>${escapeHTML(x)}</li>`).join('')}</ul><h3>How to make it</h3><ol>${detailedMethod(d).map(x => `<li>${escapeHTML(x)}</li>`).join('')}</ol><div class="recipe-details"><strong>Glass:</strong> ${escapeHTML(d[5] || 'Appropriate chilled glass')}<br><strong>Garnish:</strong> ${escapeHTML(d[6] || 'Classic garnish')}</div>${detail.reference ? `<p class="recipe-reference"><a href="${escapeHTML(detail.reference)}" target="_blank" rel="noopener noreferrer">Recipe reference</a></p>` : ''}${related.length ? '<h3>Related recipes</h3>' : ''}<div class="filter-row">${related.map(n => `<button class="filter" data-action="recipe" data-name="${escapeHTML(n)}">${escapeHTML(n)}</button>`).join('')}</div></div>`);
}
function openInspiration() {
  openDialog(`<div class="dialog-body"><span class="demo-label">Recipe inspiration · Local demo</span><h2 id="dialog-title">What are you in the mood for?</h2><p>Find a match from the cocktail library. Try a spirit, ingredient, or cocktail name.</p><form id="inspiration-form"><label class="input-label" for="inspiration">Your inspiration</label><input class="input" id="inspiration" placeholder="e.g. tequila, mint, or a sour" required maxlength="120"><div class="actions"><button class="button" type="submit">Find a recipe ${icon('arrow')}</button></div></form><p class="storage-note">This demo searches existing recipes. It doesn’t call an AI service.</p><div id="inspiration-results"></div></div>`);
  document.querySelector('#inspiration').focus();
}
let quiz = [], quizIndex = 0, quizAnswered = false, quizTitle = '';
function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function startQuiz(topicId) {
  const topic = learningTopics.find(topic => topic.id === topicId);
  const pool = topic ? learningQuestions.filter(q => q.topic === topic.id) : learningQuestions;
  quiz = [...shuffled(pool.filter(q => !learned.has(q.id))), ...shuffled(pool.filter(q => learned.has(q.id)))].slice(0, topic ? pool.length : 10);
  quizTitle = topic ? topic.title : 'Mixed practice';
  quizIndex = 0;
  showQuiz();
}
function showQuiz() {
  const q = quiz[quizIndex];
  const topic = learningTopics.find(topic => topic.id === q.topic);
  quizAnswered = false;
  openDialog(`<div class="dialog-body"><div class="eyebrow">${escapeHTML(quizTitle)} · ${quizIndex + 1} of ${quiz.length}</div><p class="question-topic">${escapeHTML(topic.title)}</p><h2 id="dialog-title">${escapeHTML(q.question)}</h2><div class="quiz-options">${q.options.map((answer, i) => `<button class="quiz-option" data-action="answer" data-answer="${i}" aria-pressed="false">${escapeHTML(answer)}</button>`).join('')}</div><div id="quiz-feedback" class="quiz-feedback" role="status" aria-live="polite"></div><button class="button" id="quiz-next" data-action="quiz-next" disabled>${quizIndex === quiz.length - 1 ? 'Finish practice' : 'Next question'} ${icon('arrow')}</button></div>`);
}
function answerQuiz(answer, button) {
  if (quizAnswered) return;
  const q = quiz[quizIndex];
  document.querySelectorAll('.quiz-option').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
  const correct = answer === q.correct;
  document.querySelector('#quiz-feedback').textContent = correct ? `That’s right. ${q.explanation}` : `Not quite. ${q.explanation} Choose another answer to continue.`;
  if (correct) {
    quizAnswered = true;
    learned.add(q.id);
    writeStore('learned-questions', [...learned]);
    if (view === 'learn') renderLearn();
    document.querySelector('#quiz-next').disabled = false;
  }
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.view) { if (dialog.open) dialog.close(); renderView(button.dataset.view); return; }
  if (button.dataset.category) {
    category = button.dataset.category;
    document.querySelectorAll('[data-category]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
    renderResults(); return;
  }
  switch (button.dataset.action) {
    case 'recipe': openRecipe(button.dataset.name); break;
    case 'favorite': toggleFavorite(button.dataset.name); break;
    case 'close': dialog.close(); break;
    case 'inspiration': openInspiration(); break;
    case 'clear-search': query = ''; document.querySelector('#recipe-search').value = ''; renderResults(); document.querySelector('#recipe-search').focus(); break;
    case 'reset-search': query = ''; category = 'All'; renderLibrary(); document.querySelector('#recipe-search').focus(); break;
    case 'remove-ingredient': {
      const name = inventory[Number(button.dataset.index)];
      inventory.splice(Number(button.dataset.index),1);
      const persisted = writeStore('inventory', inventory);
      renderBar(); document.querySelector('#ingredient').focus();
      if (persisted) toast(`${name} removed from your bar.`);
      break;
    }
    case 'sample-bar': {
      ['Bourbon / Rye','Gin','Tequila','Rum','Sweet Vermouth','Bitters','Simple Syrup','Limes'].forEach(name => {
        if (!inventory.some(x => x.toLowerCase() === name.toLowerCase())) inventory.push(name);
      });
      const persisted = writeStore('inventory', inventory);
      renderBar(); document.querySelector('#ingredient').focus();
      if (persisted) toast('Sample ingredients added to your bar.');
      break;
    }
    case 'quiz': startQuiz(button.dataset.topic); break;
    case 'answer': answerQuiz(Number(button.dataset.answer), button); break;
    case 'quiz-next':
      if (!quizAnswered) return;
      if (++quizIndex < quiz.length) showQuiz();
      else {
        renderLearn();
        openDialog(`<div class="dialog-body"><div class="eyebrow">A little more confident</div><h2 id="dialog-title">Practice complete.</h2><p>You answered all ${quiz.length} questions in this round correctly. Your total progress is ${learned.size} of ${learningQuestions.length}. Choose another topic or repeat a mixed practice to keep learning.</p><div class="actions"><button class="button secondary" data-view="learn">Choose another topic</button><button class="button secondary" data-action="quiz">Try mixed practice</button><button class="button" data-view="recipes">Put it into practice ${icon('arrow')}</button></div></div>`);
      }
      break;
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'recipe-search') { query = event.target.value; renderResults(); }
});
document.addEventListener('submit', event => {
  if (event.target.id === 'ingredient-form') {
    event.preventDefault();
    const input = document.querySelector('#ingredient');
    const name = input.value.trim();
    if (!name) { input.setCustomValidity('Enter an ingredient name.'); input.reportValidity(); input.addEventListener('input', () => input.setCustomValidity(''), {once:true}); return; }
    if (inventory.some(x => x.toLowerCase() === name.toLowerCase())) { toast('That ingredient is already in your bar.'); input.focus(); return; }
    inventory.push(name); const persisted = writeStore('inventory', inventory);
    renderBar(); document.querySelector('#ingredient').focus();
    if (persisted) toast(`${name} added to your bar.`);
  }
  if (event.target.id === 'inspiration-form') {
    event.preventDefault();
    const value = document.querySelector('#inspiration').value.trim().toLowerCase();
    const words = value.split(/\s+/).filter(x => !['a','an','the','with','and','or','drink','cocktail','please','refreshing','something'].includes(x));
    const matches = value && words.length ? drinks.map(d => ({d,score:words.filter(w => `${d[0]} ${recipeDetails[d[0]].spirits.join(' ')} ${d[2]}`.toLowerCase().includes(w)).length})).filter(x => x.score > 0).sort((a,b) => b.score - a.score).slice(0,4).map(x => x.d) : [];
    document.querySelector('#inspiration-results').innerHTML = matches.length ? `<h3 id="inspiration-heading" tabindex="-1">A few pours to try</h3><div class="recipe-grid">${matches.map(recipeCard).join('')}</div>` : '<p id="inspiration-heading" tabindex="-1" class="quiz-feedback" style="margin-top:24px">No match yet. Try a specific spirit or ingredient, such as gin or lime.</p>';
    document.querySelector('#inspiration-heading').focus();
  }
});
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }
});
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const targets = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
  const first = targets[0], last = targets[targets.length - 1];
  if (!first) { event.preventDefault(); return; }
  if (!targets.includes(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
});
POURMIND_ACADEMY_UI.init({main, dialog, escapeHTML, icon, heading, openDialog, toast, readStore, writeStore, renderView, knowledgePracticeMarkup, drinks, photos, recipeDetails, storageReady:() => storageAvailable});
renderView('home', false);
})();

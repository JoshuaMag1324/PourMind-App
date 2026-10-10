/* Wine, spirit, cocktail-family and food-pairing reference. All content works offline. */
'use strict';
globalThis.POURMIND_DISCOVERY_UI = (() => {
  const data = POURMIND_REFERENCE;
  let a, category = 'All wines', query = '', limit = 12, familyQuery = '', food = 'shellfish', pairingKind = 'wine', pairingLimit = 9;
  const e = value => a.escapeHTML(value);
  const fold = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const action = (kind,id,label,cls='button secondary') => `<button class="${cls}" data-discovery="${kind}" data-id="${e(id)}">${e(label)}</button>`;
  function libraryNav(active) {
    return `<div class="academy-tabs discovery-nav" role="group" aria-label="Library sections">${[['recipes','Cocktails'],['spirits','Spirits'],['wines','Wines'],['beers','Beers']].map(([id,title])=>`<button class="filter" data-view="${id}" aria-pressed="${active===id}">${title}</button>`).join('')}</div>`;
  }
  function wineCard(w, reason='') {
    return `<article class="surface reference-card"><span class="demo-label">${e(w.category)} · ${e(w.type)}</span><h3>${e(w.name)}</h3><p>${e(w.taste)}</p><div class="wine-chips"><span>${e(w.body)} body</span><span>${e(w.sweetness)}</span></div>${reason ? `<p class="pairing-reason"><strong>Why it can work:</strong> ${e(reason)}</p>` : ''}${action('wine',w.id,'Explore '+w.name)}</article>`;
  }
  function matchingReference() {
    const items = category === 'Spirits' ? data.spirits : data.wines.filter(w => category === 'All wines' || w.category === category);
    const search = fold(query.trim());
    return items.filter(x => fold([x.name,x.taste,x.regions,...(x.aliases||[]),...(x.styles||[]).flat()].join(' ')).includes(search));
  }
  function referenceResults() {
    const matches = matchingReference();
    return `<p class="reference-count" role="status">${matches.length} ${category==='Spirits'?'spirit categories':'wines'}${query.trim()?' matching “'+e(query.trim())+'”':''} · Showing ${Math.min(limit,matches.length)}</p><div class="academy-grid reference-grid">${matches.slice(0,limit).map(x => category==='Spirits' ? `<article class="surface reference-card"><span class="demo-label">Distilled spirits · ${x.styles.length} styles</span><h3>${e(x.name)}</h3><p>${e(x.taste)}</p>${action('spirit',x.id,'Explore '+x.name)}</article>` : wineCard(x)).join('') || '<div class="empty-state"><h3>No matches yet.</h3><p>Try a grape, region or flavor. Choose All wines to search every wine category.</p></div>'}</div>${matches.length>limit ? `<div class="reference-more">${action('more-reference','','Show more')}</div>` : ''}`;
  }
  function renderReference() {
    a.main.innerHTML = a.heading('Know what’s in your glass', category==='Spirits'?'Spirits.':'Wines.', category==='Spirits'?'Explore spirit styles and typical flavors, then follow their links to measured cocktail recipes.':`${data.wines.length} grape varieties and named wine styles. Find a flavor, learn the terms and discover what to serve alongside it.`) + libraryNav(category==='Spirits'?'spirits':'wines') + `<section class="reference-tools"><label class="input-label" for="reference-search">Search wines and spirits</label><input class="input" id="reference-search" type="search" value="${e(query)}" placeholder="Try Riesling, Chardonnay or cherry" autocomplete="off"><div class="academy-tabs" role="group" aria-label="Wine and spirit categories">${(category==='Spirits'?[]:['All wines','White','Red','Rosé','Sparkling','Fortified']).map(c=>`<button class="filter" data-discovery="category" data-id="${c}" aria-pressed="${category===c}">${c}</button>`).join('')}</div></section><details class="surface tasting-glossary"><summary>How to read a tasting note</summary><dl><dt>Dry or sweet</dt><dd>Describes residual sugar. Fruity aromas can occur in a completely dry wine. Check the bottle’s style rather than guessing from the grape.</dd><dt>Body</dt><dd>The weight or texture of the wine in your mouth, from light to full.</dd><dt>Acidity</dt><dd>A mouthwatering, tart sensation. Higher acidity can refresh the palate alongside rich food.</dd><dt>Tannin</dt><dd>A grippy or mouth-drying sensation, especially in reds. It is different from “dry” meaning low sugar.</dd><dt>Oak and buttery notes</dt><dd>Oak can contribute vanilla and toast; buttery aromas often come from malolactic fermentation. They are separate influences.</dd><dt>Serving temperature</dt><dd>A starting range. Serving reds slightly cool can reveal more detail; very cold whites can hide aromas.</dd></dl><p>These are typical profiles, not a promise about every bottle. Region, vintage, ripeness, oak, skin contact and winemaking change the result. This library covers widely encountered and regional varieties and styles; it is not a list of every grape or producer in the world.</p></details><section id="reference-results" aria-label="Wine and spirit reference results">${referenceResults()}</section>`;
  }
  function renderSpirits() { category='Spirits';query='';limit=12;renderReference(); }
  function renderWines() { category='All wines';query='';limit=12;renderReference(); }
  function openWine(id) {
    const w = data.wines.find(x=>x.id===id); if (!w) return;
    const metrics = [['Body',w.body],['Acidity',w.acidity],['Sweetness',w.sweetness],['Tannin',w.tannin],['Serve',w.serve]];
    a.openDialog(`<div class="dialog-body reference-detail"><div class="eyebrow">${e(w.category)} wine · ${e(w.type)}</div><h2 id="dialog-title">${e(w.name)}</h2><h3>What it tastes like</h3><p>${e(w.taste)}</p><dl class="taste-metrics">${metrics.map(([label,value])=>`<div><dt>${label}</dt><dd>${e(value)}</dd></div>`).join('')}</dl><h3>Where you’ll find it</h3><p>${e(w.regions)}</p><p class="storage-note">Typical profile. Read the label or producer notes for a bottle’s sweetness, blend and style. Fruity flavors do not necessarily mean sweet.</p>${action('add-wine',id,'Add '+w.name+' to My bar','button')}<h3>Food pairing ideas</h3><ul class="pairing-list">${w.pairings.map(p=>`<li><strong>${e(data.foods.find(f=>f.id===p.food).title)}</strong><p>${e(p.why)}</p>${action('food',p.food,'Explore this pairing','text-button')}</li>`).join('')}</ul></div>`);
  }
  function openSpirit(id) {
    const x = data.spirits.find(s=>s.id===id); if (!x) return;
    a.openDialog(`<div class="dialog-body reference-detail"><div class="eyebrow">Distilled spirits</div><h2 id="dialog-title">${e(x.name)}</h2><p>${e(x.taste)}</p><h3>Explore the styles</h3><dl class="spirit-styles">${x.styles.map(([name,taste])=>`<dt>${e(name)}</dt><dd>${e(taste)}</dd>`).join('')}</dl><p class="storage-note">A spirit’s grain or fruit, production, aging and bottling strength affect the flavor.</p>${action('add-spirit',id,'Add '+x.name+' to My bar','button')}<h3>Try it in a cocktail</h3><div class="actions">${x.recipes.map(name=>action('recipe',name,name)).join('')}</div></div>`);
  }
  function cocktailPairings(name) {
    const matches = Object.entries(data.cocktailPairings).flatMap(([food, recipes]) => recipes.filter(recipe => recipe.name === name).map(recipe => ({food, why: recipe.why})));
    const family = data.families.find(family => family.recipes.includes(name));
    const fallback = {
      'old-fashioned': ['beef','cheese'], 'martini': ['shellfish','salads'],
      'manhattan': ['beef','cheese'], 'negroni': ['cheese','pork'],
      'sours': ['poultry','fried'], 'daiquiri': ['fish','fried'],
      'margarita': ['fish','vegetables'], 'sidecar': ['poultry','cheese'],
      'herbal-sours': ['salads','poultry'], 'fizzes': ['shellfish','fried'],
      'highballs': ['fried','poultry'], 'mint': ['poultry','salads'],
      'tropical': ['barbecue','poultry'], 'after-dinner': ['chocolate','dessert'],
      'modern-fruit': ['poultry','salads']
    };
    const suggestions = matches.length ? matches : (fallback[family?.id] || ['cheese','poultry']).map(food => ({food, why: `A starting point for this ${family?.title || 'cocktail'} style. Match the dish’s sauce, sweetness and intensity to the drink.`}));
    return `<section class="cocktail-food-pairings"><h3>Food pairing ideas</h3><ul class="pairing-list">${suggestions.slice(0,3).map(pair => `<li><strong>${e(data.foods.find(food => food.id === pair.food).title)}</strong><p>${e(pair.why)}</p></li>`).join('')}</ul></section>`;
  }
  function familyResults() {
    const q = fold(familyQuery.trim());
    const families = data.families.filter(f=>fold([f.title,f.structure,f.taste,...f.recipes].join(' ')).includes(q));
    return `<p class="reference-count" role="status">${families.length} teaching families</p><div class="academy-grid">${families.map(f=>`<article class="surface reference-card family-card"><span class="demo-label">${f.recipes.length} recipes to explore</span><h3>${e(f.title)}</h3><p class="family-structure">${e(f.structure)}</p><p>${e(f.taste)}</p>${action('family',f.id,'Explore '+f.title)}</article>`).join('') || '<div class="empty-state"><h3>No family found.</h3><p>Try a drink name such as Daiquiri or a pattern such as sour.</p></div>'}</div>`;
  }
  function renderFamilies() {
    a.main.innerHTML = a.heading('Learn the pattern, then make it your own', 'Cocktail families.', 'Understand the structure behind the drink: what each ingredient does, how to mix it and which changes preserve the balance.') + '<button class="text-button" data-view="learn">← Back to Learn</button>' + `<details class="surface discovery-intro"><summary>How cocktail families work</summary><p>These ${data.families.length} teaching groups connect all ${data.families.reduce((count, family) => count + family.recipes.length, 0)} library recipes. A family is a useful pattern, not one universal ratio: named cocktails retain their own ingredients and measured specifications.</p><p>Start with a tested recipe, change one thing and record how the flavor changes in your learning journal.</p><button class="text-button" data-view="learn">Open your lessons and journal</button></details><label class="input-label" for="family-search">Find a family or cocktail</label><input id="family-search" class="input" type="search" value="${e(familyQuery)}" placeholder="Try sour, Negroni or Margarita" autocomplete="off"><section id="family-results">${familyResults()}</section>`;
  }
  function openFamily(id) {
    const f = data.families.find(x=>x.id===id); if (!f) return;
    a.openDialog(`<div class="dialog-body reference-detail"><div class="eyebrow">Cocktail family · ${f.recipes.length} examples</div><h2 id="dialog-title">${e(f.title)}</h2><h3>The structure</h3><p class="family-structure">${e(f.structure)}</p><h3>What to expect</h3><p>${e(f.taste)}</p><h3>How to mix it</h3><p>${e(f.method)}</p><h3>Make a thoughtful variation</h3><p>${e(f.variation)}</p><p class="storage-note">Use the exact measurements and method in each named recipe. Family patterns are learning tools, not a replacement for the recipe.</p><h3>Recipes in this family</h3><div class="family-recipes">${f.recipes.map(name=>`<button class="family-recipe" data-discovery="recipe" data-id="${e(name)}"><img src="${a.photos[name]}" alt="" loading="lazy"><span>${e(name)}</span>${a.icon('arrow')}</button>`).join('')}</div></div>`);
  }
  function pairingResults() {
    const selected = data.foods.find(f=>f.id===food);
    if (pairingKind === 'cocktail') {
      return `<h2>${e(selected.title)} & cocktails</h2><div class="academy-grid">${data.cocktailPairings[food].map(p=>`<article class="surface reference-card pairing-cocktail"><img src="${a.photos[p.name]}" alt="${e(p.name)} cocktail" loading="lazy"><h3>${e(p.name)}</h3><p>${e(p.why)}</p>${action('recipe',p.name,'Open '+p.name)}</article>`).join('')}</div>`;
    }
    const matches = data.wines.filter(w=>w.pairings.some(p=>p.food===food));
    return `<h2>${e(selected.title)} & wines</h2><p class="reference-count" role="status">${matches.length} starting points · Showing ${Math.min(matches.length,pairingLimit)}</p><div class="academy-grid">${matches.slice(0,pairingLimit).map(w=>wineCard(w,w.pairings.find(p=>p.food===food).why)).join('')}</div>${matches.length>pairingLimit?`<div class="reference-more">${action('more-pairings','','Show more wine ideas')}</div>`:''}`;
  }
  function renderPairings() {
    const selected = data.foods.find(f=>f.id===food);
    a.main.innerHTML = a.heading('A good drink, a thoughtful match', 'Food pairings.', 'Choose what’s on the plate, then explore wine and cocktail suggestions with a reason for each match.') + '<button class="text-button" data-view="learn">← Back to Learn</button>' + `<section class="surface pairing-controls"><label class="input-label" for="pairing-food">What are you serving?</label><select class="input" id="pairing-food">${data.foods.map(f=>`<option value="${f.id}"${f.id===food?' selected':''}>${e(f.title)}</option>`).join('')}</select><p>${e(selected.examples)}</p><div class="academy-tabs" role="group" aria-label="Pairing drink types">${[['wine','Wines'],['cocktail','Cocktails']].map(([id,title])=>`<button class="filter" data-discovery="pairing-kind" data-id="${id}" aria-pressed="${pairingKind===id}">${title}</button>`).join('')}</div><details class="pairing-principles"><summary>Learn the pairing principles</summary><p class="storage-note">Start with the sauce, seasoning and cooking method. Acid can refresh rich food; tannin can suit protein; sweetness can help with moderate chili heat. Alcohol can intensify heat. For desserts, choose a wine at least as sweet as the food. These are starting points to explore, not guaranteed matches.</p></details></section><section id="pairing-results" aria-label="Food pairing suggestions">${pairingResults()}</section>`;
  }
  function click(event) {
    const button = event.target.closest('[data-discovery]'); if (!button) return;
    const id = button.dataset.id;
    switch (button.dataset.discovery) {
      case 'category': category=id; limit=12; renderReference(); [...a.main.querySelectorAll('[data-discovery="category"]')].find(b=>b.dataset.id===id)?.focus(); break;
      case 'more-reference': limit+=12; document.querySelector('#reference-results').innerHTML=referenceResults(); document.querySelectorAll('#reference-results [data-discovery]')[limit===24?12:limit-12]?.focus(); break;
      case 'wine': openWine(id); break;
      case 'spirit': openSpirit(id); break;
      case 'family': openFamily(id); break;
      case 'recipe': a.openRecipe(id); break;
      case 'add-wine': {const w=data.wines.find(x=>x.id===id); if(w)a.addInventory(w.name); break;}
      case 'add-spirit': {const x=data.spirits.find(x=>x.id===id); if(x)a.addInventory(x.name); break;}
      case 'food': food=id; pairingKind='wine'; pairingLimit=9; if(a.dialog.open)a.dialog.close(); a.renderView('pairings'); break;
      case 'pairing-kind': pairingKind=id; pairingLimit=9; renderPairings(); [...a.main.querySelectorAll('[data-discovery="pairing-kind"]')].find(b=>b.dataset.id===id)?.focus(); break;
      case 'more-pairings': pairingLimit+=9; document.querySelector('#pairing-results').innerHTML=pairingResults(); document.querySelectorAll('#pairing-results [data-discovery="wine"]')[pairingLimit-9]?.focus(); break;
    }
  }
  function init(bridge) {
    a=bridge;
    a.main.addEventListener('click',click); a.dialog.addEventListener('click',click);
    a.main.addEventListener('input',event=>{
      if(event.target.id==='reference-search'){query=event.target.value;limit=12;document.querySelector('#reference-results').innerHTML=referenceResults();}
      if(event.target.id==='family-search'){familyQuery=event.target.value;document.querySelector('#family-results').innerHTML=familyResults();}
    });
    a.main.addEventListener('change',event=>{if(event.target.id==='pairing-food'){food=event.target.value;pairingLimit=9;renderPairings();document.querySelector('#pairing-food').focus();}});
  }
  return {init,libraryNav,renderSpirits,renderWines,renderReference,renderFamilies,renderPairings,cocktailPairings};
})();

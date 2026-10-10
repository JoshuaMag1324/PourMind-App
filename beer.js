/* Beer styles and commercially named products for US service; works offline. */
'use strict';
globalThis.POURMIND_BEER_UI = (() => {
  const data = POURMIND_BEERS;
  const styles = new Map(data.styles.map(style => [style.id, style]));
  const fold = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9.]+/g, ' ').trim();
  let a, query = '', styleId = 'all', menuOnly = false, stocked = new Set();
  const e = value => a.escapeHTML(value);
  function matches() {
    const search = fold(query);
    const terms = search.split(/\s+/).filter(Boolean);
    const nonAlcoholicSearch = ['na', 'n a', 'non alcoholic', 'alcohol free'].includes(search);
    return data.beers.filter(beer => {
      const style = styles.get(beer.style);
      const haystack = fold([beer.name, beer.brewer, beer.origin, beer.taste, ...beer.aliases, style.name, ...style.aliases].join(' '));
      return (styleId === 'all' || beer.style === styleId) && (!menuOnly || stocked.has(beer.id)) && (nonAlcoholicSearch ? beer.style === 'non-alcoholic' : terms.every(term => haystack.split(/\s+/).some(word => word.startsWith(term))));
    }).sort((x, y) => x.name.localeCompare(y.name));
  }
  function stockButton(beer) {
    return `<button class="beer-stock-button" data-beer="stock" data-id="${e(beer.id)}" aria-pressed="${stocked.has(beer.id)}" aria-label="${stocked.has(beer.id) ? 'Remove' : 'Add'} ${e(beer.name)} ${stocked.has(beer.id) ? 'from' : 'to'} our menu">${a.icon(stocked.has(beer.id) ? 'check' : 'bookmark')}${stocked.has(beer.id) ? 'On our menu' : 'Add to our menu'}</button>`;
  }
  function beerCard(beer) {
    return `<article class="surface reference-card beer-card"><span class="demo-label">${e(styles.get(beer.style).name)}</span><h3>${e(beer.name)}</h3><p class="beer-brewer">${e(beer.brewer)}</p><p>${e(beer.taste)}</p><div class="wine-chips"><span>${e(beer.abv)}% ABV</span><span>${e(beer.origin)}</span></div><div class="beer-card-actions"><button class="button secondary" data-beer="detail" data-id="${e(beer.id)}" aria-label="Service notes for ${e(beer.name)}">Service notes ${a.icon('arrow')}</button>${stockButton(beer)}</div></article>`;
  }
  function selectedStyle() {
    if (styleId !== 'all') return styles.get(styleId);
    const q = fold(query);
    return q ? data.styles.find(style => [style.name, ...style.aliases].some(alias => fold(alias) === q)) : null;
  }
  function renderResults() {
    const beers = matches(), groups = new Map();
    beers.forEach(beer => { if (!groups.has(beer.style)) groups.set(beer.style, []); groups.get(beer.style).push(beer); });
    const style = selectedStyle();
    const intro = style ? `<details class="surface beer-style-summary"><summary>${e(style.name)} · Quick guest guide</summary><div class="beer-style-content"><div><div class="eyebrow">When a guest asks for ${e(style.name)}</div><h2>${e(style.name)}</h2><p>${e(style.taste)}</p></div><blockquote><span>Say it simply</span>${e(style.say)}</blockquote></div></details>` : '';
    document.querySelector('#beer-results').innerHTML = `<p class="reference-count" role="status" aria-live="polite">${beers.length} ${beers.length === 1 ? 'beer' : 'beers'}${menuOnly ? ' on your menu' : ''}${query.trim() ? ` matching “${e(query.trim())}”` : ''}</p>${intro}${beers.length ? [...groups].sort(([x], [y]) => styles.get(x).name.localeCompare(styles.get(y).name)).map(([id, items], index) => `<section class="beer-style-group" aria-labelledby="beer-style-${index}"><div class="spirit-heading"><h2 id="beer-style-${index}">${e(styles.get(id).name)}</h2><span>${items.length} ${items.length === 1 ? 'beer' : 'beers'}</span></div><div class="academy-grid beer-grid">${items.map(beerCard).join('')}</div></section>`).join('') : `<div class="empty-state"><h2>${menuOnly && !stocked.size ? 'Build your beer menu.' : 'No matching beers.'}</h2><p>${menuOnly ? 'Switch to All brands to browse and add the beers your venue stocks.' : 'Try a style such as pilsner, a brewery such as Sierra Nevada, or a flavor such as citrus.'}</p><button class="button" data-beer="reset">${menuOnly ? 'Browse all brands' : 'Clear filters'}</button></div>`}`;
  }
  function render() {
    a.main.innerHTML = a.heading('A quick answer, a confident recommendation', 'Beers.', `${data.beers.length} beers · ${data.styles.length} styles. Find a brand, describe it, and see what’s on your menu.`) + POURMIND_DISCOVERY_UI.libraryNav('beers') + `<section class="surface beer-tools" aria-label="Find a beer"><div class="beer-search-field"><label class="input-label" for="beer-search">Search style, beer, brewery or flavor</label><div class="beer-search"><input class="input" id="beer-search" type="search" placeholder="Try pilsner, Asahi, Guinness or citrus" value="${e(query)}" autocomplete="off"><button class="icon-button" data-beer="clear" aria-label="Clear beer search">${a.icon('close')}</button></div><button class="text-button" data-beer="asian">Explore Asian brands ${a.icon('arrow')}</button></div><div><label class="input-label" for="beer-style">Beer style</label><select class="input" id="beer-style"><option value="all">All styles</option>${[...data.styles].sort((x, y) => x.name.localeCompare(y.name)).map(style => `<option value="${e(style.id)}"${styleId === style.id ? ' selected' : ''}>${e(style.name)}</option>`).join('')}</select></div><div class="beer-menu-filters" role="group" aria-label="Beer menu filter"><button class="filter" data-beer="menu" data-id="all" aria-pressed="${!menuOnly}">All brands</button><button class="filter" data-beer="menu" data-id="stocked" aria-pressed="${menuOnly}">On our menu <span id="beer-menu-count">(${stocked.size})</span></button></div><details class="beer-library-note"><summary>About this beer reference</summary><p>US-focused examples, including imports. Availability varies by distributor and season. ABV is a typical product value; confirm the can, bottle or keg label. Your menu is saved on this device.</p></details></section><section id="beer-results" aria-label="Beer search results"></section>`;
    renderResults();
  }
  function openBeer(id) {
    const beer = data.beers.find(beer => beer.id === id); if (!beer) return;
    const style = styles.get(beer.style);
    const alternatives = data.beers.filter(other => other.style === beer.style && other.id !== beer.id).sort((x, y) => Number(stocked.has(y.id)) - Number(stocked.has(x.id)) || x.name.localeCompare(y.name)).slice(0, 4);
    a.openDialog(`<div class="dialog-body reference-detail"><div class="eyebrow">${e(style.name)} · Beer reference</div><h2 id="dialog-title">${e(beer.name)}</h2><p>${e(beer.brewer)} · ${e(beer.origin)}</p><h3>What it tastes like</h3><p>${e(beer.taste)}</p><div class="beer-guest-line"><h3>Tell your guest</h3><p>${e(style.say)}</p></div><dl class="taste-metrics">${[['Typical strength', `${beer.abv}% ABV`], ['Typical style body', style.body], ['Typical style bitterness', style.bitterness], ['Serving starting point', style.serve]].map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl><h3>Food pairing ideas</h3><p>${e(style.pairing)}.</p><p class="storage-note">Flavor and ABV can vary by market or batch. Check the current label; “non-alcoholic” does not always mean 0.0%. For allergy or ingredient questions, confirm with the brewery or your venue’s product information.</p><div class="actions">${stockButton(beer)}<a class="button secondary" href="${e(beer.url)}" target="_blank" rel="noopener noreferrer">Brewery website</a></div>${alternatives.length ? `<h3>Other ${e(style.name)} brands</h3><div class="related-recipes">${alternatives.map(other => `<button class="related-recipe" data-beer="detail" data-id="${e(other.id)}"><strong>${e(other.name)}</strong><span>${e(other.abv)}% ABV${stocked.has(other.id) ? ' · On our menu' : ''}</span></button>`).join('')}</div>` : ''}</div>`);
  }
  function click(event) {
    const button = event.target.closest('[data-beer]'); if (!button) return;
    const id = button.dataset.id;
    switch (button.dataset.beer) {
      case 'detail': openBeer(id); break;
      case 'stock': {
        if (!data.beers.some(beer => beer.id === id)) return;
        stocked.has(id) ? stocked.delete(id) : stocked.add(id);
        const persisted = a.writeStore('beer-menu', [...stocked]);
        a.toast(persisted ? (stocked.has(id) ? 'Beer added to your menu.' : 'Beer removed from your menu.') : 'Beer menu updated for this visit.');
        document.querySelectorAll(`[data-beer="stock"][data-id="${id}"]`).forEach(el => { el.outerHTML = stockButton(data.beers.find(beer => beer.id === id)); });
        document.querySelector('#beer-menu-count').textContent = `(${stocked.size})`;
        if (menuOnly) renderResults();
        const replacement = (a.dialog.open ? a.dialog : a.main).querySelector(`[data-beer="stock"][data-id="${id}"]`);
        (replacement || document.querySelector('#beer-search'))?.focus();
        break;
      }
      case 'menu': menuOnly = id === 'stocked'; render(); document.querySelector(`[data-beer="menu"][data-id="${id}"]`).focus(); break;
      case 'asian': query = 'asian'; styleId = 'all'; render(); document.querySelector('#beer-search').focus(); break;
      case 'clear': query = ''; document.querySelector('#beer-search').value = ''; renderResults(); document.querySelector('#beer-search').focus(); break;
      case 'reset': query = ''; styleId = 'all'; menuOnly = false; render(); document.querySelector('#beer-search').focus(); break;
    }
  }
  function init(bridge) {
    a = bridge;
    const stored = a.readStore('beer-menu', []);
    stocked = new Set(Array.isArray(stored) ? stored.filter(id => data.beers.some(beer => beer.id === id)) : []);
    a.main.addEventListener('click', click); a.dialog.addEventListener('click', click);
    a.main.addEventListener('input', event => { if (event.target.id === 'beer-search') { query = event.target.value; renderResults(); } });
    a.main.addEventListener('change', event => { if (event.target.id === 'beer-style') { styleId = event.target.value; renderResults(); } });
  }
  return {init, render};
})();

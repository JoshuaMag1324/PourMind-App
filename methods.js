'use strict';
function detailedMethod(drink) {
  return POURMIND_DATA.recipeDetails[drink[0]].steps;
}
function recipeFlavorIngredients(drink) {
  return new Set(drink[2].split(' • ').map(ingredient => ingredient
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/^.*?\b(?:oz|ml|dash(?:es)?|drops?|tsp|tbsp|barspoons?|leaves?|slices?|pieces?|cubes?)\b\s*/, '')
    .replace(/\b(?:freshly brewed|fresh|pasteurized|chilled|optional|to top|for topping)\b/g, '')
    .replace(/\s+/g, ' ').trim()
    .replace(/^(?:cointreau|triple sec|dry curacao|orange curacao|grand marnier)$/, 'orange liqueur')
    .replace(/^(?:sugar syrup|sugar|white sugar|superfine sugar)$/, 'simple syrup')
    .replace(/^(?:red vermouth|sweet red vermouth)$/, 'sweet vermouth')
    .replace(/^lime$/, 'lime juice').replace(/^lemon$/, 'lemon juice'))
    .filter(ingredient => ingredient && !/\b(?:gin|vodka|tequila|mezcal|rum|bourbon|rye|whisk[e]?y|scotch|cognac|brandy|pisco|cachaca|grappa)\b/.test(ingredient)
      && !/^(?:ice|water|soda water|club soda|sparkling water)$/.test(ingredient)));
}
function relatedRecipeMatches(name) {
  const source = POURMIND_DATA.drinks.find(drink => drink[0] === name);
  if (!source) return [];
  const detail = POURMIND_DATA.recipeDetails[name], ingredients = recipeFlavorIngredients(source);
  const broadFamilies = new Set(['Sour', 'Highball', 'Tiki', 'Fizz']);
  return POURMIND_DATA.drinks.filter(drink => drink[0] !== name).map(drink => {
    const candidate = POURMIND_DATA.recipeDetails[drink[0]];
    const flavors = recipeFlavorIngredients(drink);
    const shared = [...ingredients].filter(ingredient => flavors.has(ingredient));
    const sameFamily = detail.family === candidate.family;
    const sameSpirit = detail.spirits.some(spirit => candidate.spirits.includes(spirit));
    // A spirit or a generic family alone is not a useful recommendation.
    const closeVariation = sameFamily && !broadFamilies.has(detail.family) && shared.some(i => !/^(?:simple syrup|orange bitters|angostura bitters|egg white)$/.test(i));
    const distinctive = shared.some(i => !/^(?:lime juice|lemon juice|simple syrup|egg white|orange bitters|angostura bitters)$/.test(i));
    const closeIngredients = shared.length >= 2 && ((sameFamily && (sameSpirit || shared.length >= 3)) || distinctive);
    const signatureMatch = sameSpirit && shared.some(i => /^(?:coffee liqueur|espresso|creme de cacao|creme de cassis|ginger beer|absinthe)$/.test(i));
    if (!closeVariation && !closeIngredients && !signatureMatch) return null;
    const overlap = shared.length / new Set([...ingredients, ...flavors]).size;
    const score = overlap * 10 + (sameFamily ? 4 : 0) + (sameSpirit ? 5 : 0) + shared.length;
    const reason = shared.length >= 2 ? `Shares ${shared.slice(0, 3).join(', ')}` : `${sameFamily ? `Same ${detail.family} style` : `Same base spirit`} · shares ${shared[0]}`;
    return {name: drink[0], reason, score};
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 4);
}
function relatedRecipes(name) {
  return relatedRecipeMatches(name).map(match => match.name);
}

'use strict';
function detailedMethod(drink) {
  return POURMIND_DATA.recipeDetails[drink[0]].steps;
}
function relatedRecipes(name) {
  const family = POURMIND_DATA.recipeDetails[name].family;
  return POURMIND_DATA.drinks.filter(drink => drink[0] !== name &&
    POURMIND_DATA.recipeDetails[drink[0]].family === family).map(drink => drink[0]);
}

# Beer service reference

The starter catalogue contains 232 named commercial beer products across 26 service categories, each with at least eight products, including 28 Asian-brand products, focused on US menus and common imports. It is a curated reference, not an exhaustive catalogue or a live distributor/venue stock feed.

Edit `catalogue.json`, then run `python3 tools/build_beers.py`. Each product has its own identity, style, typical ABV, brewery, flavor note, origin and official brewery website. Product names, ABV, production locations and distribution can change; verify the current product label and brewery information when updating records. Source links are brewery references, not assertions of live stock. Style descriptions and guest language are general guidance rather than exact descriptions of every product.

Category choices distinguish pilsner from generic pale/light lager, witbier from German wheat beer, hazy/double IPA from regular IPA, and non-alcoholic versions from alcoholic products. Fat Tire uses the newer golden/blonde-ale classification. Non-alcoholic labels retain `<0.5` versus `0.0` distinctions; do not infer zero alcohol, allergens or gluten claims from style alone. Seasonal and limited distribution are called out where known, including Spotted Cow's Wisconsin-only distribution.

The “On our menu” selections are explicitly set by the user and stored locally as `pourmind:beer-menu`. They do not change cocktail ingredients, synchronize across devices or imply verified venue stock.

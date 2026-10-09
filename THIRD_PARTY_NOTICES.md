# Cocktail reference and artwork credits

PourMind specifies one serving for each named cocktail. Regional and house versions vary; the serving notes describe the version in this catalogue. Ingredients, quantities and methods were reviewed rather than copied wholesale from a single source. Reference links are provided in recipe details when available.

Published recipe/photo records were checked against the following pinned repositories:

- Bar Assistant data: https://github.com/bar-assistant/data/tree/5a504d474614494119882eb91a8ffdc5491a483f
- Open Drinks: https://github.com/alfg/opendrinks/tree/f446f0e9356b9b43155d207b4f7c5214d9da91ab

Their software/data license notices are retained in `recipes/bar-assistant-LICENSE.txt` and `recipes/opendrinks-LICENSE.txt`. Photographs retain the original photographer/publisher credits recorded by those datasets. These credits are displayed with each recipe and retained in `recipes/photo-map.json`; a dataset software license should not be read as a claim that PourMind owns third-party photographs.

The photo map records the source recipe, repository revision, image path and SHA-256 for each asset. Explicitly labelled recipe-family photographs are shared for visually equivalent variants; this does not imply the photographed drink used the alternative base spirit or exact ratio. Generated and original PourMind artwork is labelled as an illustration.

## Private label reading

Bottle-label OCR uses Tesseract.js 5.1.1 and tesseract.js-core 5.1.1 (Apache License 2.0), with the English LSTM model distributed by @tesseract.js-data/eng 1.0.0 (MIT distribution notice). The compiled main and worker distributions include their dependency notices. Exact source URLs and SHA-256 hashes are retained in `vendor/ocr/sources.json`; licenses and notices are beside those files. The English traineddata derives from Tesseract’s Apache-licensed tessdata; see https://github.com/tesseract-ocr/tessdata and https://github.com/tesseract-ocr/tessdata/blob/main/LICENSE.

Runtime code and model files are bundled with the app. Photos and extracted label text are processed on the device and are not uploaded or stored. Only user-confirmed names enter the private inventory.

## IBA catalogue expansion

All six pages of https://iba-world.com/cocktails/all-cocktails/ were reviewed for this expansion. The 102 listed names map to 102 existing or added recipes in `recipes/iba-coverage.json`; 57 recipes were added. New quantities follow the linked IBA pages, with preparation steps rewritten for PourMind. Existing recipes retain their specified servings. Typographic variants and established alternate names map to one recipe. Six new entries use explicitly labelled family reference images where a named photograph was unavailable in the pinned datasets.

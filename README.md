# PourMind

A responsive cocktail learning app with 143 recipes, 15 cocktail teaching families, food pairings and a 244-entry wine reference. The redesigned app starts at `index.html`; the original upload remains unchanged in `PourMind_v6_Audited_Test.html`.

## Develop

Use the existing checkout at `/workspace/PourMind-App`. Each cloud task is already isolated; no additional Git worktree is needed.

No dependency installation or build is required. From this folder, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory /workspace/PourMind-App
```

The server process needs to be started again in each new task. The files are retained separately from running processes.

- `index.html`: page shell
- `styles.css`: responsive visual design
- `app.js`: navigation, search, favorites, inventory, dialogs, and quiz
- `data.js`: generated catalogue of measured recipes and named local images
- `methods.js`: cocktail-specific methods and related recipe families
- `learning.js`: 30 educational questions across five topics
- `academy-data.js` and `academy.js`: lessons, guided recipes, journal and private recipe-file sharing
- `discovery-data.js` and `discovery.js`: wine/spirits reference, cocktail families and food pairings

Saved recipes, ingredients, and training progress are stored in this browser's local storage. There is no backend or account sync. Scan My Bar reads text from bottle-label photos on-device and requires review before adding items. It does not identify unlabeled objects by appearance. The inspiration flow searches existing recipes.

## Validation in the cloud environment

With the local server running:

```sh
node --check app.js
node tests/catalogue.test.cjs
node tests/learning.test.cjs
node tests/academy.test.cjs
node tests/discovery.test.cjs
```

The browser suites use the environment's existing Playwright package and `/usr/bin/chromium`. Set `POURMIND_TEST_URL` to use a different local port. Checks cover education, recipe-file sharing, reference search, pairings, persistence, offline use and phone/tablet/desktop layouts.

The GitHub repository was empty when this upload was imported. This source includes the preserved original prototype and the redesigned mobile web app. The published iPhone app is at https://joshuamag1324.github.io/PourMind-App/.

## Mobile builds

PourMind includes an iPhone Home Screen web app manifest, app icons, safe-area layout, installation help, and a service worker that retains its recipes and application files for offline use after the first successful load. HTTPS is required for installation and offline use on a phone.

Build the downloadable test package and self-contained HTML version:

```sh
python3 tools/build_mobile.py
```

See [phone testing instructions](tools/PHONE_TESTING.md) for Safari installation and testing on the same Wi-Fi. Packaging uses Python's standard library; no install or build dependency is required. The supplied app icons are retained source assets.

## Editing recipes and photos

Edit `recipes/catalogue.txt` and `recipes/photo-map.json`, then run `python3 tools/build_catalogue.py` and `node tests/catalogue.test.cjs`. Each of the 143 drinks has measured ingredients, explicit steps, serving notes and a named image. The compiler checks missing/duplicate pairs and image checksums, and writes `data.js` plus the offline photo manifest. See `THIRD_PARTY_NOTICES.md` for source credits. Rebuild the mobile package after changes. Increment the service worker cache revision when publishing a new catalogue.

## Learning practice

Learn includes five six-question topics and ten-question mixed rounds. Every response includes an explanation; learners can retry incorrect answers before continuing. Correct answers save immediately on this device, and repeated answers do not inflate progress. Mixed practice prioritizes unfinished questions. Completion of the original quiz credits its three original questions.

With the local server on port 8000, run `node tests/learning.test.cjs`. Set `POURMIND_TEST_URL` to test another local or published HTTPS address. The browser test checks all 30 questions, topic and mixed rounds, explanations, retry behavior, persistence, legacy progress, offline access and mobile layouts. It uses the environment’s installed Playwright and Chromium.

## Education and private recipe sharing

The approved education update includes eight short lessons, twelve guided recipes with an explanation for each preparation step, four practical exercises, a private learning journal and five learning stages. Learn includes a separate Knowledge checks tab for the existing 30 questions. Completion and resume positions persist on the device.

Share supports private recipe drafts, optional photo uploads, measured-ingredient validation, teaching notes, recipe-file export/import and returned feedback merging. This is the private file-sharing version selected by the user; it has no public feed or accounts. Files are exchanged by users. Imported creator names and feedback are supplied by the file, not verified identities.

Run `node tests/academy.test.cjs` and `node tests/learning.test.cjs` with the local server on port 8000. The first suite exercises every lesson and guide, practice journaling, photo ownership confirmation, the full two-device file-sharing cycle, input validation, offline state and mobile layouts.

See [the app walkthrough](REVIEW.md). The education update was approved and published.

## Wine, spirits, families and food pairings

The Library tab groups Cocktails, Spirits, Wines, Cocktail families and Food pairings. My Bar contains only the user’s entered or confirmed inventory. The reference includes 118 white, 110 red, four rosé, five sparkling and seven fortified entries (grape varieties and named regional styles, not individual producers). Each has tasting notes, body, acidity, sweetness, tannin, serving temperature and food ideas. Six distilled-spirit categories include named styles and linked cocktail examples.

Wine search covers names, aliases, regions and flavors, including accent-insensitive matching and the common Riesling misspelling “resling.” Results are paginated. Wine and spirit detail panels can add bottles to the existing private inventory without duplicates.

Fifteen teaching families cover all 143 recipes exactly once. Family patterns explain structure, taste, method and thoughtful variations, with links to the measured recipes and corresponding images. Fifteen food groups offer wine and cocktail suggestions with reasons. Preparation, sauce, sweetness and alcohol matter; suggestions are starting points.

Tasting descriptions are original educational summaries of typical styles, not bottle-specific evaluations or a claim to list every grape worldwide. Variations such as dry versus sweet Riesling, rosé White Zinfandel and dry Sherry are labelled.

Edit `reference/white-wines.txt`, `reference/red-wines.txt`, `reference/wine-styles.txt` or `reference/knowledge.json`, then run `python3 tools/build_reference.py`. The compiler checks IDs, references, profile overrides and exact family coverage before generating `discovery-data.js`. Rebuild the mobile package and increment the service-worker cache revision when publishing.

After building the mobile package, run `node tests/discovery-standalone.test.cjs` to check the self-contained HTML build, embedded recipe images, offline reference and storage fallback without any external requests.

## Opening the latest wine library

The home screen includes Wine library, and Library → Wines groups the wine reference alongside Cocktails and Spirits. `#wines` opens the reference with all wines selected. For an older installed app that still serves cached screens, open https://joshuamag1324.github.io/PourMind-App/wines.html. This online entry checks `release.json`, replaces only downloaded PourMind application files and registrations, then opens the latest wine screen. Favorites, inventory, quiz progress, academy progress and private drafts stay in local storage. A failed online release check leaves the existing offline files intact.

Run `node tests/wine-access.test.cjs` to reproduce the previously published education build’s stale-cache behavior and verify recovery and data retention. This test serves an isolated local fixture and uses the approved education commit from repository history.

## Share the app for testing

Share https://joshuamag1324.github.io/PourMind-App/try.html. It offers the live app for computers and phones, and a portable PC/Mac download at `downloads/PourMind-Try-It.zip`. Extract the ZIP, then open `PourMind.html` in Edge or Chrome. This self-contained file includes all scripts, styling and recipe photographs; it requires no server, Python installation or internet connection. It includes instructions and third-party credits.

`python3 tools/build_mobile.py` produces the portable ZIP as well as the mobile hosting package and standalone HTML. The file and live site use separate browser storage. Sharing the package shares the app content; it does not include the sender’s private drafts, inventory or progress.

Run `node tests/portable.test.cjs` after packaging. It extracts the actual ZIP and checks its embedded document, wines, images, lessons and recipe-file export without network requests. It attempts a local-file launch first; when cloud browser policy blocks file URLs, it reports that restriction and tests the document in the inline renderer instead. Local-file persistence is checked when the browser permits that mode.

## My Bar and private label scanning

My Bar contains only private inventory, manual entry and Scan My Bar. It has no sample-bottle button, wine promotion or catalogue sections. Existing stored inventory remains intact. The Library primary tab owns Cocktails, Spirits, Wines, Families and Pairings; all those sections highlight Library in the main navigation.

Choose a photo or capture one on a phone. The scanner limits photos to 20 MB, accepts JPEG/PNG/WebP, scales large images and reads label text using the bundled Tesseract worker and English LSTM model. It matches familiar spirit/ingredient names and wine varieties, then shows editable, selectable suggestions. Nothing is saved until the user confirms. Duplicate inventory names are skipped. Unknown items can be typed into the review. Photos and OCR text are not uploaded or persisted. Closing the dialog cancels the result and terminates its worker.

The hosted app precaches all OCR resources for offline use. The portable build embeds the worker, core and compressed model and exposes them as temporary Blob URLs, so scanning requires no external requests even in the self-contained document. The English reader works best with clear printed labels. Dark, curved, small, obstructed or non-English text can need correction; it does not recognize unlabelled objects by appearance.

Run `node tests/scanner.test.cjs` (set `POURMIND_TEST_URL` for the local server) to check real OCR, unchanged inventory before confirmation, exclusions, editing, duplicates, persistence, cancellation, invalid files and layouts. Run `node tests/scanner-standalone.test.cjs` after packaging for actual OCR with embedded assets and zero external requests. The test image is an original controlled-label fixture; it does not establish accuracy for every real bar photo.

## IBA catalogue coverage

The six-page IBA listing is represented by 102 canonical recipes within the 143-recipe catalogue. The expansion adds 57 cocktails while keeping existing recipes and variations. `recipes/iba-coverage.json` maps IBA names to existing names, including Alexander → Brandy Alexander and Hemingway Special → Hemingway Daiquiri. Alternate names are searchable. The catalogue compiler rejects names that differ only in accents, punctuation, spacing or case.

New recipes retain the IBA millilitre measures and use the same cards, detail panels, serving notes, source links and favorites as the original catalogue. All 102 IBA entries have unique original photorealistic illustrations generated for PourMind. They follow the cocktail serving specifications and are labelled as AI-generated artwork in recipe details. Base filters include pisco, cachaça, mezcal, grappa, wine and liqueur. All recipes are linked to one of the existing 15 teaching families.

With the local server running, `node tests/iba.test.cjs` checks IBA coverage, name searches, artwork, filters, responsive detail panels and offline new recipes.

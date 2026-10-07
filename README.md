# PourMind

A responsive cocktail prototype with 86 recipes and local cocktail artwork. The redesigned app starts at `index.html`; the original upload remains unchanged in `PourMind_v6_Audited_Test.html`.

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

Saved recipes, ingredients, and training progress are stored in this browser's local storage. There is no backend or account sync. The scan flow adds sample inventory, and the inspiration flow searches existing recipes; camera recognition and AI generation are not connected.

## Validation in the cloud environment

With the local server running:

```sh
node --check app.js
node /workspace/scratch/pourmind-smoke.cjs
```

The smoke check uses the environment's existing Playwright package and `/usr/bin/chromium`. It exercises recipe search, image loading, filters, favorites persistence, inventory editing, training, dialog keyboard controls, and phone/tablet/desktop layouts. It writes screenshots to `/workspace/scratch/`.

The GitHub repository was empty when this upload was imported. This source includes the preserved original prototype and the redesigned mobile web app. Deployment serves the application at the repository's GitHub Pages site once Pages has been enabled.

## Mobile builds

PourMind includes an iPhone Home Screen web app manifest, app icons, safe-area layout, installation help, and a service worker that retains its recipes and application files for offline use after the first successful load. HTTPS is required for installation and offline use on a phone.

Build the downloadable test package and self-contained HTML version:

```sh
python3 tools/build_mobile.py
```

See [phone testing instructions](tools/PHONE_TESTING.md) for Safari installation and testing on the same Wi-Fi. Packaging uses Python's standard library; no install or build dependency is required. The supplied app icons are retained source assets.

## Editing recipes and photos

Edit `recipes/catalogue.txt` and `recipes/photo-map.json`, then run `python3 tools/build_catalogue.py` and `node tests/catalogue.test.cjs`. Each of the 86 drinks has measured ingredients, explicit steps, serving notes and a named image. The compiler checks missing/duplicate pairs and image checksums, and writes `data.js` plus the offline photo manifest. See `THIRD_PARTY_NOTICES.md` for source credits. Rebuild the mobile package after changes. Increment the service worker cache revision when publishing a new catalogue.

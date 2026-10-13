# PourMind launch review — 2.5.3

Reviewed October 13, 2026. The web app contains 143 unique cocktail recipes (all 102 IBA entries covered), 244 wine profiles and 232 beers across 26 styles.

## Fixes

- Saved recipes use separate search and spirit filters, so searching the library cannot hide favorites. Returning to the library retains its own search.
- Section URLs update during navigation. Refresh stays in the section; browser Back and Forward restore it and dismiss an open dialog when leaving.
- Keyboard focus indicators cover dropdowns, text areas and expandable summaries.
- Download-page version and beer information match the release. Documentation reflects Families and the food-first pairing tool under Learn.
- Both downloadable packages were rebuilt; versioned assets and the service-worker cache were updated.

## Verification

Two passes exercised fresh and returning user flows, with targeted regression checks after fixes. Catalogue, recipe accuracy, related cocktails, artwork, IBA coverage, learning, academy, discovery, beer, scanner, update recovery, wine access, portable app, standalone discovery, standalone scanner and navigation suites passed.

Checks included:

- Desktop, tablet and phone layouts at 320, 390, 768 and 1440 pixels.
- Searches, spirit/style filters, favorites, local inventory, beer menu, drink detail panels and food pairing ideas in all 143 cocktails.
- Every lesson and guided recipe, quiz explanations, journal entries, draft validation, photo upload and recipe-file exchange.
- Actual on-device OCR from a fixture photo while offline, followed by review edits, exclusions, duplicate prevention and confirmation. Cancellation and invalid-photo handling preserved inventory.
- Offline recipes, photos, reference content, learning and saved data; stale-cache recovery retained local data and failed online checks retained offline files.
- Rebuilt downloadable ZIP, embedded photos and scanner with no external requests in the standalone renderer.
- Automated axe-core checks on ten primary/reference screens and a cocktail dialog: no violations of the checked WCAG 2 A/AA and 2.1 AA rules. This is an automated check, not accessibility certification.

## Before a wider public launch

A physical iPhone/Safari pass is still required for Home Screen installation, the camera picker, safe areas, storage retention and a real airplane-mode restart. The cloud tests used Chromium and mobile viewport emulation; they do not establish Safari compatibility. Cloud browser policy blocked direct file URLs, so the extracted portable document was tested in the inline renderer; direct desktop file launching should be checked on a user's PC/Mac.

This remains a device-local web app: no accounts, cross-device inventory sync or public recipe feed. Beer availability and ABV must be checked against current distributor/label information. Cocktail amounts use the requested whole/half-ounce rounding and may differ from exact IBA ratios.

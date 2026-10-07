# Test PourMind on your iPhone

This is an installable mobile web app, not an App Store or TestFlight build.

## Install on your Home Screen

The hosted app is https://joshuamag1324.github.io/PourMind-App/. Open it directly in Safari. To host a separate test copy:

1. Extract `PourMind-iPhone-Test.zip` on a computer.
2. Publish the included `web` folder using your static HTTPS hosting service. A simple option is Netlify Drop at https://app.netlify.com/drop; sign in if prompted and drop the `web` folder into its upload area. Use the generated HTTPS site address, not the ZIP download address.
3. Open that HTTPS address in Safari on your iPhone.
4. Tap Share, then Add to Home Screen. If Safari shows an Open as Web App switch, turn it on. Tap Add.
5. Open PourMind from its new icon. Keep it open until the footer says **Ready for offline use**. You can then switch to airplane mode and reopen it.

Hosting the `web` folder serves the application files; private bar entries and saved recipes stay in the phone's browser storage. After a catalogue update, reopen the app while online, allow the update to download, and refresh once more. Do not clear website data if you want to retain saved favorites.

## Test in Safari without deploying

You need a computer with Python 3 and your iPhone on the same Wi-Fi.

1. On Windows, run `Start-Windows.bat`. On macOS, open Terminal in the extracted folder and run `python3 start_testing.py`. On Linux, use the same command.
2. Keep the terminal open. It prints your computer's local-network address.
3. Type that address into Safari on your iPhone.

This HTTP mode supports browsing and device-local saving. Installation and service-worker offline access need HTTPS. If the phone cannot connect, confirm both devices are on the same network and that the computer permits the Python server through its firewall.

## Things to try

- **Recipes:** search for `lime`, filter by Gin, and open a recipe.
- **Favorites:** save Negroni, open Saved, then close and reopen the app.
- **My bar:** add `Gin`, add sample ingredients, remove an ingredient, and reopen the app.
- **Learn:** finish all three quiz questions. Try an incorrect answer first.
- **Inspiration:** search for `tequila` and open one of the suggested recipes.
- **Offline:** after the HTTPS app reports ready, enable airplane mode and reload. Browse recipes and add a favorite.

Your data is saved per site and browser. A different address, private browsing session, clearing website data, or uninstalling may result in a separate or empty collection. This build has no account or cloud sync. Camera recognition and AI generation remain demos; the app does not request camera access or call an AI service.

The separate `PourMind-Mobile.html` download is a self-contained browser test file. It works in browsers that allow local HTML execution. iPhone Files may show only a document preview, so use Safari with the hosted or local-network app for reliable iPhone testing.

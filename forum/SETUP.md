# Activate the in-app Community

Community is built into the existing PourMind app. It does not use a separate forum website. The existing GitHub Pages site cannot store shared posts or authenticate users; Supabase supplies those services.

1. Create a Supabase project owned by the app owner. Run `forum/schema.sql` in its SQL editor.
2. Enable email/password authentication. Keep email confirmation enabled. Configure production email delivery before opening registration broadly.
3. In Auth → URL Configuration set Site URL to `https://joshuamag1324.github.io/PourMind-App/` and allow the same URL as a redirect. Add a localhost redirect only for development.
4. Copy the project URL and **publishable key** into `forum-config.js`. They are public browser settings. Never use a secret or service-role key.
5. Create the owner's account through the app, confirm its email, and find its UUID in Supabase Auth → Users. Give that account moderation access through the SQL editor:
   ```sql
   insert into forum_private.moderators(user_id) values ('OWNER-USER-UUID');
   ```
6. Test with two real accounts: post, review, edit, delete, report, moderate, sign out and read anonymously. Confirm that email links return to the app. Publish the configured app and refresh its service-worker cache version.

Anyone can read public recipes. Confirmed signed-in users can post and review. Private drafts stay on the device and are never uploaded automatically. Published display names and recipe text are public; emails and authentication records are not returned by the forum API.

Database access is restricted to explicit RPCs. Ownership checks run on the server, direct table access is denied, and moderator privileges are assigned by the owner. Each user can review a recipe once and cannot review their own recipe. Recipe edits create a new version; earlier reviews remain visible with a label but do not contribute to the current rating. Authors cannot restore moderator-hidden recipes. Reports are visible only to assigned moderators.

The first release supports text recipes, not public photo uploads. Owner-managed Supabase backups, email delivery and monitoring remain deployment tasks. If project settings are blank, Community honestly shows that the service is not connected; it never substitutes device-local data for a shared forum.

References: [Supabase browser keys](https://supabase.com/docs/guides/getting-started/api-keys), [database functions](https://supabase.com/docs/guides/database/functions), [email authentication](https://supabase.com/docs/guides/auth/passwords).

## Verification

Use a disposable local PostgreSQL database only. `tests/forum-database.test.cjs` creates test Auth roles/users and applies the production schema; it intentionally requires a fresh database. Install `pg` and `playwright` in a separate test environment, then run:

```sh
FORUM_TEST_DATABASE=postgres://postgres@127.0.0.1:54329/fresh_test_database node tests/forum-database.test.cjs
FORUM_TEST_DATABASE=postgres://postgres@127.0.0.1:54329/fresh_test_database node tests/forum.test.cjs
```

The browser test expects the static app at `http://127.0.0.1:8000` and opens a loopback-only API fixture at port 8024. Its fixed accounts are test fixtures; production uses Supabase Auth. It verifies two-account posting/reviewing, server ownership, safe text, separate private drafts, and widths 320, 390, 768 and 1440. Screenshots are written to `/workspace/work/` for inspection. Never deploy the test fixture.

Live release is deliberately pending project connection. Before releasing, increment the app version and service-worker cache identifier, rebuild downloadable packages and replace their shipped copies so existing installations receive Community consistently.

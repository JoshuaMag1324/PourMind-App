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

Shared-service activation is pending project connection. Version 2.8.0 includes an explicitly labeled, browser-local demo at `?community-demo=1#community`, also available using Community → Try community demo. It uses a separate storage key, never sends demo content to Supabase, and never imports private drafts. Use Switch test user to post as one pretend person and review as another. Reset demo clears only demo changes.

Before activating the shared service, increment the app version and service-worker cache identifier, rebuild downloadable packages and replace their shipped copies so existing installations receive the configuration consistently.

## Account and moderation upgrade (2.9.0)

For a new project, run the current `forum/schema.sql`. For an existing 2.8.0 project, run `forum/migrations/002-account-moderation.sql` instead. Both run in a transaction; the upgrade preserves recipes, accounts and existing reports and can be rerun. Take an owner-managed backup before a production migration. Install the SQL upgrade before publishing the matching frontend.

The upgrade adds:

- Account & safety: blocked members, unblock, current-password verification before password changes, deletion initiation, support history and appeals.
- Reports for both recipes and reviews. Reporting is private; 20 reports/hour per member, five support requests/day.
- Moderator-only content inspection, remove/restore, suspend/reinstate, decisions with explanations, and private support replies. Moderators must be assigned explicitly by the owner. Users cannot grant themselves this role.
- Server-side filtering of new/edited recipes, reviews and display names. Flagged content is visible only to its author and moderators and excluded from ratings. The built-in phrase/link rules are a starting filter, not an exhaustive abuse classifier. Moderators must monitor the queue and update `forum_private.content_rules` through the SQL editor as needed. No third-party content scanner is configured.
- Removing content survives author edits. Suspensions hide authored content and prevent new contributions; appeals and account deletion remain available. Blocking hides an author's content for the blocker, removes their reviews from that viewer's rating, and prevents reviewing across a block in either direction. Public content is still readable when signed out.

### Secure account deletion

Deploy `supabase/functions/delete-account/` to the same Supabase project. With the owner authenticated to the Supabase CLI, from the repository root:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy delete-account
```

The committed `supabase/config.toml` disables only the gateway JWT check for this function. The function itself validates the bearer token through Supabase Auth, rechecks the current password, requires the exact confirmation `DELETE`, and derives the target user exclusively from the authenticated identity. It then calls Auth Admin hard deletion. It never accepts a caller-specified deletion target.

Hosted functions supply the project URL and server-side keys. The handler prefers `SUPABASE_PUBLISHABLE_KEYS.default` and `SUPABASE_SECRET_KEYS.default`, falling back to the legacy `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` where provided. These secret values belong only in Supabase's function environment; never put a privileged key in `forum-config.js`, GitHub Pages, a downloadable build, or chat. Custom `ALLOWED_ORIGINS` is a comma-separated list of exact browser origins; the default is `https://joshuamag1324.github.io`. Add `http://127.0.0.1:8000` only for local development. The future native app's origin must also be configured when packaging iOS.

This release supports email/password accounts. MFA-enabled or non-password accounts deliberately fail closed rather than bypass additional identity verification; add their verified deletion flow before enabling those account types. Test real confirmation, password-reset email delivery and account deletion against the deployed project before opening registrations.

Hard deletion cascades through recipes, reviews, blocks, suspensions, moderator membership and the user's support requests/reports. Content-linked reports and moderation logs are removed with the deleted content. It leaves private device data intact. Expired/deleted-user sessions cannot create new contributions even if an old JWT has not yet expired. Database backups and provider operational logs follow the owner's/provider's retention policy; this action does not erase those backups instantly.

### Operating the community

Fill `supportEmail` in `forum-config.js` with a real, monitored public contact before App Store submission. Signed-in users can already send private support requests and receive replies in Account & safety. Keep someone responsible for checking reports/support promptly and handling appeals. Set public privacy/retention policies before launching real accounts. The demo's Moderator (demo) is a local test identity and never grants production privileges.

Additional checks:

```sh
# After the baseline database test, against that same disposable database:
node tests/forum-safety-database.test.cjs
node tests/account-deletion.test.mjs
node tests/forum-safety.test.cjs
# Against another fresh disposable database:
node tests/forum-upgrade.test.cjs
```

Database tests exercise block isolation, report/support privacy, review removal/restore, filtering, suspensions and reinstatement, migration reruns and deletion cascades. The browser test exercises the same controls through the demo, including private-data preservation. `tests/forum.test.cjs` also runs the production deletion handler with a local Auth fixture against real Postgres; it does not replace a final hosted Supabase verification.

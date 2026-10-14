Supabase JavaScript SDK 2.117.3, locally bundled with esbuild for the browser.
Source: https://github.com/supabase/supabase-js
License: MIT (LICENSE). Dependency licenses are collected in THIRD_PARTY_NOTICES.txt.

Rebuild from pinned npm dependencies outside this repository:
`esbuild @supabase/supabase-js --bundle --minify --format=iife --global-name=POURMIND_SUPABASE --platform=browser --target=es2020 --outfile=vendor/supabase/supabase.js`

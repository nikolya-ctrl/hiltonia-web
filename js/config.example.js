// Copy this file to js/config.js and fill in your real values.
// js/config.js is gitignored — the anon key is safe to expose in a browser
// (it's protected by the RLS policies in supabase/schema.sql), but keeping
// this file out of git means you don't accidentally commit environment-
// specific URLs (e.g. a local vs. production backend).
window.HILTONIA_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_ANON_KEY',
  BACKEND_URL: 'http://localhost:4000',
};

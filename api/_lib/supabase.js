const { createClient } = require('@supabase/supabase-js');

let client = null;

/**
 * Lazily creates a singleton Supabase client using the SERVICE ROLE key.
 * This key bypasses Row Level Security, so it must only ever be used
 * server-side (inside /api functions) — never sent to the browser.
 */
function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

module.exports = { getSupabase };

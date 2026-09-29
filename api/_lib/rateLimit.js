const { getSupabase } = require('./supabase');

/**
 * Fixed-window rate limiter backed by a Supabase table (see
 * supabase/schema.sql → rate_limits). Deliberately avoids adding a second
 * free-tier service (e.g. Upstash Redis) since Postgres upserts are already
 * atomic and we already require Supabase for booking storage.
 *
 * @param {string} bucket   logical name of the endpoint, e.g. 'book'
 * @param {string} ip       client IP
 * @param {number} limit    max requests allowed per window
 * @param {number} windowSeconds  window size in seconds
 * @returns {Promise<{allowed: boolean, remaining: number}>}
 */
async function checkRateLimit(bucket, ip, limit, windowSeconds) {
  const supabase = getSupabase();
  const windowStartMs = Math.floor(Date.now() / (windowSeconds * 1000)) * (windowSeconds * 1000);
  const key = `${bucket}:${ip}:${windowStartMs}`;

  // Atomic upsert-increment via a Postgres RPC (see supabase/schema.sql).
  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_key: key,
    p_window_start: new Date(windowStartMs).toISOString(),
  });

  if (error) {
    // Fail-open on infra errors so a DB hiccup doesn't take the whole site
    // down, but log loudly so it's visible in Vercel function logs.
    console.error('Rate limit check failed, failing open:', error.message);
    return { allowed: true, remaining: limit };
  }

  const count = data;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

module.exports = { checkRateLimit };

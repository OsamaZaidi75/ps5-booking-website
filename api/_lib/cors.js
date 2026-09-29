/**
 * Restricts CORS to a single configured origin (PUBLIC_SITE_URL) and applies
 * the response headers every API route should send. Call this first in
 * every handler; it returns `true` if the request was a preflight OPTIONS
 * request that has already been fully handled (caller should return early).
 */
function applyCors(req, res) {
  const allowedOrigin = process.env.PUBLIC_SITE_URL || '';
  const origin = req.headers.origin || '';

  // In local dev (vercel dev) PUBLIC_SITE_URL is usually localhost; only
  // echo the origin back when it matches exactly — never use '*'.
  if (allowedOrigin && origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

module.exports = { applyCors, getClientIp };

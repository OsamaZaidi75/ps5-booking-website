const crypto = require('crypto');
const hmac = require('./hmac');

const COOKIE_NAME = 'ps5_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

/**
 * Constant-time password comparison to avoid timing side-channels on
 * /api/admin/login. Pads both sides to the longer length before comparing
 * so the byte-length itself doesn't leak via timingSafeEqual throwing.
 */
function passwordsMatch(candidate, expected) {
  const a = Buffer.from(String(candidate || ''));
  const b = Buffer.from(String(expected || ''));
  const len = Math.max(a.length, b.length, 1);
  const aPadded = Buffer.concat([a], len);
  const bPadded = Buffer.concat([b], len);
  return a.length === b.length && crypto.timingSafeEqual(aPadded, bPadded);
}

function createSessionCookie() {
  const secret = requireSecret();
  const token = hmac.sign({ role: 'admin' }, secret, SESSION_TTL_SECONDS);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

function isAdminRequest(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return false;
  const token = match.slice(COOKIE_NAME.length + 1);
  const secret = requireSecret();
  const payload = hmac.verify(token, secret);
  return !!payload && payload.role === 'admin';
}

function requireSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('Missing ADMIN_SESSION_SECRET env var');
  return secret;
}

module.exports = { passwordsMatch, createSessionCookie, clearSessionCookie, isAdminRequest };

const { applyCors, getClientIp } = require('../_lib/cors');
const { checkRateLimit } = require('../_lib/rateLimit');
const { passwordsMatch, createSessionCookie } = require('../_lib/auth');

const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60;

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  try {
    const { allowed } = await checkRateLimit('admin-login', ip, RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (!allowed) {
      res.status(429).json({ error: 'Too many login attempts. Please try again in a minute.' });
      return;
    }
  } catch (err) {
    console.error('Rate limit error:', err.message);
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD env var not set');
    res.status(500).json({ error: 'Admin login is not configured.' });
    return;
  }

  const { password } = req.body || {};
  if (!passwordsMatch(password, adminPassword)) {
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  res.setHeader('Set-Cookie', createSessionCookie());
  res.status(200).json({ ok: true });
};

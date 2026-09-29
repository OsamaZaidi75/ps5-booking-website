/**
 * Verifies a Cloudflare Turnstile token server-side. Free tier, no cost.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY not set — rejecting all captcha checks closed');
    return false;
  }
  if (!token || typeof token !== 'string') return false;

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verification request failed:', err.message);
    return false;
  }
}

module.exports = { verifyTurnstile };

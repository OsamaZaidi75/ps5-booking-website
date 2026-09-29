const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadObj, secret, ttlSeconds) {
  const exp = Date.now() + ttlSeconds * 1000;
  const payload = JSON.stringify({ ...payloadObj, exp });
  const payloadB64 = base64url(payload);
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

/**
 * Verifies an HMAC-signed, expiring token. Returns the decoded payload
 * (minus `exp`) on success, or null if the signature is invalid, the
 * token is malformed, or it has expired.
 */
function verify(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload.exp || Date.now() > payload.exp) return null;
  const { exp, ...rest } = payload;
  return rest;
}

module.exports = { sign, verify };

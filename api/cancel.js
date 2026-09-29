const { applyCors, getClientIp } = require('./_lib/cors');
const { checkRateLimit } = require('./_lib/rateLimit');
const { getSupabase } = require('./_lib/supabase');
const hmac = require('./_lib/hmac');

const RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 60;

function page(title, message, ok) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { background:#06070d; color:#f2f4fb; font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:2rem; text-align:center; }
  .card { background:#121729; border:1px solid rgba(255,255,255,0.09); border-radius:16px; padding:2.5rem 2rem; max-width:420px; }
  h1 { font-size:1.4rem; margin:0 0 0.75rem; color:${ok ? '#4fd8ff' : '#f87171'}; }
  p { color:#9aa4bd; line-height:1.5; }
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).send(page('Method not allowed', 'This endpoint only supports GET.', false));
    return;
  }

  const ip = getClientIp(req);
  try {
    const { allowed } = await checkRateLimit('cancel', ip, RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (!allowed) {
      res.status(429).send(page('Too many requests', 'Please try again in a minute.', false));
      return;
    }
  } catch (err) {
    console.error('Rate limit error:', err.message);
  }

  const { token } = req.query;
  const secret = process.env.CANCEL_LINK_SECRET;
  const payload = secret ? hmac.verify(token, secret) : null;

  if (!payload || !payload.bookingId) {
    res.status(400).setHeader('Content-Type', 'text/html').send(
      page('Invalid or expired link', 'This cancellation link is invalid or has expired. Contact the lounge directly if you still need to cancel.', false)
    );
    return;
  }

  const supabase = getSupabase();
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, booking_ref, status')
    .eq('id', payload.bookingId)
    .single();

  if (fetchError || !booking) {
    res.status(404).setHeader('Content-Type', 'text/html').send(
      page('Booking not found', 'We could not find this booking. It may have already been removed.', false)
    );
    return;
  }

  if (booking.status === 'cancelled') {
    res.status(200).setHeader('Content-Type', 'text/html').send(
      page('Already cancelled', `Booking ${booking.booking_ref} was already cancelled.`, true)
    );
    return;
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', booking.id);

  if (updateError) {
    console.error('Cancel update failed:', updateError.message);
    res.status(500).setHeader('Content-Type', 'text/html').send(
      page('Something went wrong', 'We could not cancel this booking. Please try again or contact the lounge.', false)
    );
    return;
  }

  res.status(200).setHeader('Content-Type', 'text/html').send(
    page('Booking cancelled', `Booking ${booking.booking_ref} has been cancelled. See you next time!`, true)
  );
};

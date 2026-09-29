const { Resend } = require('resend');
const hmac = require('./hmac');

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Missing RESEND_API_KEY env var');
  return new Resend(key);
}

function buildCancelUrl(bookingId) {
  const secret = process.env.CANCEL_LINK_SECRET;
  if (!secret) throw new Error('Missing CANCEL_LINK_SECRET env var');
  // Cancel links expire in 7 days — long enough to be useful, short enough
  // to limit the blast radius if an email is ever forwarded/leaked.
  const token = hmac.sign({ bookingId }, secret, 60 * 60 * 24 * 7);
  const base = process.env.PUBLIC_SITE_URL || '';
  return `${base}/api/cancel?token=${encodeURIComponent(token)}`;
}

/**
 * Emails the lounge owner full booking details. Fire-and-forget from the
 * caller's perspective, but errors are surfaced so /api/book can log them
 * without failing the booking itself (the booking is already saved).
 */
async function sendOwnerNotification(booking) {
  const ownerEmail = process.env.OWNER_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!ownerEmail || !from) {
    console.warn('OWNER_EMAIL or RESEND_FROM_EMAIL not set — skipping owner email');
    return;
  }
  const resend = getResend();
  await resend.emails.send({
    from,
    to: ownerEmail,
    subject: `New booking ${booking.booking_ref} — ${booking.date} ${booking.start_time}`,
    html: `
      <h2>New PS5 Arena booking</h2>
      <p><b>Ref:</b> ${booking.booking_ref}</p>
      <p><b>Name:</b> ${escapeHtml(booking.name)}</p>
      <p><b>Phone:</b> ${escapeHtml(booking.phone)}</p>
      <p><b>Email:</b> ${escapeHtml(booking.email || '—')}</p>
      <p><b>Date:</b> ${booking.date}</p>
      <p><b>Time:</b> ${booking.start_time} – ${booking.end_time} (${booking.duration_hours}h)</p>
      <p><b>Status:</b> ${booking.status}</p>
      ${booking.selected_games?.length ? `<p><b>Games:</b> ${escapeHtml(booking.selected_games.join(', '))}</p>` : ''}
    `,
  });
}

/**
 * Emails the customer their booking ref + a signed, expiring cancel link.
 * Only called when the customer supplied an email address.
 */
async function sendCustomerConfirmation(booking) {
  if (!booking.email) return;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    console.warn('RESEND_FROM_EMAIL not set — skipping customer email');
    return;
  }
  const resend = getResend();
  const cancelUrl = buildCancelUrl(booking.id);
  await resend.emails.send({
    from,
    to: booking.email,
    subject: `Booking confirmed — ${booking.booking_ref}`,
    html: `
      <h2>Your PS5 Arena session is booked!</h2>
      <p><b>Booking ref:</b> ${booking.booking_ref}</p>
      <p><b>Date:</b> ${booking.date}</p>
      <p><b>Time:</b> ${booking.start_time} – ${booking.end_time} (${booking.duration_hours}h)</p>
      <p>Pay at the lounge — ₹200/hour.</p>
      <p>Need to cancel? <a href="${cancelUrl}">Cancel this booking</a> (link expires in 7 days).</p>
    `,
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

module.exports = { sendOwnerNotification, sendCustomerConfirmation, buildCancelUrl };

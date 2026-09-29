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
    html: renderEmailLayout({
      heading: 'New booking received',
      intro: 'A new session was just booked. Full details below.',
      bodyHtml: bookingDetailsTable(booking),
    }),
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
    html: renderEmailLayout({
      heading: `You're all set, ${escapeHtml(booking.name)}!`,
      intro: 'Your PS5 Arena session is confirmed. Pay at the lounge — ₹200/hour, no prepayment needed.',
      bodyHtml: bookingDetailsTable(booking),
      ctaHtml: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align:center;">
              <a href="${cancelUrl}" style="display:inline-block;padding:10px 22px;border-radius:999px;border:1px solid ${COLORS.border};color:${COLORS.muted};font-size:13px;text-decoration:none;">Cancel this booking</a>
              <p style="margin:10px 0 0;color:${COLORS.muted};font-size:11px;">This cancellation link expires in 7 days.</p>
            </td>
          </tr>
        </table>`,
    }),
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ── Branded HTML layout ────────────────────────────────────────────────
// Matches the site's dark theme (bg #06070d, card #121729, accent #4fd8ff).
// Table-based layout for maximum email-client compatibility.

const COLORS = {
  bg: '#06070d',
  card: '#121729',
  border: '#232a42',
  text: '#e7ecf7',
  muted: '#9aa4bf',
  accent: '#4fd8ff',
  accentDeep: '#0d6efd',
};

function statusBadge(status) {
  const label = escapeHtml(status || 'pending');
  const bg = status === 'confirmed' ? '#123a2a' : status === 'cancelled' ? '#3a1414' : '#2a2612';
  const color = status === 'confirmed' ? '#4fe2a0' : status === 'cancelled' ? '#ff6b6b' : '#ffd166';
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${bg};color:${color};font-size:12px;font-weight:600;text-transform:capitalize;">${label}</span>`;
}

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};color:${COLORS.muted};font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px;font-weight:600;text-align:right;">${value}</td>
    </tr>`;
}

/**
 * Wraps body content (a details table + any extra HTML) in the shared
 * PS5 Arena branded email shell: header, card, footer.
 */
function renderEmailLayout({ heading, intro, bodyHtml, ctaHtml }) {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="padding-bottom:24px;text-align:center;">
                <span style="display:inline-block;width:36px;height:36px;line-height:36px;border-radius:10px;background:linear-gradient(135deg,${COLORS.accentDeep},${COLORS.accent});color:#04101c;font-weight:800;font-size:16px;text-align:center;vertical-align:middle;">◉</span>
                <span style="display:inline-block;margin-left:10px;font-size:18px;font-weight:800;color:${COLORS.text};vertical-align:middle;letter-spacing:0.2px;">PS5&nbsp;Arena</span>
              </td>
            </tr>
            <tr>
              <td style="background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:16px;padding:28px 28px 24px;">
                <h1 style="margin:0 0 8px;font-size:20px;color:${COLORS.text};">${escapeHtml(heading)}</h1>
                ${intro ? `<p style="margin:0 0 20px;color:${COLORS.muted};font-size:14px;line-height:1.5;">${intro}</p>` : ''}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
                  ${bodyHtml}
                </table>
                ${ctaHtml ? `<div style="margin-top:24px;">${ctaHtml}</div>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0;text-align:center;color:${COLORS.muted};font-size:12px;line-height:1.6;">
                PS5 Arena · Premium gaming lounge · Open daily 10:00–22:00 IST<br />
                Pay at the lounge · Free cancellation before your session starts
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function bookingDetailsTable(booking) {
  const rows = [
    detailRow('Booking ref', `<span style="color:${COLORS.accent};font-family:'SFMono-Regular',Consolas,monospace;">${escapeHtml(booking.booking_ref)}</span>`),
    detailRow('Name', escapeHtml(booking.name)),
    detailRow('Phone', escapeHtml(booking.phone)),
    detailRow('Email', escapeHtml(booking.email || '—')),
    detailRow('Date', escapeHtml(booking.date)),
    detailRow('Time', `${escapeHtml(booking.start_time)} – ${escapeHtml(booking.end_time)}`),
    detailRow('Duration', `${escapeHtml(String(booking.duration_hours))}h`),
    detailRow('Status', statusBadge(booking.status)),
  ];
  if (booking.selected_games?.length) {
    rows.push(detailRow('Games', escapeHtml(booking.selected_games.join(', '))));
  }
  return rows.join('');
}

module.exports = { sendOwnerNotification, sendCustomerConfirmation, buildCancelUrl };

const crypto = require('crypto');
const { applyCors, getClientIp } = require('./_lib/cors');
const { checkRateLimit } = require('./_lib/rateLimit');
const { verifyTurnstile } = require('./_lib/turnstile');
const { validateBookingInput } = require('./_lib/bookingRules');
const { getSupabase } = require('./_lib/supabase');
const { sendOwnerNotification, sendCustomerRequestReceived } = require('./_lib/email');

const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60;

function generateBookingRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[crypto.randomInt(chars.length)];
  }
  return `PS5-${suffix}`;
}

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);

  try {
    const { allowed } = await checkRateLimit('book', ip, RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (!allowed) {
      res.status(429).json({ error: 'Too many booking attempts. Please try again in a minute.' });
      return;
    }
  } catch (err) {
    console.error('Rate limit error:', err.message);
  }

  const body = req.body || {};

  // Honeypot: a real user will never fill this hidden field. Bots that
  // blindly fill every input will. Silently pretend success so scrapers
  // don't learn their submission was detected.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    res.status(201).json({ booking_ref: generateBookingRef(), status: 'pending' });
    return;
  }

  const turnstileOk = await verifyTurnstile(body.turnstileToken, ip);
  if (!turnstileOk) {
    res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
    return;
  }

  const { valid, errors, clean } = validateBookingInput(body);
  if (!valid) {
    res.status(400).json({ error: errors.join(' ') });
    return;
  }

  // Optional extras beyond the required schema (see supabase/schema.sql).
  const email = typeof body.email === 'string' && /\S+@\S+\.\S+/.test(body.email) ? body.email.trim() : null;
  const selectedGames = Array.isArray(body.selectedGames)
    ? body.selectedGames.filter((g) => typeof g === 'string' || typeof g === 'number').slice(0, 20)
    : null;

  const supabase = getSupabase();

  // booking_ref collisions are astronomically unlikely (32^6 combinations)
  // but we retry a few times just in case the unique constraint fires.
  let booking = null;
  let lastError = null;
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        booking_ref: generateBookingRef(),
        name: clean.name,
        phone: clean.phone,
        email,
        date: clean.date,
        start_time: clean.startTime,
        duration_hours: clean.durationHours,
        end_time: clean.endTime,
        status: 'pending',
        selected_games: selectedGames,
      })
      .select()
      .single();

    if (!error) {
      booking = data;
      break;
    }

    lastError = error;
    // 23P01 = exclusion_violation (overlapping slot) — not retryable.
    if (error.code === '23P01') {
      res.status(409).json({ error: 'This time slot overlaps with an existing booking. Please choose another time.' });
      return;
    }
    // 23505 = unique_violation on booking_ref — retry with a fresh ref.
    if (error.code !== '23505') break;
  }

  if (!booking) {
    console.error('Booking insert failed:', lastError?.message);
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
    return;
  }

  // Respond to the client immediately — the booking is already durably
  // saved, so email delivery must never block or fail the HTTP response.
  // Vercel's Node runtime keeps this invocation alive until the handler's
  // promise settles (regardless of res already being sent), so we still
  // await the sends below — but the browser is never waiting on them.
  res.status(201).json({
    id: booking.id,
    booking_ref: booking.booking_ref,
    name: booking.name,
    date: booking.date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    duration_hours: booking.duration_hours,
    status: booking.status,
  });

  // Fire both emails in parallel (not sequentially) so a slow/hanging SMTP
  // attempt on one doesn't double the worst-case time before the other is
  // even attempted. Each call already has its own internal timeout guard
  // (see api/_lib/email.js) and logs its own success/failure — a rejection
  // here is only ever a network/SMTP failure that's already been logged.
  const results = await Promise.allSettled([
    sendOwnerNotification(booking),
    sendCustomerRequestReceived(booking),
  ]);
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const label = i === 0 ? 'Owner notification' : 'Customer request-received';
      console.error(`${label} email failed for ${booking.booking_ref}:`, result.reason?.message);
    }
  });
};

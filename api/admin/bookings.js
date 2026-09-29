const { applyCors } = require('../_lib/cors');
const { isAdminRequest } = require('../_lib/auth');
const { getSupabase } = require('../_lib/supabase');
const { todayInIST } = require('../_lib/bookingRules');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  const supabase = getSupabase();
  const { date } = req.query;

  let query = supabase
    .from('bookings')
    .select('id, booking_ref, name, phone, email, date, start_time, end_time, duration_hours, status, selected_games, created_at')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (typeof date === 'string' && DATE_RE.test(date)) {
    // Day view: a specific date, any status.
    query = query.eq('date', date);
  } else {
    // Default list view: today onward, so past clutter doesn't pile up.
    query = query.gte('date', todayInIST());
  }

  const { data, error } = await query;
  if (error) {
    console.error('Admin bookings query failed:', error.message);
    res.status(500).json({ error: 'Failed to load bookings.' });
    return;
  }

  res.status(200).json(data);
};

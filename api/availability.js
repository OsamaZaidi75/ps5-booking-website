const { applyCors, getClientIp } = require('./_lib/cors');
const { checkRateLimit } = require('./_lib/rateLimit');
const { getSupabase } = require('./_lib/supabase');
const {
  getBusinessHours,
  getBufferMinutes,
  timeToMinutes,
  minutesToTime,
  todayInIST,
  nowInISTMinutes,
} = require('./_lib/bookingRules');

const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 60;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_STEP_MINUTES = 30;

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  try {
    const { allowed } = await checkRateLimit('availability', ip, RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (!allowed) {
      res.status(429).json({ error: 'Too many requests. Please slow down.' });
      return;
    }
  } catch (err) {
    console.error('Rate limit error:', err.message);
  }

  const { date, durationHours } = req.query;
  if (typeof date !== 'string' || !DATE_RE.test(date) || Number.isNaN(Date.parse(date))) {
    res.status(400).json({ error: 'Query param "date" must be a valid YYYY-MM-DD date.' });
    return;
  }

  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('date', date)
    .neq('status', 'cancelled');

  if (error) {
    console.error('Availability query failed:', error.message);
    res.status(500).json({ error: 'Failed to load availability.' });
    return;
  }

  const busy = rows.map((r) => ({
    startTime: r.start_time.slice(0, 5),
    endTime: r.end_time.slice(0, 5),
  }));

  const { start: bizStart, end: bizEnd } = getBusinessHours();
  const bufferMinutes = getBufferMinutes();
  const response = {
    date,
    businessHours: { start: bizStart, end: bizEnd },
    bufferMinutes,
    bookings: busy,
  };

  const duration = Number(durationHours);
  if (Number.isInteger(duration) && duration >= 1 && duration <= 5) {
    const bizStartMin = timeToMinutes(bizStart);
    const bizEndMin = timeToMinutes(bizEnd);
    const isToday = date === todayInIST();
    const nowMin = isToday ? nowInISTMinutes() : -1;

    const busyRanges = busy.map((b) => ({
      start: timeToMinutes(b.startTime) - bufferMinutes,
      end: timeToMinutes(b.endTime) + bufferMinutes,
    }));

    const availableStartTimes = [];
    for (let start = bizStartMin; start + duration * 60 <= bizEndMin; start += SLOT_STEP_MINUTES) {
      const end = start + duration * 60;
      if (isToday && start <= nowMin) continue;
      const overlaps = busyRanges.some((b) => start < b.end && end > b.start);
      if (!overlaps) availableStartTimes.push(minutesToTime(start));
    }
    response.durationHours = duration;
    response.availableStartTimes = availableStartTimes;
  }

  res.status(200).json(response);
};

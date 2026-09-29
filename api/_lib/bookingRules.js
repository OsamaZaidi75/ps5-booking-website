const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function getBusinessHours() {
  const start = process.env.BUSINESS_START_TIME || '10:00';
  const end = process.env.BUSINESS_END_TIME || '22:00';
  return { start, end };
}

function getBufferMinutes() {
  const raw = process.env.BOOKING_BUFFER_MINUTES;
  const n = raw === undefined ? 15 : parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 15;
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Returns today's date as YYYY-MM-DD in IST (Asia/Kolkata), independent of
 * the server's local timezone (Vercel functions run in UTC).
 */
function todayInIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function nowInISTMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + m;
}

/**
 * Fully server-side validation of a booking request. Never trusts any
 * client-computed values (end time, cost, availability) — everything here
 * is recomputed from name/phone/date/startTime/durationHours only.
 */
function validateBookingInput({ name, phone, date, startTime, durationHours }) {
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    errors.push('Name is required (2-100 characters).');
  }
  const cleanPhone = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
  if (cleanPhone.length !== 10) {
    errors.push('Phone must be a 10-digit number.');
  }
  if (typeof date !== 'string' || !DATE_RE.test(date) || Number.isNaN(Date.parse(date))) {
    errors.push('Date must be a valid YYYY-MM-DD date.');
  }
  if (typeof startTime !== 'string' || !TIME_RE.test(startTime)) {
    errors.push('Start time must be HH:mm (24h).');
  }
  const duration = Number(durationHours);
  if (!Number.isInteger(duration) || duration < 1 || duration > 5) {
    errors.push('Duration must be a whole number between 1 and 5 hours.');
  }

  if (errors.length > 0) return { valid: false, errors };

  // Reject past dates/times (compared in IST, the lounge's local time).
  const todayIST = todayInIST();
  if (date < todayIST) {
    return { valid: false, errors: ['Cannot book a date in the past.'] };
  }
  if (date === todayIST && timeToMinutes(startTime) <= nowInISTMinutes()) {
    return { valid: false, errors: ['Cannot book a time slot in the past.'] };
  }

  const { start: bizStart, end: bizEnd } = getBusinessHours();
  const startMin = timeToMinutes(startTime);
  const endMin = startMin + duration * 60;

  if (startMin < timeToMinutes(bizStart) || endMin > timeToMinutes(bizEnd)) {
    return {
      valid: false,
      errors: [`Bookings are only available between ${bizStart} and ${bizEnd}.`],
    };
  }

  return {
    valid: true,
    errors: [],
    clean: {
      name: name.trim(),
      phone: cleanPhone,
      date,
      startTime,
      durationHours: duration,
      endTime: minutesToTime(endMin),
    },
  };
}

module.exports = {
  getBusinessHours,
  getBufferMinutes,
  timeToMinutes,
  minutesToTime,
  todayInIST,
  nowInISTMinutes,
  validateBookingInput,
};

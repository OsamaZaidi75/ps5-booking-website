const { applyCors } = require('../../_lib/cors');
const { isAdminRequest } = require('../../_lib/auth');
const { getSupabase } = require('../../_lib/supabase');
const { sendCustomerConfirmed, sendCustomerCancelled } = require('../../_lib/email');

const ALLOWED_STATUSES = ['pending', 'confirmed', 'cancelled'];

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  const { id } = req.query;
  const { status } = req.body || {};

  if (!ALLOWED_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
    return;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // 23P01 = exclusion_violation — e.g. re-confirming would now overlap
    // another booking made after this one was cancelled.
    if (error.code === '23P01') {
      res.status(409).json({ error: 'This change would overlap another booking.' });
      return;
    }
    console.error('Admin booking update failed:', error.message);
    res.status(500).json({ error: 'Failed to update booking.' });
    return;
  }

  if (!data) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  // Notify the customer of the status change. Fire-and-forget — email
  // failures must never break the admin action, the DB is already updated.
  try {
    if (status === 'confirmed') {
      await sendCustomerConfirmed(data);
    } else if (status === 'cancelled') {
      await sendCustomerCancelled(data);
    }
  } catch (err) {
    console.error('Admin status-change email failed:', err.message);
  }

  res.status(200).json(data);
};

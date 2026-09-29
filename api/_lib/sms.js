// SMS is intentionally NOT implemented — there is no reliable free SMS
// provider that covers Indian mobile numbers (Twilio/MSG91/etc. are paid).
//
// This is a clearly-marked hook for wiring up a paid provider later
// (e.g. MSG91, Twilio, Gupshup) without touching the booking logic in
// api/book.js. To enable it:
//   1. Add SMS_PROVIDER_API_KEY (and any other required env vars) to
//      .env.example and your Vercel project settings.
//   2. Implement `sendBookingSms` below using your provider's SDK/HTTP API.
//   3. Call `sendBookingSms(booking)` from api/book.js next to the existing
//      sendOwnerNotification/sendCustomerConfirmation calls.

/**
 * @param {object} booking - the booking row (see supabase/schema.sql)
 */
async function sendBookingSms(booking) {
  if (!process.env.SMS_PROVIDER_API_KEY) {
    // No-op until a paid provider is configured.
    return;
  }
  throw new Error('SMS provider not implemented yet — see comments in api/_lib/sms.js');
}

module.exports = { sendBookingSms };

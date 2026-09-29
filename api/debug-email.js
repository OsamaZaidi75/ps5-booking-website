// TEMPORARY diagnostic endpoint — DELETE AFTER DEBUGGING.
const { sendOwnerNotification, sendCustomerRequestReceived } = require("./_lib/email");

const DEBUG_TOKEN = "136cdd46bec5699833afdc32000628383431ffbeb9706ead";

module.exports = async (req, res) => {
  if (req.query.token !== DEBUG_TOKEN) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const booking = {
    id: "debug",
    booking_ref: "PS5-DEBUG",
    name: "Debug Test",
    phone: "9876543210",
    email: "Rahulgupt8882@gmail.com",
    date: "2026-10-02",
    start_time: "14:00",
    end_time: "15:00",
    duration_hours: 1,
    status: "pending",
    selected_games: [],
  };
  const results = await Promise.allSettled([
    sendOwnerNotification(booking),
    sendCustomerRequestReceived(booking),
  ]);
  const labels = ["owner", "customer"];
  const out = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      out[labels[i]] = { ok: true };
    } else {
      const e = r.reason || {};
      out[labels[i]] = {
        ok: false,
        message: e.message,
        code: e.code,
        command: e.command,
        response: e.response,
        responseCode: e.responseCode,
      };
    }
  });
  out.env = {
    GMAIL_USER_set: !!process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD_set: !!process.env.GMAIL_APP_PASSWORD,
    OWNER_EMAIL_set: !!process.env.OWNER_EMAIL,
    OWNER_EMAIL_value: process.env.OWNER_EMAIL || null,
  };
  res.status(200).json(out);
};

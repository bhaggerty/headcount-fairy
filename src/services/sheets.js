const axios = require('axios');

async function call(action, body) {
  const { data } = await axios.post(
    process.env.APPS_SCRIPT_URL,
    { secret: process.env.APPS_SCRIPT_SECRET, action, ...body },
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (!data.success) throw new Error(`Apps Script error: ${data.error}`);
  return data;
}

// Append a new row to the human-facing sheet (called once on submission)
async function writeReqToSheet(req) {
  await call('writeReq', { req });
}

// Update the Status column when the req status changes
async function updateSheetStatus(reqId, status) {
  await call('updateStatus', { reqId, status });
}

module.exports = { writeReqToSheet, updateSheetStatus };

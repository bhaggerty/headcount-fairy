// Persistence layer — routes writes to both DynamoDB (internal state) and
// Google Sheets (human-facing view). Reads always come from DynamoDB.
// Sheet writes are best-effort — failures are logged but never block the workflow.
const dynamo = require('./dynamo');
const sheets = require('./sheets');

async function writeReq(req) {
  await dynamo.writeReq(req);
  sheets.writeReqToSheet(req).catch((err) =>
    console.error('[sheets] writeReqToSheet failed (non-fatal):', err.message)
  );
}

async function updateReq(reqId, fields) {
  await dynamo.updateReq(reqId, fields);
  if (fields.status) {
    sheets.updateSheetStatus(reqId, fields.status).catch((err) =>
      console.error('[sheets] updateSheetStatus failed (non-fatal):', err.message)
    );
  }
}

async function getReq(reqId) {
  return dynamo.getReq(reqId);
}

module.exports = { writeReq, updateReq, getReq };

// Persistence layer — routes writes to both DynamoDB (internal state) and
// Google Sheets (human-facing view). Reads always come from DynamoDB.
const dynamo = require('./dynamo');
const sheets = require('./sheets');

async function writeReq(req) {
  await Promise.all([
    dynamo.writeReq(req),
    sheets.writeReqToSheet(req),
  ]);
}

async function updateReq(reqId, fields) {
  await dynamo.updateReq(reqId, fields);
  if (fields.status) {
    await sheets.updateSheetStatus(reqId, fields.status);
  }
}

async function getReq(reqId) {
  return dynamo.getReq(reqId);
}

module.exports = { writeReq, updateReq, getReq };

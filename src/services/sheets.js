const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const TAB = 'Sheet1';

// Only the 7 human-facing columns — internal state lives in DynamoDB
const COL = {
  req_id:              'B',
  department:          'C',
  role_title:          'D',
  hiring_manager_name: 'E',
  level:               'F',
  job_description:     'G',
  status:              'H',
};

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

// Append a new row to the human-facing sheet (called once on submission)
async function writeReqToSheet(req) {
  const sheets = await getSheets();
  const row = Object.keys(COL).map((field) => req[field] ?? '');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!B4:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] },
  });
}

// Find the 1-based row number for a given req_id (searches column B)
async function findRow(sheets, reqId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!B:B`,
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex((r) => r[0] === reqId);
  if (idx === -1) throw new Error(`Req ${reqId} not found in sheet`);
  return idx + 1;
}

// Update only the Status column (H) when the req status changes
async function updateSheetStatus(reqId, status) {
  const sheets = await getSheets();
  const rowNum = await findRow(sheets, reqId);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!${COL.status}${rowNum}`,
    valueInputOption: 'RAW',
    resource: { values: [[status]] },
  });
}

module.exports = { writeReqToSheet, updateSheetStatus };

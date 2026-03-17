const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const TAB = 'Sheet1';

// Columns B–H match the visible sheet headers.
// Columns I–AB store the full req data for future systems.
const COL = {
  req_id:                  'B',
  department:              'C',
  role_title:              'D',
  hiring_manager_name:     'E',  // display name (human-readable)
  level:                   'F',
  job_description:         'G',
  status:                  'H',
  hiring_manager_slack_id: 'I',
  requester_slack_id:      'J',
  headcount:               'K',
  salary_range:            'L',
  location:                'M',
  alex_decision:           'N',
  alex_notes:              'O',
  josh_decision:           'P',
  josh_notes:              'Q',
  phone_screeners:         'R',
  panel_1_title:           'S',
  panel_1_interviewers:    'T',
  panel_2_title:           'U',
  panel_2_interviewers:    'V',
  panel_3_title:           'W',
  panel_3_interviewers:    'X',
  interview_guide:         'Y',
  ashby_job_id:            'Z',
  created_at:              'AA',
  updated_at:              'AB',
};

const FIELDS = Object.keys(COL); // ordered list of field names

// Convert a column letter (B, C, ... Z, AA, AB) to a 0-based index
// relative to the first column B (B=0, C=1, ..., Z=24, AA=25, AB=26)
function colToRelIndex(col) {
  if (col.length === 1) return col.charCodeAt(0) - 66; // B=0
  const first = col.charCodeAt(0) - 64;
  const second = col.charCodeAt(1) - 64;
  return first * 26 + second - 2; // AA=25, AB=26
}

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

// Append a new req row starting at column B (row 4+ to preserve headers at row 3)
async function writeReq(req) {
  const sheets = await getSheets();
  const row = FIELDS.map((field) => req[field] ?? '');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!B4:AB`,
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
  return idx + 1; // 1-based
}

// Patch only the specified fields for an existing req
async function updateReq(reqId, fields) {
  const sheets = await getSheets();
  const rowNum = await findRow(sheets, reqId);

  const data = Object.entries(fields)
    .filter(([field]) => COL[field])
    .map(([field, value]) => ({
      range: `${TAB}!${COL[field]}${rowNum}`,
      values: [[value ?? '']],
    }));

  // Always update updated_at
  data.push({
    range: `${TAB}!${COL.updated_at}${rowNum}`,
    values: [[new Date().toISOString()]],
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    resource: { valueInputOption: 'RAW', data },
  });
}

// Read a full req row back as a plain object
async function getReq(reqId) {
  const sheets = await getSheets();
  const rowNum = await findRow(sheets, reqId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!B${rowNum}:AB${rowNum}`,
  });
  const row = res.data.values?.[0] || [];
  return Object.fromEntries(
    FIELDS.map((field) => [field, row[colToRelIndex(COL[field])] ?? ''])
  );
}

module.exports = { writeReq, updateReq, getReq };

// ─── Config ───────────────────────────────────────────────────────────────────
const SHEET_ID   = 'YOUR_GOOGLE_SHEET_ID';  // paste your sheet ID here
const SECRET_KEY = 'YOUR_SECRET_KEY';        // must match APPS_SCRIPT_SECRET in Union Station
const TAB_NAME   = 'Sheet1';

// ─── Router ───────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    if (payload.secret !== SECRET_KEY) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    if (payload.action === 'writeReq')     return jsonResponse(writeReq(payload.req));
    if (payload.action === 'updateStatus') return jsonResponse(updateStatus(payload.reqId, payload.status));

    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

// Write starting at column B (col index 2) to align with sheet headers
function writeReq(req) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_NAME);
  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 2, 1, 7).setValues([[
    req.req_id,
    req.department,
    req.role_title,
    req.hiring_manager_name,
    req.level,
    req.job_description || '',
    req.status,
  ]]);
  return { success: true };
}

// Search column B for req_id, update column H (status)
function updateStatus(reqId, status) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_NAME);
  const colB = sheet.getRange('B:B').getValues();

  for (let i = 0; i < colB.length; i++) {
    if (colB[i][0] === reqId) {
      sheet.getRange(i + 1, 8).setValue(status);
      return { success: true };
    }
  }

  return { success: false, error: `Req ${reqId} not found` };
}

// ─── Test ─────────────────────────────────────────────────────────────────────
function testWrite() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_NAME);
  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 2, 1, 7).setValues([[
    'TEST-123', 'Engineering', 'Test Role', 'Test Manager', 'Sr.', 'Test JD', 'pending_alex'
  ]]);
  Logger.log('Done - check row ' + nextRow);
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

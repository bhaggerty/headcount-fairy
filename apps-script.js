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

// Append a new req row (columns B–H)
function writeReq(req) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_NAME);
  sheet.appendRow([
    req.req_id,
    req.department,
    req.role_title,
    req.hiring_manager_name,
    req.level,
    req.job_description || '',
    req.status,
  ]);
  return { success: true };
}

// Update the Status column (H) for a given req_id
function updateStatus(reqId, status) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_NAME);
  const colB   = sheet.getRange('B:B').getValues();

  for (let i = 0; i < colB.length; i++) {
    if (colB[i][0] === reqId) {
      sheet.getRange(i + 1, 8).setValue(status); // column H = index 8
      return { success: true };
    }
  }

  return { success: false, error: `Req ${reqId} not found` };
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

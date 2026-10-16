/**
 * ==============================================================================
 * BANNARI AMMAN INSTITUTE OF TECHNOLOGY (BIT)
 * DIGITAL BLOOD DONATION AND EMERGENCY BLOOD AVAILABILITY MANAGEMENT PORTAL
 * Google Apps Script Webhook Trigger (Installable onFormSubmit)
 * ==============================================================================
 * 
 * Instructions:
 * 1. Open the private Google Sheet linked to the BIT Blood Registration Form.
 * 2. Click Extensions > Apps Script.
 * 3. Replace the editor contents with this file (Code.gs).
 * 4. In Project Settings > Script Properties, configure:
 *    - BACKEND_SYNC_URL: https://<your-public-backend-domain>/api/sync/google-form
 *    - FORM_SYNC_SECRET: <shared-64-char-hmac-secret-configured-in-backend-env>
 * 5. In Triggers (alarm clock icon), add a trigger:
 *    - Choose which function to run: onFormSubmit
 *    - Which event source: From spreadsheet
 *    - Select event type: On form submit
 * 
 * NOTE ON LOCALHOST:
 * Google Apps Script executes on Google's cloud servers. It cannot directly call
 * http://localhost:5000. During local development, use an HTTPS reverse tunnel
 * such as ngrok or Cloudflare Tunnel:
 *   ngrok http 5000
 * Set BACKEND_SYNC_URL to:
 *   https://<your-ngrok-id>.ngrok-free.app/api/sync/google-form
 * ==============================================================================
 */

/**
 * Triggered automatically upon every Google Form submission
 */
function onFormSubmit(e) {
  var lock = LockService.getScriptLock();
  try {
    // Acquire lock for up to 30 seconds to prevent race conditions
    lock.waitLock(30000);

    var scriptProps = PropertiesService.getScriptProperties();
    var backendUrl = scriptProps.getProperty('BACKEND_SYNC_URL');
    var syncSecret = scriptProps.getProperty('FORM_SYNC_SECRET');

    if (!backendUrl || !syncSecret) {
      Logger.log('ERROR: BACKEND_SYNC_URL or FORM_SYNC_SECRET script property is missing.');
      recordSyncFailure('CONFIG_MISSING', 'Script properties not configured', e ? e.namedValues : {});
      return;
    }

    // Extract submission values
    var payload = extractFormPayload(e);

    // Validate college domain
    if (!payload.email || !payload.email.toLowerCase().endsWith('@bitsathy.ac.in')) {
      Logger.log('REJECTED: Email ' + payload.email + ' does not belong to @bitsathy.ac.in');
      recordSyncFailure(payload.eventId, 'REJECTED_DOMAIN_NOT_BITSATHY', payload);
      return;
    }

    // Dispatch signed HTTPS webhook
    var success = dispatchSignedWebhook(payload, backendUrl, syncSecret);

    if (success) {
      Logger.log('SUCCESS: Form sync completed for ' + payload.email + ' (Event: ' + payload.eventId + ')');
    } else {
      Logger.log('WARNING: Form sync delivery failed. Queued for automatic retry.');
      queueFailedSubmission(payload);
    }
  } catch (err) {
    Logger.log('FATAL EXCEPTION in onFormSubmit: ' + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * Extracts and normalizes form submission data
 */
function extractFormPayload(e) {
  var timestamp = Date.now();
  var eventId = Utilities.getUuid();

  var values = e && e.namedValues ? e.namedValues : {};

  // Form Field Names matching official BIT Google Form Specification:
  var email = getField(values, ['Email Address', 'Verified Email', 'Username', 'Email']);
  var name = getField(values, ['Full Name', 'Name', 'Student Name']);
  var registerNumber = getField(values, ['Register Number', 'Roll Number', 'Register No']);
  var department = getField(values, ['Department', 'Branch']);
  var year = getField(values, ['Year of Study', 'Year', 'Current Year']);
  var role = getField(values, ['Portal Role Preference', 'Role', 'Selected Role']);
  var bloodGroup = getField(values, ['Blood Group', 'Self-Reported Blood Group']);
  var mobile = getField(values, ['Mobile Contact', 'Contact Number', 'Mobile']);
  var residenceType = getField(values, ['Residence Type', 'Hostel / Day Scholar']);
  var approximateArea = getField(values, ['Approximate Current Area / Hostel Block', 'Hostel Block', 'Area']);
  var currentWillingness = getField(values, ['Current Willingness to Donate', 'Willingness']);
  var lastDonationDate = getField(values, ['Last Donation Date (if known)', 'Last Donation Date']);
  var consentStored = true;
  var consentEmergency = true;

  return {
    eventId: eventId,
    submissionTimestamp: timestamp,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    registerNumber: registerNumber.toUpperCase().trim(),
    department: department.trim(),
    year: year.trim(),
    role: mapRole(role),
    bloodGroup: mapBloodGroup(bloodGroup),
    mobile: mobile.trim(),
    residenceType: residenceType.indexOf('Hostel') !== -1 ? 'Hostel' : 'Day Scholar',
    approximateArea: approximateArea.trim() || 'Campus Hostels',
    currentWillingness: currentWillingness.indexOf('Unavailable') !== -1 ? 'Temporarily Unavailable' : 'Willing',
    lastDonationDate: lastDonationDate ? new Date(lastDonationDate).toISOString() : undefined,
    consentStored: consentStored,
    consentEmergencyCommunications: consentEmergency
  };
}

/**
 * Helper to fetch first matching field name from namedValues
 */
function getField(namedValues, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var key = candidates[i];
    if (namedValues[key] && namedValues[key][0]) {
      return namedValues[key][0].toString();
    }
  }
  return '';
}

function mapRole(val) {
  if (val.indexOf('Both') !== -1) return 'Both';
  if (val.indexOf('Requester') !== -1) return 'Requester';
  return 'Donor';
}

function mapBloodGroup(val) {
  var clean = val.replace(/\s+/g, '').toUpperCase();
  var valid = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (valid.indexOf(clean) !== -1) return clean;
  return 'Unknown';
}

/**
 * Computes HMAC-SHA256 signature and performs HTTPS POST
 */
function dispatchSignedWebhook(payload, backendUrl, syncSecret) {
  var timestamp = payload.submissionTimestamp.toString();
  var eventId = payload.eventId;
  var bodyString = JSON.stringify(payload);

  // Compute HMAC-SHA256 signature
  var signature = computeHmacSha256(syncSecret, bodyString);

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: bodyString,
    headers: {
      'X-BIT-Signature': signature,
      'X-BIT-Timestamp': timestamp,
      'X-BIT-Event-Id': eventId
    },
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(backendUrl, options);
    var code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return true;
    } else {
      Logger.log('HTTP Error: ' + code + ' Body: ' + response.getContentText());
      return false;
    }
  } catch (err) {
    Logger.log('UrlFetchApp Network Exception: ' + err.toString());
    return false;
  }
}

/**
 * Computes hex-encoded HMAC-SHA256 signature using Utilities
 */
function computeHmacSha256(key, message) {
  var rawBytes = Utilities.computeHmacSha256Signature(message, key);
  var hexString = '';
  for (var i = 0; i < rawBytes.length; i++) {
    var byteVal = rawBytes[i];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hexString += byteHex;
  }
  return hexString;
}

/**
 * Records failed sync submission in a dedicated "Sync_Retries" sheet tab
 */
function queueFailedSubmission(payload) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Sync_Retries');
    if (!sheet) {
      sheet = ss.insertSheet('Sync_Retries');
      sheet.appendRow(['Event ID', 'Timestamp', 'Email', 'Register Number', 'Payload JSON', 'Retry Count', 'Status']);
    }
    sheet.appendRow([
      payload.eventId,
      new Date(),
      payload.email,
      payload.registerNumber,
      JSON.stringify(payload),
      0,
      'PENDING_RETRY'
    ]);
  } catch (e) {
    Logger.log('Failed to write to Sync_Retries sheet: ' + e.toString());
  }
}

function recordSyncFailure(eventId, reason, data) {
  Logger.log('Recorded Sync Failure: ' + eventId + ' Reason: ' + reason);
}

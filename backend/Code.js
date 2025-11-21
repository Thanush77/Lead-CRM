/**
 * APEX CRM BACKEND - Google Apps Script
 * 
 * INSTRUCTIONS:
 * 1. Create a new Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code into Code.gs.
 * 4. Run the 'setup' function once to create the sheets and columns.
 * 5. Deploy as Web App:
 *    - Click Deploy > New Deployment
 *    - Select type: Web App
 *    - Description: v1
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the "Web App URL" and paste it into your frontend .env file as VITE_API_URL.
 */

const SHEETS = {
  LEADS: 'Leads',
  ACTIVITIES: 'Activities',
  USERS: 'Users'
};

// --- INITIAL SETUP ---
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Leads Sheet
  let leadsSheet = ss.getSheetByName(SHEETS.LEADS);
  if (!leadsSheet) {
    leadsSheet = ss.insertSheet(SHEETS.LEADS);
    leadsSheet.appendRow([
      'id', 'leadName', 'companyName', 'email', 'phone', 'industry', 'source', 
      'budgetRange', 'stage', 'status', 'leadOwner', 'leadScore', 'probability', 
      'dealValue', 'expectedValue', 'nextActionType', 'nextActionDateTime', 
      'lastContactedAt', 'createdAt', 'notes', 'suggestedEmailSubject', 'suggestedEmailBody'
    ]);
  }

  // 2. Activities Sheet
  let activitiesSheet = ss.getSheetByName(SHEETS.ACTIVITIES);
  if (!activitiesSheet) {
    activitiesSheet = ss.insertSheet(SHEETS.ACTIVITIES);
    activitiesSheet.appendRow([
      'id', 'leadId', 'type', 'subject', 'description', 'outcome', 'dateTime', 'createdBy'
    ]);
  }

  // 3. Users Sheet
  let usersSheet = ss.getSheetByName(SHEETS.USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEETS.USERS);
    usersSheet.appendRow(['id', 'email', 'name', 'role', 'password', 'territory']);
    // Add Seed Admin
    usersSheet.appendRow(['u1', 'admin@apex.com', 'Sarah Admin', 'Admin', 'admin', 'Global']);
    usersSheet.appendRow(['u2', 'sales@apex.com', 'John Sales', 'Sales', 'sales', 'North']);
  }
}

// --- HTTP HANDLERS ---

function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  
  let result = {};
  
  try {
    switch(action) {
      case 'getUsers':
        result = getData(SHEETS.USERS);
        break;
      case 'authenticate':
        result = authenticateUser(params.email);
        break;
      case 'getLeads':
        result = getLeads(params.userEmail, params.userRole);
        break;
      case 'getLeadById':
        result = getLeadById(params.id);
        break;
      case 'getActivities':
        result = getActivities(params.leadId);
        break;
      default:
        result = { error: 'Invalid action' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }
  
  return responseJSON(result);
}

function doPost(e) {
  let params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    return responseJSON({ error: 'Invalid JSON body' });
  }

  const action = params.action;
  let result = {};

  try {
    switch(action) {
      case 'createLead':
        result = createLead(params.data);
        break;
      case 'updateLead':
        result = updateLead(params.data);
        break;
      case 'addActivity':
        result = addActivity(params.data);
        break;
      default:
        result = { error: 'Invalid action' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return responseJSON(result);
}

// --- CORE FUNCTIONS ---

function getData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Remove header row
  
  return data.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function getLeads(userEmail, userRole) {
  const allLeads = getData(SHEETS.LEADS);
  
  if (userRole === 'Admin') {
    return allLeads;
  }
  return allLeads.filter(l => l.leadOwner === userEmail);
}

function getLeadById(id) {
  const leads = getData(SHEETS.LEADS);
  return leads.find(l => l.id == id);
}

function getActivities(leadId) {
  const activities = getData(SHEETS.ACTIVITIES);
  if (leadId) {
    return activities.filter(a => a.leadId == leadId);
  }
  return activities;
}

function authenticateUser(email) {
  const users = getData(SHEETS.USERS);
  const user = users.find(u => u.email === email);
  return user || null;
}

function createLead(leadData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LEADS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const row = headers.map(header => leadData[header] || '');
  sheet.appendRow(row);
  return { success: true, id: leadData.id };
}

function updateLead(leadData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LEADS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find row index by ID (assuming ID is in first column, otherwise find index of 'id')
  const idIndex = headers.indexOf('id');
  const rowIndex = data.findIndex(row => row[idIndex] == leadData.id);
  
  if (rowIndex === -1) throw new Error('Lead not found');
  
  // Map new data to row
  const newRow = headers.map((header, i) => {
    return leadData.hasOwnProperty(header) ? leadData[header] : data[rowIndex][i];
  });
  
  // Update range (rowIndex + 1 because sheets are 1-indexed)
  sheet.getRange(rowIndex + 1, 1, 1, newRow.length).setValues([newRow]);
  
  return { success: true };
}

function addActivity(activityData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.ACTIVITIES);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const row = headers.map(header => activityData[header] || '');
  sheet.appendRow(row);
  return { success: true, id: activityData.id };
}

// --- HELPERS ---

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

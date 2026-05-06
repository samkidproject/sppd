/**
 * Google Apps Script Backend for SPPD Generator
 * 
 * Features:
 * 1. Automatic numbering: 090/SPPD/{ROMAN_MONTH}/{YEAR}
 * 2. Fill Google Docs template
 * 3. Save as PDF to specific folder
 * 4. Persist data to Google Sheets
 */

// CONFIGURATION
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
  SHEET_NAME: 'Data_SPPD',
  TEMPLATE_DOC_ID: 'YOUR_GOOGLE_DOCS_TEMPLATE_ID_HERE',
  OUTPUT_FOLDER_ID: 'YOUR_DRIVE_FOLDER_ID_HERE',
  IMAGE_SIGNATURE_ID: 'YOUR_SIGNATURE_IMAGE_ID_HERE' // Optional
};

/**
 * Handle Web App GET request
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('SPPD Generator')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Main function to submit SPPD data from Frontend
 */
function submitSPPD(data) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    // 1. Generate Number
    const nomorSppd = generateNomorSppd(sheet);
    
    // 2. Generate PDF from Template
    const pdfUrl = generatePDF(data, nomorSppd);
    
    // 3. Append to Sheet
    const rowData = [
      Utilities.getUuid(),
      nomorSppd,
      data.nama,
      data.nip,
      data.jabatan,
      data.tujuan,
      data.tanggalBerangkat,
      data.tanggalKembali,
      data.lamaHari,
      pdfUrl,
      new Date()
    ];
    sheet.appendRow(rowData);
    
    return { success: true, nomorSppd, pdfUrl };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Helper to generate Automatic Number
 */
function generateNomorSppd(sheet) {
  const lastRow = sheet.getLastRow();
  const index = lastRow < 2 ? 1 : lastRow; // Simple increment
  const paddedIndex = index.toString().padStart(3, '0');
  
  const now = new Date();
  const monthRoman = toRoman(now.getMonth() + 1);
  const year = now.getFullYear();
  
  return `${paddedIndex}/090/SPPD/${monthRoman}/${year}`;
}

/**
 * Core function to handle Google Docs Template Replacement & PDF Conversion
 */
function generatePDF(data, nomorSppd) {
  const template = DriveApp.getFileById(CONFIG.TEMPLATE_DOC_ID);
  const folder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
  
  // Create temp copy
  const copy = template.makeCopy(`SPPD_${data.nama}_${nomorSppd}`, folder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();
  
  // Replace Placeholders
  // Use format {{PLACEHOLDER}} in your Google Doc template
  const replacements = {
    '{{NOMOR_SPPD}}': nomorSppd,
    '{{NAMA}}': data.nama,
    '{{NIP}}': data.nip,
    '{{JABATAN}}': data.jabatan,
    '{{PANGKAT_GOL}}': data.pangkatGol,
    '{{MAKSUD}}': data.maksudPerjalanan,
    '{{TUJUAN}}': data.tujuan,
    '{{TGL_BERANGKAT}}': formatIndoDate(data.tanggalBerangkat),
    '{{TGL_KEMBALI}}': formatIndoDate(data.tanggalKembali),
    '{{LAMA}}': data.lamaHari,
    '{{TRANSPORTASI}}': data.transportasi,
    '{{INSTANSI_TUJUAN}}': data.instansiTujuan,
    '{{TGL_TTD}}': formatIndoDate(new Date()),
    '{{PEJABAT}}': data.pejabatPenandatangan
  };
  
  for (let key in replacements) {
    body.replaceText(key, replacements[key]);
  }
  
  doc.saveAndClose();
  
  // Convert to PDF
  const pdfBlob = copy.getAs('application/pdf');
  const pdfFile = folder.createFile(pdfBlob);
  
  // Clean up: delete temp doc
  DriveApp.getFileById(copy.getId()).setTrashed(true);
  
  return pdfFile.getUrl();
}

/**
 * Fetch all data for Dashboard
 */
function getData() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  
  // Remove header
  values.shift();
  
  return values.map(r => ({
    id: r[0],
    nomorSppd: r[1],
    nama: r[2],
    nip: r[3],
    jabatan: r[4],
    tujuan: r[5],
    tanggalBerangkat: r[6],
    tanggalKembali: r[7],
    lamaHari: r[8],
    filePdfUrl: r[9],
    timestamp: r[10]
  }));
}

// UTILITIES
function toRoman(num) {
  const roman = {12:'XII',11:'XI',10:'X',9:'IX',8:'VIII',7:'VII',6:'VI',5:'V',4:'IV',3:'III',2:'II',1:'I'};
  return roman[num] || 'I';
}

function formatIndoDate(dateStr) {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const date = new Date(dateStr);
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

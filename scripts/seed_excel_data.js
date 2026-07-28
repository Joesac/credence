const Database = require('better-sqlite3');
const XLSX = require('xlsx');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// ==============================================================================
// CONFIGURATION & SETUP
// ==============================================================================

// 1. Enter the Receiver / User ID who logged in and processed these deposits
const USER_ID = '1bcbaa15-5c95-47d6-83b8-198bc806b2ba';

// 2. Target Year for calculating Sunday dates
const TARGET_YEAR = 2026;

// 3. File paths (adjust if your file is located elsewhere)
const DB_PATH = path.join(__dirname, '../local.db'); // Adjust to your actual SQLite .db file path
const EXCEL_PATH = path.join(__dirname, '../../TVC SUSU Prepared data for application.xlsx');

// Month lookup dictionary mapping month names/abbreviations to 0-based month index
const MONTH_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

/**
 * Calculates the exact Sunday ISO timestamp for a given Year, Month, and Week number.
 */
function getSundayDate(year, monthIndex, weekNumber) {
  const date = new Date(year, monthIndex, 1);

  // Find the first Sunday of the month (0 = Sunday)
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1);
  }

  // Advance by (weekNumber - 1) weeks
  date.setDate(date.getDate() + (weekNumber - 1) * 7);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} 09:00:00`;
}

function seedDatabase() {
  if (USER_ID === 'YOUR_USER_ID_HERE') {
    console.error('❌ ERROR: Please set USER_ID at the top of the script with your actual user/receiver ID.');
    process.exit(1);
  }

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ ERROR: Could not find Excel file at path: ${EXCEL_PATH}`);
    process.exit(1);
  }

  console.log('🔄 Opening SQLite database...');
  const db = new Database(DB_PATH);

  const findMemberByAccount = db.prepare('SELECT id FROM members WHERE account_number = ?');
  
  const insertMember = db.prepare(`
    INSERT INTO members (
      id, fullname, account_number, telephoneNumber, location, creator_id, date_created, date_updated, is_deleted, is_synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
  `);

  const insertDeposit = db.prepare(`
    INSERT INTO deposits (
      id, transaction_id, member_id, received_by, payment_method, amount, refreshment_token, notes, is_cancelled, date_created, date_updated, is_synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0)
  `);

  console.log('📊 Reading Excel file...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Extract raw 2D matrix of sheet cells
  const rawMatrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawMatrix.length === 0) {
    console.warn('⚠️ Excel sheet appears to be empty!');
    return;
  }

  // Debug log top 5 raw rows to see exact structure
  console.log('🔍 RAW EXCEL ROWS 0 TO 4:');
  for (let i = 0; i < Math.min(rawMatrix.length, 5); i++) {
    console.log(`  Row ${i}:`, rawMatrix[i].slice(0, 10));
  }

  // Find where data actually starts by looking for member rows after headers
  // Usually headers span rows 0, 1, 2 and data starts at row 3 or 4
  let dataStartIdx = -1;
  for (let i = 0; i < rawMatrix.length; i++) {
    const row = rawMatrix[i];
    if (!row) continue;
    
    // Check if row contains a realistic account code / member entry
    const hasCodeOrName = row.some(cell => {
      const str = String(cell).trim();
      return str.length > 2 && !['NAME', 'CODE', 'AMOUNT', 'DUES', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].includes(str.toUpperCase());
    });

    if (hasCodeOrName && i >= 2) {
      dataStartIdx = i;
      break;
    }
  }

  if (dataStartIdx === -1) {
    dataStartIdx = 3; // Fallback
  }

  console.log(`✅ Data start detected at row ${dataStartIdx + 1} (0-indexed ${dataStartIdx})`);

  // Build column metadata array for all columns
  // We forward-fill Month from row 0, Week from row 1 (if present), and Type from row 2
  const maxCols = Math.max(...rawMatrix.slice(0, dataStartIdx).map(r => r.length));
  const colMetadata = [];

  let currentMonth = '';
  let currentWeek = '';

  for (let col = 0; col < maxCols; col++) {
    // Look across header rows prior to dataStartIdx
    for (let r = 0; r < dataStartIdx; r++) {
      const cellVal = String((rawMatrix[r] && rawMatrix[r][col]) || '').trim().toLowerCase();

      // Check for Month
      for (const mKey of Object.keys(MONTH_MAP)) {
        if (cellVal.includes(mKey)) {
          currentMonth = mKey;
          break;
        }
      }

      // Check for Week
      const weekMatch = cellVal.match(/(?:wk|week|w)[_\s-]*(\d+)/i) || cellVal.match(/^(\d+)$/);
      if (weekMatch) {
        currentWeek = `wk${weekMatch[1]}`;
      }
    }

    // Determine cell role/type for this column from row immediately before data or previous header rows
    let colType = 'unknown';
    for (let r = 0; r < dataStartIdx; r++) {
      const cellVal = String((rawMatrix[r] && rawMatrix[r][col]) || '').trim().toLowerCase();
      if (cellVal.includes('name') || cellVal.includes('member') || cellVal.includes('client')) colType = 'name';
      else if (cellVal.includes('code') || cellVal.includes('acc') || cellVal.includes('account')) colType = 'code';
      else if (cellVal.includes('phone') || cellVal.includes('tel') || cellVal.includes('contact')) colType = 'phone';
      else if (cellVal.includes('loc') || cellVal.includes('address') || cellVal.includes('branch')) colType = 'location';
      else if (cellVal.includes('amount') || cellVal.includes('amt') || cellVal.includes('dep')) colType = 'amount';
      else if (cellVal.includes('due') || cellVal.includes('token') || cellVal.includes('refreshment')) colType = 'dues';
    }

    colMetadata.push({
      colIndex: col,
      month: currentMonth,
      week: currentWeek,
      type: colType
    });
  }

  console.log('🔍 Parsed Column Metadata Sample (First 10 columns):', colMetadata.slice(0, 10));

  let membersInserted = 0;
  let depositsInserted = 0;

  const runSeedingTransaction = db.transaction(() => {
    for (let r = dataStartIdx; r < rawMatrix.length; r++) {
      const rowData = rawMatrix[r];
      if (!rowData || rowData.length === 0) continue;

      let fullname = '';
      let accountNumber = '';
      let telephone = 'N/A';
      let location = 'N/A';

      // First pass: extract member details from row
      colMetadata.forEach(meta => {
        const val = String(rowData[meta.colIndex] || '').trim();
        if (!val) return;

        if (meta.type === 'name' && !fullname) fullname = val;
        if (meta.type === 'code' && !accountNumber) accountNumber = val;
        if (meta.type === 'phone' && telephone === 'N/A') telephone = val;
        if (meta.type === 'location' && location === 'N/A') location = val;
      });

      // Skip row if missing core member info
      if (!fullname || !accountNumber) {
        continue;
      }

      // Check or create member
      let memberRecord = findMemberByAccount.get(accountNumber);
      let memberId;

      if (memberRecord) {
        memberId = memberRecord.id;
      } else {
        memberId = crypto.randomUUID();
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

        insertMember.run(
          memberId,
          fullname,
          accountNumber,
          telephone,
          location,
          USER_ID,
          now,
          now
        );
        membersInserted++;
      }

      // Second pass: group weekly amount and dues columns
      // Map key: "month_week" -> { amount: 0, dues: 0 }
      const weeklyDeposits = {};

      colMetadata.forEach(meta => {
        if (!meta.month || !meta.week) return;

        const key = `${meta.month}_${meta.week}`;
        if (!weeklyDeposits[key]) {
          weeklyDeposits[key] = { month: meta.month, weekNum: parseInt(meta.week.replace('wk', ''), 10), amount: 0, dues: 0 };
        }

        const rawVal = Number(rowData[meta.colIndex]);
        if (!isNaN(rawVal) && rawVal > 0) {
          if (meta.type === 'dues') {
            weeklyDeposits[key].dues = rawVal;
          } else {
            // Default to deposit amount
            weeklyDeposits[key].amount = rawVal;
          }
        }
      });

      // Insert deposit entries for all non-zero weekly deposits
      for (const entry of Object.values(weeklyDeposits)) {
        if (entry.amount <= 0) continue;

        const monthIndex = MONTH_MAP[entry.month];
        if (monthIndex === undefined) continue;

        const sundayDateStr = getSundayDate(TARGET_YEAR, monthIndex, entry.weekNum);
        const depositId = crypto.randomUUID();
        const transactionId = `TXN-${TARGET_YEAR}${(monthIndex + 1).toString().padStart(2, '0')}${entry.weekNum}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        insertDeposit.run(
          depositId,
          transactionId,
          memberId,
          USER_ID,
          'cash',
          entry.amount,
          entry.dues,
          `Imported Excel entry for ${entry.month.toUpperCase()} Week ${entry.weekNum}`,
          sundayDateStr,
          sundayDateStr
        );

        depositsInserted++;
      }
    }
  });

  try {
    runSeedingTransaction();
    console.log('----------------------------------------------------');
    console.log('🎉 EXCEL IMPORT COMPLETED SUCCESSFULLY!');
    console.log(`👤 Members Created:  ${membersInserted}`);
    console.log(`💰 Deposits Created: ${depositsInserted}`);
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('❌ Error executing database seeding transaction:', error);
  } finally {
    db.close();
  }
}

// Run the script
seedDatabase();
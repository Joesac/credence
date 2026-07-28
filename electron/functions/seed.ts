import Database from 'better-sqlite3';
import * as XLSX from 'xlsx';
import { randomUUID, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { DEFAULT_ADMIN_USER_ID } from '../constants';

// Month lookup dictionary mapping month names/abbreviations to 0-based month index
const MONTH_MAP: Record<string, number> = {
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
function getSundayDate(year: number, monthIndex: number, weekNumber: number): string {
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

export function runExcelSeed(db: Database.Database, excelPath: string, userId: string, targetYear: number = 2026): void {
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ ERROR: Could not find Excel file at path: ${excelPath}`);
    return;
  }

  const findMemberByAccount = db.prepare('SELECT id FROM members WHERE account_number = ?');
  
  const insertMember = db.prepare(`
    INSERT INTO members (
      id, fullname, account_number, telephoneNumber, location, creator_id, date_created, date_updated, is_deleted, is_synced, is_disabled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
  `);

  const insertDeposit = db.prepare(`
    INSERT INTO deposits (
      id, transaction_id, member_id, received_by, payment_method, amount, refreshment_token, notes, is_cancelled, date_created, date_updated, is_synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0)
  `);

  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Extract raw 2D matrix of sheet cells
  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawMatrix.length === 0) {
    console.warn('⚠️ Excel sheet appears to be empty!');
    return;
  }

  // Find where data actually starts by looking for member rows after headers
  let dataStartIdx = -1;
  for (let i = 0; i < rawMatrix.length; i++) {
    const row = rawMatrix[i];
    if (!row) continue;
    
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

  console.log(`Data start detected at row ${dataStartIdx + 1} (0-indexed ${dataStartIdx})`);

  const maxCols = Math.max(...rawMatrix.slice(0, dataStartIdx).map(r => r.length));
  const colMetadata: any[] = [];

  let currentMonth = '';
  let currentWeek = '';

  for (let col = 0; col < maxCols; col++) {
    for (let r = 0; r < dataStartIdx; r++) {
      const cellVal = String((rawMatrix[r] && rawMatrix[r][col]) || '').trim().toLowerCase();

      for (const mKey of Object.keys(MONTH_MAP)) {
        if (cellVal.includes(mKey)) {
          currentMonth = mKey;
          break;
        }
      }

      const weekMatch = cellVal.match(/(?:wk|week|w)[_\s-]*(\d+)/i) || cellVal.match(/^(\d+)$/);
      if (weekMatch) {
        currentWeek = `wk${weekMatch[1]}`;
      }
    }

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

      colMetadata.forEach(meta => {
        const val = String(rowData[meta.colIndex] || '').trim();
        if (!val) return;

        if (meta.type === 'name' && !fullname) fullname = val;
        if (meta.type === 'code' && !accountNumber) accountNumber = val;
        if (meta.type === 'phone' && telephone === 'N/A') telephone = val;
        if (meta.type === 'location' && location === 'N/A') location = val;
      });

      if (!fullname || !accountNumber) {
        continue;
      }

      let memberRecord = findMemberByAccount.get(accountNumber) as { id: string } | undefined;
      let memberId: string;

      if (memberRecord) {
        memberId = memberRecord.id;
      } else {
        memberId = randomUUID();
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

        insertMember.run(
          memberId,
          fullname,
          accountNumber,
          telephone,
          location,
          userId,
          now,
          now
        );
        membersInserted++;
      }

      const weeklyDeposits: Record<string, any> = {};

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
          } else if (meta.type === 'amount') {
            weeklyDeposits[key].amount = rawVal;
          }
        }
      });

      for (const entry of Object.values(weeklyDeposits)) {
        if (entry.amount <= 0) continue;

        const monthIndex = MONTH_MAP[entry.month];
        if (monthIndex === undefined) continue;

        const sundayDateStr = getSundayDate(targetYear, monthIndex, entry.weekNum);
        const depositId = randomUUID();
        const transactionId = `TXN-${targetYear}${(monthIndex + 1).toString().padStart(2, '0')}${entry.weekNum}-${randomBytes(3).toString('hex').toUpperCase()}`;

        insertDeposit.run(
          depositId,
          transactionId,
          memberId,
          userId,
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
    console.log('EXCEL IMPORT COMPLETED SUCCESSFULLY!');
    console.log(`Members Created:  ${membersInserted}`);
    console.log(`Deposits Created: ${depositsInserted}`);
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('Error executing database seeding transaction:', error);
    throw error;
  }
}

/**
 * Checks if the members table is empty and triggers auto-seeding if an Excel file is found.
 * This is called during app startup in main.ts.
 */
export function autoSeedIfEmpty(db: Database.Database): void {
  const memberCount = (db.prepare('SELECT COUNT(*) as count FROM members').get() as { count: number }).count;
  if (memberCount === 0) {
    const excelFilename = 'prepared_data_for_application.xlsx';
    
    // In dev, the file is in the project root. In prod, it's next to the executable.
    const seedPath = app.isPackaged
      ? path.join(path.dirname(app.getPath('exe')), excelFilename)
      : path.join(app.getAppPath(), excelFilename);

    if (fs.existsSync(seedPath)) {
      console.log(`Auto-seeding detected. Importing from ${seedPath}...`);
      try {
        runExcelSeed(db, seedPath, DEFAULT_ADMIN_USER_ID);
      } catch (error) {
        console.error('Auto-seeding failed:', error);
      }
    }
  }
}

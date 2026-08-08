import { app, BrowserWindow, Menu } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import {
  CREATE_USERS_TABLE,
  CREATE_MEMBERS_TABLE,
  CREATE_DEPOSITS_TABLE,
  CREATE_WITHDRAWALS_TABLE,
  CREATE_LOANS_TABLE,
  CREATE_LOAN_REPAYMENTS_TABLE,
  CREATE_FUND_DISTRIBUTIONS_TABLE,
} from './database/index';
import {
  DEVELOPMENT_DATABASE_FILENAME,
  IPC_CHANNEL_ADD_DEPOSIT,
  IPC_CHANNEL_ADD_LOAN,
  IPC_CHANNEL_ADD_MEMBER,
  IPC_CHANNEL_ADD_USER,
  IPC_CHANNEL_ADD_WITHDRAWAL,
  IPC_CHANNEL_DELETE_DEPOSIT,
  IPC_CHANNEL_DELETE_LOAN,
  IPC_CHANNEL_ADD_LOAN_REPAYMENT,
  IPC_CHANNEL_GET_LOAN_REPAYMENTS_BY_LOAN_ID,
  IPC_CHANNEL_UPDATE_LOAN_REPAYMENT,
  IPC_CHANNEL_DELETE_LOAN_REPAYMENT,
  IPC_CHANNEL_DELETE_MEMBER,
  IPC_CHANNEL_DELETE_WITHDRAWAL,
  IPC_CHANNEL_GET_DEPOSITS,
  IPC_CHANNEL_GET_LOANS,
  IPC_CHANNEL_GET_MEMBER_BY_ID,
  IPC_CHANNEL_GET_MEMBER_FINANCIALS,
  IPC_CHANNEL_GET_MEMBER_LOANS,
  IPC_CHANNEL_GET_MEMBERS,
  IPC_CHANNEL_GET_USERS,
  IPC_CHANNEL_GET_USER_BY_ID,
  IPC_CHANNEL_GET_WITHDRAWALS,
  IPC_CHANNEL_LOGIN_USER,
  IPC_CHANNEL_LOGOUT_USER,
  IPC_CHANNEL_VERIFY_PASSWORD,
  IPC_CHANNEL_UPDATE_DEPOSIT,
  IPC_CHANNEL_UPDATE_LOAN,
  IPC_CHANNEL_UPDATE_MEMBER,
  IPC_CHANNEL_UPDATE_USER,
  IPC_CHANNEL_UPDATE_WITHDRAWAL,
  IPC_CHANNEL_GET_DASHBOARD_DATA,
  IPC_CHANNEL_GET_DAILY_SUMMARY,
  IPC_CHANNEL_TOGGLE_USER_STATUS,
  IPC_CHANNEL_CREATE_FUND_DISTRIBUTION,
  IPC_CHANNEL_GET_FUND_DISTRIBUTION_STATS,
  IPC_CHANNEL_GET_GLOBAL_FUND_DISTRIBUTION_STATS,
  IPC_CHANNEL_GET_VERSION,
  PRODUCTION_DATABASE_FILENAME,
  DEFAULT_ADMIN_USER_ID,
} from './constants';
import {
  fetchUsers,
  createUser,
  fetchUserById,
  loginUser,
  logoutUser,
  seedDefaultAdminUser,
  updateUser,
  verifyUserPassword,
  toggleUserStatus,
} from './functions/users';
import {
  fetchMembers,
  createMember,
  fetchMemberById,
  updateMember,
  deleteMember,
} from './functions/members';
import {
  createDeposit,
  deleteDeposit,
  fetchDeposits,
  fetchMemberFinancialSummary,
  updateDeposit,
  createWithdrawal,
  deleteWithdrawal,
  fetchWithdrawals,
  fetchDailySummary,
  updateWithdrawal,
} from './functions/transactions';
import {
  CreateMemberPayload,
  CreateUserPayload,
  CreateDepositPayload,
  CreateWithdrawalPayload,
  CreateLoanPayload,
  DeleteMemberPayload,
  DeleteDepositPayload,
  DeleteLoanPayload,
  DeleteWithdrawalPayload,
  DepositQueryOptions,
  FetchMembersPayload,
  LoanQueryOptions,
  LoginUserPayload,
  LogoutUserPayload,
  VerifyPasswordPayload,
  MemberFinancialSummaryPayload,
  UpdateMemberPayload,
  UpdateUserPayload,
  UpdateDepositPayload,
  UpdateLoanPayload,
  UpdateWithdrawalPayload,
  WithdrawalQueryOptions,
  CreateLoanRepaymentPayload,
  UpdateLoanRepaymentPayload,
  DeleteLoanRepaymentPayload,
  PaginationRequest,
  DashboardData,
  DailySummaryPayload,
  CreateFundDistributionPayload,
  FundDistributionMemberStatsPayload,
} from './types';
import {
  createLoan,
  updateLoan,
  deleteLoan,
  fetchLoans,
  fetchLoansByMember,
  fetchLoanRepaymentsByLoanId,
  createLoanRepayment,
  updateLoanRepayment,
  deleteLoanRepayment,
} from './functions/loans';
import { fetchDashboardData } from './functions/dashboard';
import {
  createFundDistribution,
  getFundDistributionStats,
  getGlobalFundDistributionStats,
} from './functions/fund-distributions';
import { runMigrations } from './migration';
import { registerIpcHandler } from './ipc';

// Handles creating/removing shortcuts on Windows when installing/uninstalling
if (squirrelStartup) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let db: Database.Database;

function initDatabase(): void {
  /**
   * Resolves environment-aware database path and runs startup migrations.
   * This ensures both dev and packaged builds initialize against the correct SQLite file.
   */
  let dbPath: string;
  
  if (!app.isPackaged) {
    // DEVELOPMENT: Save the database directly in the project root folder
    // This makes it easy to find
    dbPath = path.join(__dirname, `../${DEVELOPMENT_DATABASE_FILENAME}`);
  } else {
    // PRODUCTION: Save it in the system's AppData folder where write permissions are guaranteed
    dbPath = path.join(app.getPath('userData'), PRODUCTION_DATABASE_FILENAME);
  }

  db = new Database(dbPath);

  // Enable WAL performance mode and run initial migrations
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(CREATE_USERS_TABLE);
  db.exec(CREATE_MEMBERS_TABLE);
  db.exec(CREATE_DEPOSITS_TABLE);
  db.exec(CREATE_WITHDRAWALS_TABLE);
  db.exec(CREATE_LOANS_TABLE);
  db.exec(CREATE_LOAN_REPAYMENTS_TABLE);
  db.exec(CREATE_FUND_DISTRIBUTIONS_TABLE);
  runMigrations(db);

  seedDefaultAdminUser(db);
}

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 520,
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#09090B',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const splashPath = !app.isPackaged
    ? path.join(__dirname, '../public/splash.html')
    : path.join(app.getAppPath(), 'dist/credence/browser/splash.html');

  splashWindow.loadFile(splashPath).catch((err) => {
    console.error('Failed to load splash screen', err);
  });

  splashWindow.on('ready-to-show', () => {
    splashWindow?.show();
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createWindow(): void {
    mainWindow = new BrowserWindow({
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#09090B',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../electron/assets/icons/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // If running in dev, load the Angular live dev server. Otherwise, load the dist build.
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
  } else {
    // app.getAppPath() reliably targets the root inside app.asar in production
    const indexPath = path.join(app.getAppPath(), 'dist/credence/browser/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      mainWindow?.maximize();
      splashWindow?.close();
      mainWindow?.show();
      if (isDev) {
        mainWindow?.webContents.openDevTools();
      }
    }, 800);
  });
}

/**
 * IPC Channel Handlers (Listens to Angular requests)
 * */
registerIpcHandler(IPC_CHANNEL_GET_VERSION, async () => app.getVersion());

registerIpcHandler(IPC_CHANNEL_GET_USERS, async () => fetchUsers(db));

registerIpcHandler(IPC_CHANNEL_ADD_USER, async (payload: CreateUserPayload) =>
  createUser(db, payload)
);

registerIpcHandler(IPC_CHANNEL_GET_USER_BY_ID, async (payload: { id: string } | string) => {
  const id = typeof payload === 'string' ? payload : payload?.id;
  if (!id) {
    throw new Error('Missing user id payload');
  }
  return fetchUserById(db, id);
});

registerIpcHandler(IPC_CHANNEL_LOGIN_USER, async (payload: LoginUserPayload) =>
  loginUser(db, payload)
);

registerIpcHandler(IPC_CHANNEL_LOGOUT_USER, async (payload: LogoutUserPayload) =>
  logoutUser(db, payload)
);

registerIpcHandler(IPC_CHANNEL_UPDATE_USER, async (payload: UpdateUserPayload) =>
  updateUser(db, payload)
);

registerIpcHandler(IPC_CHANNEL_VERIFY_PASSWORD, async (payload: VerifyPasswordPayload) =>
  verifyUserPassword(db, payload)
);

registerIpcHandler(IPC_CHANNEL_GET_MEMBERS, async (payload: FetchMembersPayload) =>
  fetchMembers(db, payload)
);

registerIpcHandler(IPC_CHANNEL_GET_MEMBER_BY_ID, async (payload: { id: string } | string) => {
  const id = typeof payload === 'string' ? payload : payload?.id;
  if (!id) {
    throw new Error('Missing member id payload');
  }
  return fetchMemberById(db, id);
});

registerIpcHandler(
  IPC_CHANNEL_GET_MEMBER_FINANCIALS,
  async (payload: MemberFinancialSummaryPayload) => {
    if (!payload?.memberId) {
      throw new Error('Missing member id payload');
    }
    return fetchMemberFinancialSummary(db, payload);
  }
);

registerIpcHandler(IPC_CHANNEL_ADD_MEMBER, async (payload: CreateMemberPayload) =>
  createMember(db, payload)
);

registerIpcHandler(IPC_CHANNEL_UPDATE_MEMBER, async (payload: UpdateMemberPayload) =>
  updateMember(db, payload)
);

registerIpcHandler(IPC_CHANNEL_DELETE_MEMBER, async (payload: DeleteMemberPayload) =>
  deleteMember(db, payload)
);

registerIpcHandler(IPC_CHANNEL_GET_DEPOSITS, async (options: DepositQueryOptions) =>
  fetchDeposits(db, options)
);

registerIpcHandler(IPC_CHANNEL_ADD_DEPOSIT, async (payload: CreateDepositPayload) =>
  createDeposit(db, payload)
);

registerIpcHandler(IPC_CHANNEL_UPDATE_DEPOSIT, async (payload: UpdateDepositPayload) =>
  updateDeposit(db, payload)
);

registerIpcHandler(IPC_CHANNEL_DELETE_DEPOSIT, async (payload: DeleteDepositPayload) =>
  deleteDeposit(db, payload)
);

registerIpcHandler(IPC_CHANNEL_GET_WITHDRAWALS, async (options: WithdrawalQueryOptions) =>
  fetchWithdrawals(db, options)
);

registerIpcHandler(IPC_CHANNEL_ADD_WITHDRAWAL, async (payload: CreateWithdrawalPayload) =>
  createWithdrawal(db, payload)
);

registerIpcHandler(IPC_CHANNEL_UPDATE_WITHDRAWAL, async (payload: UpdateWithdrawalPayload) =>
  updateWithdrawal(db, payload)
);

registerIpcHandler(IPC_CHANNEL_DELETE_WITHDRAWAL, async (payload: DeleteWithdrawalPayload) =>
  deleteWithdrawal(db, payload)
);

registerIpcHandler(IPC_CHANNEL_GET_LOANS, async (options: LoanQueryOptions) =>
  fetchLoans(db, options)
);

registerIpcHandler(IPC_CHANNEL_GET_MEMBER_LOANS, async (payload: { memberId: string } & LoanQueryOptions) => {
  if (!payload?.memberId) {
    throw new Error('Missing member id payload');
  }
  const { memberId, ...rest } = payload;
  return fetchLoansByMember(db, memberId, rest);
});

registerIpcHandler(IPC_CHANNEL_ADD_LOAN, async (payload: CreateLoanPayload) =>
  createLoan(db, payload)
);

registerIpcHandler(IPC_CHANNEL_UPDATE_LOAN, async (payload: UpdateLoanPayload) =>
  updateLoan(db, payload)
);

registerIpcHandler(IPC_CHANNEL_DELETE_LOAN, async (payload: DeleteLoanPayload) =>
  deleteLoan(db, payload)
);

registerIpcHandler(IPC_CHANNEL_ADD_LOAN_REPAYMENT, async (payload: CreateLoanRepaymentPayload) =>
  createLoanRepayment(db, payload)
);

registerIpcHandler(IPC_CHANNEL_UPDATE_LOAN_REPAYMENT, async (payload: UpdateLoanRepaymentPayload) =>
  updateLoanRepayment(db, payload)
);

registerIpcHandler(IPC_CHANNEL_DELETE_LOAN_REPAYMENT, async (payload: DeleteLoanRepaymentPayload) =>
  deleteLoanRepayment(db, payload)
);

registerIpcHandler(IPC_CHANNEL_GET_LOAN_REPAYMENTS_BY_LOAN_ID, async (payload: { loanId: string } & PaginationRequest) => {
  if (!payload?.loanId) {
    throw new Error('Missing loan id payload');
  }
  return fetchLoanRepaymentsByLoanId(db, payload.loanId, payload);
});

registerIpcHandler(IPC_CHANNEL_TOGGLE_USER_STATUS, async (payload: { userId: string } | string) => {
  const userId = typeof payload === 'string' ? payload : payload?.userId;
  if (!userId) {
    throw new Error('Missing userId payload');
  }
  return toggleUserStatus(db, userId);
});

registerIpcHandler(IPC_CHANNEL_GET_DASHBOARD_DATA, async () =>
  fetchDashboardData(db)
);

registerIpcHandler(IPC_CHANNEL_GET_DAILY_SUMMARY, async (payload: DailySummaryPayload) => {
  if (!payload?.date) {
    throw new Error('Missing date payload');
  }
  return fetchDailySummary(db, payload.date);
});

registerIpcHandler(IPC_CHANNEL_GET_FUND_DISTRIBUTION_STATS, async (payload: FundDistributionMemberStatsPayload) => {
  if (!payload?.memberId) {
    throw new Error('Missing member id payload');
  }
  return getFundDistributionStats(db, payload);
});

registerIpcHandler(IPC_CHANNEL_GET_GLOBAL_FUND_DISTRIBUTION_STATS, async () =>
  getGlobalFundDistributionStats(db)
);

registerIpcHandler(IPC_CHANNEL_CREATE_FUND_DISTRIBUTION, async (payload: CreateFundDistributionPayload) =>
  createFundDistribution(db, payload)
);

app.whenReady().then(() => {
  if (app.isPackaged) {
    Menu.setApplicationMenu(null);
  }
  initDatabase();
  createSplashWindow();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
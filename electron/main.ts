import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import Database from 'better-sqlite3';
import {
  CREATE_USERS_TABLE,
  CREATE_MEMBERS_TABLE,
  CREATE_DEPOSITS_TABLE,
  CREATE_WITHDRAWALS_TABLE,
  CREATE_LOANS_TABLE,
  CREATE_LOAN_REPAYMENTS_TABLE,
} from './database/index';
import {
  DEVELOPMENT_DATABASE_FILENAME,
  IPC_CHANNEL_ADD_DEPOSIT,
  IPC_CHANNEL_ADD_MEMBER,
  IPC_CHANNEL_ADD_USER,
  IPC_CHANNEL_ADD_WITHDRAWAL,
  IPC_CHANNEL_DELETE_DEPOSIT,
  IPC_CHANNEL_DELETE_MEMBER,
  IPC_CHANNEL_DELETE_WITHDRAWAL,
  IPC_CHANNEL_GET_DEPOSITS,
  IPC_CHANNEL_GET_MEMBER_BY_ID,
  IPC_CHANNEL_GET_MEMBER_FINANCIALS,
  IPC_CHANNEL_GET_MEMBERS,
  IPC_CHANNEL_GET_USERS,
  IPC_CHANNEL_GET_USER_BY_ID,
  IPC_CHANNEL_GET_WITHDRAWALS,
  IPC_CHANNEL_LOGIN_USER,
  IPC_CHANNEL_LOGOUT_USER,
  IPC_CHANNEL_UPDATE_DEPOSIT,
  IPC_CHANNEL_UPDATE_MEMBER,
  IPC_CHANNEL_UPDATE_USER,
  IPC_CHANNEL_UPDATE_WITHDRAWAL,
  PRODUCTION_DATABASE_FILENAME,
} from './constants';
import {
  fetchUsers,
  createUser,
  fetchUserById,
  loginUser,
  logoutUser,
  seedDefaultAdminUser,
  updateUser,
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
  updateWithdrawal,
} from './functions/transactions';
import {
  CreateMemberPayload,
  CreateUserPayload,
  CreateDepositPayload,
  CreateWithdrawalPayload,
  DeleteMemberPayload,
  DeleteDepositPayload,
  DeleteWithdrawalPayload,
  DepositQueryOptions,
  FetchMembersPayload,
  LoginUserPayload,
  LogoutUserPayload,
  MemberFinancialSummaryPayload,
  UpdateMemberPayload,
  UpdateUserPayload,
  UpdateDepositPayload,
  UpdateWithdrawalPayload,
  WithdrawalQueryOptions,
} from './types';
import { runMigrations } from './migration';
import { registerIpcHandler } from './ipc';

let mainWindow: BrowserWindow | null = null;
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
  runMigrations(db);

  seedDefaultAdminUser(db);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
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
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/your-angular-app/browser/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * IPC Channel Handlers (Listens to Angular requests)
 * */
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

app.whenReady().then(() => {
  initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
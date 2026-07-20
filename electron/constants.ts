import { UserSeedPayload } from './types';

/**
 * Bridge constants consumed by preload and renderer integration.
 * These values define how Electron APIs are exposed into the renderer context.
 */

/**
 * Bridge key used by preload to expose the Electron IPC API on the renderer window object.
 */
export const ELECTRON_API_BRIDGE_KEY = 'electronAPI';

/**
 * Database constants used for environment-aware SQLite file resolution.
 */

/**
 * Database filename used in packaged production builds under Electron userData path.
 */
export const PRODUCTION_DATABASE_FILENAME = 'credence.db';

/**
 * Relative database filename used during development builds for local testing.
 */
export const DEVELOPMENT_DATABASE_FILENAME = 'local.db';

/**
 * User query constants shared across user data access helpers.
 */
export const USER_BASE_COLUMNS = `
  id,
  fullname,
  username,
  date_created,
  date_updated,
  is_synced
`;

export const USER_BASE_COLUMNS_WITH_PASSWORD = `${USER_BASE_COLUMNS}, password`;

export const MEMBER_BASE_COLUMNS = `
  id,
  fullname,
  account_number,
  telephoneNumber,
  location,
  creator_id,
  date_created,
  date_updated,
  is_deleted,
  is_synced
`;

export const DEPOSIT_BASE_COLUMNS = `
  id,
  member_id,
  received_by,
  payment_method,
  amount,
  notes,
  is_cancelled,
  date_created,
  date_updated,
  is_synced
`;

export const WITHDRAWAL_BASE_COLUMNS = `
  id,
  member_id,
  issuer_id,
  amount,
  notes,
  is_cancelled,
  date_created,
  date_updated,
  is_synced
`;

/**
 * Default user seed constants for first-run system initialization.
 */
export const DEFAULT_ADMIN_USER: UserSeedPayload = {
  fullname: 'Super Admin',
  username: 'admin',
  password: 'Joesac123?',
};

/**
 * IPC channel constants shared by Electron main handlers and preload bridge invocations.
 */
export const IPC_CHANNEL_GET_USERS = 'get-users';
export const IPC_CHANNEL_ADD_USER = 'add-user';
export const IPC_CHANNEL_GET_USER_BY_ID = 'get-user-by-id';
export const IPC_CHANNEL_LOGIN_USER = 'login-user';
export const IPC_CHANNEL_LOGOUT_USER = 'logout-user';
export const IPC_CHANNEL_UPDATE_USER = 'update-user';
export const IPC_CHANNEL_GET_MEMBERS = 'get-members';
export const IPC_CHANNEL_GET_MEMBER_BY_ID = 'get-member-by-id';
export const IPC_CHANNEL_ADD_MEMBER = 'add-member';
export const IPC_CHANNEL_UPDATE_MEMBER = 'update-member';
export const IPC_CHANNEL_DELETE_MEMBER = 'delete-member';
export const IPC_CHANNEL_GET_DEPOSITS = 'get-deposits';
export const IPC_CHANNEL_ADD_DEPOSIT = 'add-deposit';
export const IPC_CHANNEL_UPDATE_DEPOSIT = 'update-deposit';
export const IPC_CHANNEL_DELETE_DEPOSIT = 'delete-deposit';
export const IPC_CHANNEL_GET_WITHDRAWALS = 'get-withdrawals';
export const IPC_CHANNEL_ADD_WITHDRAWAL = 'add-withdrawal';
export const IPC_CHANNEL_UPDATE_WITHDRAWAL = 'update-withdrawal';
export const IPC_CHANNEL_DELETE_WITHDRAWAL = 'delete-withdrawal';
export const IPC_CHANNEL_GET_MEMBER_FINANCIALS = 'get-member-financials';

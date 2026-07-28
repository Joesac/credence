import Database from 'better-sqlite3';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import {
  DEFAULT_ADMIN_USER_ID,
  DEFAULT_ADMIN_USER,
  USER_BASE_COLUMNS_WITH_PASSWORD,
} from '../constants';
import {
  CreateUserPayload,
  DbUserRow,
  LoginUserPayload,
  LogoutUserPayload,
  SanitizedUser,
  UpdateUserPayload,
  VerifyPasswordPayload,
} from '../types';
import { createIpcError } from '../errors';

function sanitizeUser(row: DbUserRow): SanitizedUser {
  const { password: _password, ...rest } = row;
  return rest;
}

function hashPassword(raw: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(raw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(raw: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = scryptSync(raw, salt, 64);
  const storedBuffer = Buffer.from(hash, 'hex');
  if (storedBuffer.length !== derived.length) return false;
  return timingSafeEqual(storedBuffer, derived);
}

export function fetchUsers(db: Database.Database) {
  const stmt = db.prepare(
    `SELECT ${USER_BASE_COLUMNS_WITH_PASSWORD} FROM users ORDER BY datetime(date_created) DESC`
  );
  return (stmt.all() as DbUserRow[]).map(sanitizeUser);
}

export function fetchUserById(db: Database.Database, id: string) {
  const stmt = db.prepare(
    `SELECT ${USER_BASE_COLUMNS_WITH_PASSWORD} FROM users WHERE id = @id LIMIT 1`
  );
  const record = stmt.get({ id }) as DbUserRow | undefined;
  if (!record) {
    return null;
  }
  return sanitizeUser(record);
}

export function createUser(db: Database.Database, payload: CreateUserPayload) {
  // Check if username already exists
  const checkStmt = db.prepare('SELECT id FROM users WHERE username = @username LIMIT 1');
  const existing = checkStmt.get({ username: payload.username });
  if (existing) {
    throw createIpcError('USERNAME_TAKEN', 'This username is already taken. Please choose another one.');
  }

  const id = randomUUID();
  const passwordHash = hashPassword(payload.password);
  const insert = db.prepare(`
    INSERT INTO users (id, fullname, username, password)
    VALUES (@id, @fullname, @username, @password)
  `);

  insert.run({
    id,
    fullname: payload.fullname,
    username: payload.username,
    password: passwordHash,
  });

  const select = db.prepare(
    `SELECT ${USER_BASE_COLUMNS_WITH_PASSWORD} FROM users WHERE id = @id LIMIT 1`
  );
  return sanitizeUser(select.get({ id }) as DbUserRow);
}

export function updateUser(db: Database.Database, payload: UpdateUserPayload) {
  // Fetch existing user to verify password and check current state
  const stmt = db.prepare(`SELECT * FROM users WHERE id = @id LIMIT 1`);
  const record = stmt.get({ id: payload.id }) as DbUserRow | undefined;

  if (!record) {
    throw createIpcError('USER_NOT_FOUND', 'The user account could not be located.');
  }

  // Mandatory verification of existing password for any profile updates
  if (!payload.currentPassword || !verifyPassword(payload.currentPassword, record.password)) {
    throw createIpcError('INVALID_CURRENT_PASSWORD', 'The current password you entered is incorrect.');
  }

  const fields: string[] = [];
  const params: Record<string, unknown> = { id: payload.id };

  if (payload.username !== undefined) {
    // Check if the new username is already taken by another user
    const checkStmt = db.prepare('SELECT id FROM users WHERE username = @username AND id != @id LIMIT 1');
    const existing = checkStmt.get({ username: payload.username, id: payload.id });
    if (existing) {
      throw createIpcError('USERNAME_TAKEN', 'This username is already taken. Please choose another one.');
    }

    fields.push('username = @username');
    params.username = payload.username;
  }

  if (payload.fullname !== undefined) {
    fields.push('fullname = @fullname');
    params.fullname = payload.fullname;
  }

  if (payload.password !== undefined) {
    fields.push('password = @password');
    params.password = hashPassword(payload.password);
  }

  if (payload.isDisabled !== undefined) {
    fields.push('is_disabled = @is_disabled');
    params.is_disabled = typeof payload.isDisabled === 'boolean' ? (payload.isDisabled ? 1 : 0) : payload.isDisabled;
  }

  if (!fields.length) {
    return fetchUserById(db, payload.id);
  }

  const update = db.prepare(`
    UPDATE users
    SET ${fields.join(', ')}, date_updated = datetime('now')
    WHERE id = @id
  `);
  const result = update.run(params);
  if (result.changes === 0) {
    return null;
  }
  return fetchUserById(db, payload.id);
}

/**
 * Seeds the default admin account once when it does not already exist.
 * Password hashing is delegated to createUser to guarantee secure storage format.
 */
export function seedDefaultAdminUser(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT id FROM users WHERE username = @username LIMIT 1
  `);
  const existingUser = stmt.get({ username: DEFAULT_ADMIN_USER.username }) as { id: string } | undefined;

  if (existingUser) {
    return;
  }

  createUser(db, DEFAULT_ADMIN_USER);
}

export function loginUser(db: Database.Database, payload: LoginUserPayload) {
  const stmt = db.prepare(
    `SELECT ${USER_BASE_COLUMNS_WITH_PASSWORD} FROM users WHERE username = @username LIMIT 1`
  );
  const record = stmt.get({ username: payload.username }) as DbUserRow | undefined;
  if (!record || !verifyPassword(payload.password, record.password)) {
    throw createIpcError('INVALID_CREDENTIALS', 'Invalid username or password.');
  }
  const update = db.prepare(`
    UPDATE users SET date_updated = datetime('now') WHERE id = @id
  `);
  update.run({ id: record.id });
  
  const recordWithLogin = db.prepare(`
    UPDATE users SET last_login = datetime('now') WHERE id = @id
  `).run({ id: record.id });

  return sanitizeUser(record);
}

export function toggleUserStatus(db: Database.Database, userId: string) {
  const user = fetchUserById(db, userId);
  if (!user) {
    throw createIpcError('USER_NOT_FOUND', 'The user account could not be located.');
  }

  const newStatus = user.is_disabled ? 0 : 1;
  const stmt = db.prepare(`
    UPDATE users SET is_disabled = @newStatus, date_updated = datetime('now') WHERE id = @id
  `);
  stmt.run({ id: userId, newStatus });

  return fetchUserById(db, userId);
}

export function logoutUser(db: Database.Database, payload: LogoutUserPayload) {
  const stmt = db.prepare(`
    UPDATE users SET date_updated = datetime('now') WHERE id = @id
  `);
  stmt.run({ id: payload.userId });
  return { success: true } as const;
}

export function verifyUserPassword(db: Database.Database, payload: VerifyPasswordPayload) {
  const stmt = db.prepare(
    `SELECT ${USER_BASE_COLUMNS_WITH_PASSWORD} FROM users WHERE id = @id LIMIT 1`
  );
  const record = stmt.get({ id: payload.userId }) as DbUserRow | undefined;
  if (!record || !verifyPassword(payload.password, record.password)) {
    throw createIpcError('INVALID_CREDENTIALS', 'Incorrect password. Please try again.');
  }
  return { valid: true } as const;
}

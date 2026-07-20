import Database from 'better-sqlite3';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import {
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
} from '../types';

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
  const fields: string[] = [];
  const params: Record<string, unknown> = { id: payload.id };

  if (payload.fullname !== undefined) {
    fields.push('fullname = @fullname');
    params.fullname = payload.fullname;
  }

  if (payload.username !== undefined) {
    fields.push('username = @username');
    params.username = payload.username;
  }

  if (payload.password !== undefined) {
    fields.push('password = @password');
    params.password = hashPassword(payload.password);
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
    throw new Error('Invalid credentials');
  }
  const update = db.prepare(`
    UPDATE users SET date_updated = datetime('now') WHERE id = @id
  `);
  update.run({ id: record.id });
  return sanitizeUser(record);
}

export function logoutUser(db: Database.Database, payload: LogoutUserPayload) {
  const stmt = db.prepare(`
    UPDATE users SET date_updated = datetime('now') WHERE id = @id
  `);
  stmt.run({ id: payload.userId });
  return { success: true } as const;
}

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
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
  ToggleUserStatusPayload,
  AdminResetUserPasswordPayload,
} from '../types';
import { createIpcError } from '../errors';
import { hashPassword, verifyPassword } from './utils';
import { createAuditLog } from './audit';

function sanitizeUser(row: DbUserRow): SanitizedUser {
  const { password: _password, ...rest } = row;
  return rest;
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
  // Check if username already exists (case-insensitive)
  const checkStmt = db.prepare('SELECT id FROM users WHERE username = @username COLLATE NOCASE LIMIT 1');
  const existing = checkStmt.get({ username: payload.username });
  if (existing) {
    throw createIpcError('USERNAME_TAKEN', 'This username is already taken. Please choose another one.');
  }

  const id = randomUUID();
  const passwordHash = hashPassword(payload.password);
  const role = payload.role ?? 'Regular';
  const insert = db.prepare(`
    INSERT INTO users (id, fullname, username, password, role)
    VALUES (@id, @fullname, @username, @password, @role)
  `);

  insert.run({
    id,
    fullname: payload.fullname,
    username: payload.username,
    password: passwordHash,
    role,
  });

  createAuditLog(db, {
    actorId: payload.actorId ?? id,
    targetId: id,
    action: 'USER_CREATED',
    details: JSON.stringify({ role }),
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
    // Check if the new username is already taken by another user (case-insensitive)
    const checkStmt = db.prepare('SELECT id FROM users WHERE username = @username COLLATE NOCASE AND id != @id LIMIT 1');
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

  if (payload.role !== undefined) {
    fields.push('role = @role');
    params.role = payload.role;
  }

  if (!fields.length) {
    return fetchUserById(db, payload.id);
  }

  const update = db.prepare(`
    UPDATE users
    SET ${fields.join(', ')}, is_synced = 0, date_updated = datetime('now')
    WHERE id = @id
  `);
  const result = update.run(params);
  if (result.changes === 0) {
    return null;
  }

  if (payload.role !== undefined && record.role !== payload.role) {
    createAuditLog(db, {
      actorId: payload.actorId ?? payload.id,
      targetId: payload.id,
      action: 'USER_ROLE_CHANGED',
      details: JSON.stringify({ old_role: record.role, new_role: payload.role }),
    });
  }

  return fetchUserById(db, payload.id);
}

/**
 * Seeds the default admin account once when it does not already exist.
 * Password hashing is delegated to createUser to guarantee secure storage format.
 */
export function seedDefaultAdminUser(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT id FROM users WHERE username = @username COLLATE NOCASE LIMIT 1
  `);
  const existingUser = stmt.get({ username: DEFAULT_ADMIN_USER.username }) as { id: string } | undefined;

  if (existingUser) {
    return;
  }

  createUser(db, DEFAULT_ADMIN_USER);
}

export function loginUser(db: Database.Database, payload: LoginUserPayload) {
  const stmt = db.prepare(
    `SELECT ${USER_BASE_COLUMNS_WITH_PASSWORD} FROM users WHERE username = @username COLLATE NOCASE LIMIT 1`
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

export function toggleUserStatus(db: Database.Database, payload: ToggleUserStatusPayload) {
  const actor = fetchUserById(db, payload.actorId);
  if (!actor || actor.role !== 'Admin') {
    throw createIpcError('FORBIDDEN', 'Only administrators can change user status.');
  }

  const user = fetchUserById(db, payload.userId);
  if (!user) {
    throw createIpcError('USER_NOT_FOUND', 'The user account could not be located.');
  }

  const newStatus = user.is_disabled ? 0 : 1;
  const stmt = db.prepare(`
    UPDATE users SET is_disabled = @newStatus, is_synced = 0, date_updated = datetime('now') WHERE id = @id
  `);
  stmt.run({ id: payload.userId, newStatus });

  createAuditLog(db, {
    actorId: payload.actorId,
    targetId: payload.userId,
    action: newStatus === 1 ? 'USER_DISABLED' : 'USER_ENABLED',
    details: JSON.stringify({ previous_status: user.is_disabled ? 'disabled' : 'active' }),
  });

  return fetchUserById(db, payload.userId);
}

export function adminResetUserPassword(db: Database.Database, payload: AdminResetUserPasswordPayload) {
  const actorStmt = db.prepare(`SELECT * FROM users WHERE id = @id LIMIT 1`);
  const actor = actorStmt.get({ id: payload.actorId }) as DbUserRow | undefined;
  if (!actor || actor.role !== 'Admin') {
    throw createIpcError('FORBIDDEN', 'Only administrators can reset passwords.');
  }

  const target = fetchUserById(db, payload.targetUserId);
  if (!target) {
    throw createIpcError('USER_NOT_FOUND', 'The user account could not be located.');
  }

  if (!payload.actorPassword || !verifyPassword(payload.actorPassword, actor.password)) {
    throw createIpcError('INVALID_ACTOR_PASSWORD', 'Your administrator password is incorrect.');
  }

  const update = db.prepare(`
    UPDATE users SET password = @password, is_synced = 0, date_updated = datetime('now') WHERE id = @id
  `);
  update.run({
    id: payload.targetUserId,
    password: hashPassword(payload.newPassword),
  });

  createAuditLog(db, {
    actorId: payload.actorId,
    targetId: payload.targetUserId,
    action: 'USER_PASSWORD_RESET',
    details: JSON.stringify({ target_was_admin: target.role === 'Admin' }),
  });

  return fetchUserById(db, payload.targetUserId);
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

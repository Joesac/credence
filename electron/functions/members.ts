import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { MEMBER_BASE_COLUMNS } from '../constants';
import {
  CreateMemberPayload,
  DbMemberRow,
  DeleteMemberPayload,
  FetchMembersPayload,
  PaginatedResponse,
  SanitizedMember,
  UpdateMemberPayload,
} from '../types';

function sanitizeMember(row: DbMemberRow): SanitizedMember {
  return row;
}

/**
 * Extracts the trailing numeric sequence from a formatted account number string.
 * Example: "TVC001" -> "001". Returns null when no numeric suffix is present.
 */
function extractAccountSequence(accountNumber: string): string | null {
  const match = accountNumber.match(/(\d+)$/);
  return match ? match[1] : null;
}

/**
 * Returns the most recently created member account number string or null when no records exist.
 */
export function getLastMemberAccountNumber(db: Database.Database): string {
  const stmt = db.prepare(`
    SELECT account_number FROM members WHERE is_deleted = 0 ORDER BY Account_number DESC LIMIT 1
  `);
  const result = stmt.get() as { account_number: string } | undefined;
  return result?.account_number ?? '0';
}

/**
 * Retrieves a paginated slice of active members, applying optional fuzzy search across
 * key columns while guaranteeing fullname ordering (asc). Returns sanitized rows alongside
 * pagination metadata so the renderer can drive server-side tables without guessing totals.
 */
export function fetchMembers(
  db: Database.Database,
  payload: FetchMembersPayload
): PaginatedResponse<SanitizedMember> {
  const page = Math.max(1, Math.floor(payload.page || 1));
  const pageSize = Math.max(1, Math.floor(payload.pageSize || 10));
  const offset = (page - 1) * pageSize;
  const search = payload.search?.trim() ?? '';
  const hasSearch = search.length > 0;

  const filters = hasSearch
    ? `is_deleted = 0 AND (fullname LIKE @search OR account_number LIKE @search OR telephoneNumber LIKE @search OR location LIKE @search)`
    : `is_deleted = 0`;

  const params = hasSearch
    ? { search: `%${search}%`, limit: pageSize, offset }
    : { limit: pageSize, offset };
  const countParams = hasSearch ? { search: `%${search}%` } : {};

  const countStmt = db.prepare(`
    SELECT COUNT(*) as total FROM members WHERE ${filters}
  `);
  const totalRecords = (countStmt.get(countParams) as { total: number }).total;

  const listStmt = db.prepare(`
    SELECT ${MEMBER_BASE_COLUMNS}
    FROM members
    WHERE ${filters}
    ORDER BY LOWER(fullname) ASC
    LIMIT @limit OFFSET @offset
  `);
  const rows = (listStmt.all(params) as DbMemberRow[]).map(sanitizeMember);
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages,
    },
  };
}

export function fetchMemberById(db: Database.Database, id: string) {
  const stmt = db.prepare(`
    SELECT
      m.id, m.fullname, m.account_number, m.telephoneNumber, m.location,
      m.creator_id, m.date_created, m.date_updated, m.is_deleted, m.is_disabled, m.is_synced,
      u.fullname AS creator_fullname,
      u.username AS creator_username
    FROM members m
    LEFT JOIN users u ON u.id = m.creator_id
    WHERE m.id = @id AND m.is_deleted = 0
    LIMIT 1
  `);
  const record = stmt.get({ id }) as DbMemberRow | undefined;
  if (!record) {
    return null;
  }
  return sanitizeMember(record);
}

export function createMember(db: Database.Database, payload: CreateMemberPayload) {
  const id = randomUUID();
  const lastAccountNumber = getLastMemberAccountNumber(db);
  const lastSeqStr = extractAccountSequence(lastAccountNumber);
  
  const nextVal = (lastSeqStr ? Number(lastSeqStr) : 0) + 1;
  const padding = lastSeqStr ? lastSeqStr.length : 3; // Default padding to 3 (e.g., 001)
  const nextAccountNumber = `TVC${nextVal.toString().padStart(padding, '0')}`;

  const insert = db.prepare(`
    INSERT INTO members (id, fullname, account_number, telephoneNumber, location, creator_id)
    VALUES (@id, @fullname, @account_number, @telephoneNumber, @location, @creator_id)
  `);

  insert.run({
    id,
    fullname: payload.fullname,
    account_number: nextAccountNumber,
    telephoneNumber: payload.telephoneNumber,
    location: payload.location,
    creator_id: payload.creatorId,
  });

  return fetchMemberById(db, id);
}

export function updateMember(db: Database.Database, payload: UpdateMemberPayload) {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id: payload.id };

  if (payload.fullname !== undefined) {
    fields.push('fullname = @fullname');
    params.fullname = payload.fullname;
  }

  if (payload.telephoneNumber !== undefined) {
    fields.push('telephoneNumber = @telephoneNumber');
    params.telephoneNumber = payload.telephoneNumber;
  }

  if (payload.location !== undefined) {
    fields.push('location = @location');
    params.location = payload.location;
  }

  if (payload.creatorId !== undefined) {
    fields.push('creator_id = @creator_id');
    params.creator_id = payload.creatorId;
  }

  if (payload.isDisabled !== undefined) {
    fields.push('is_disabled = @is_disabled');
    params.is_disabled = Number(payload.isDisabled);
  }

  if (!fields.length) {
    return fetchMemberById(db, payload.id);
  }

  const update = db.prepare(`
    UPDATE members
    SET ${fields.join(', ')}, date_updated = datetime('now')
    WHERE id = @id AND is_deleted = 0
  `);
  const result = update.run(params);
  if (result.changes === 0) {
    return null;
  }
  return fetchMemberById(db, payload.id);
}

export function deleteMember(db: Database.Database, payload: DeleteMemberPayload) {
  const stmt = db.prepare(`
    UPDATE members
    SET is_deleted = 1, date_updated = datetime('now')
    WHERE id = @id AND is_deleted = 0
  `);
  const result = stmt.run({ id: payload.id });
  return { success: result.changes > 0 } as const;
}

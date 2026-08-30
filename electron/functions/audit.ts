import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface CreateAuditLogInput {
  actorId: string;
  targetId?: string;
  action: string;
  details?: string;
}

export function createAuditLog(db: Database.Database, input: CreateAuditLogInput): void {
  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, actor_id, target_id, action, details, is_synced)
    VALUES (@id, @actorId, @targetId, @action, @details, 0)
  `);
  stmt.run({
    id: randomUUID(),
    actorId: input.actorId,
    targetId: input.targetId ?? null,
    action: input.action,
    details: input.details ?? null,
  });
}

export interface SanitizedAuditLog {
  id: string;
  actorId: string;
  actorName: string;
  targetId: string | null;
  targetName: string | null;
  action: string;
  details: string | null;
  dateCreated: string;
  isSynced: number;
}

export function fetchAuditLogs(db: Database.Database): SanitizedAuditLog[] {
  const stmt = db.prepare(`
    SELECT
      a.id,
      a.actor_id as actorId,
      actor.fullname as actorName,
      a.target_id as targetId,
      target.fullname as targetName,
      a.action,
      a.details,
      a.date_created as dateCreated,
      a.is_synced as isSynced
    FROM audit_logs a
    JOIN users actor ON actor.id = a.actor_id
    LEFT JOIN users target ON target.id = a.target_id
    ORDER BY a.date_created DESC
  `);
  return stmt.all() as SanitizedAuditLog[];
}

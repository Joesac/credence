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

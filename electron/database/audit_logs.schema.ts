export const CREATE_AUDIT_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  target_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  is_synced INTEGER NOT NULL DEFAULT 0,
  date_created TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

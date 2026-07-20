export const CREATE_MEMBERS_TABLE = `
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  fullname TEXT NOT NULL,
  account_number TEXT NOT NULL,
  telephoneNumber TEXT NOT NULL,
  location TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  date_created TEXT NOT NULL DEFAULT (datetime('now')),
  date_updated TEXT NOT NULL DEFAULT (datetime('now')),
  -- Soft-delete flag keeps records queryable for audit trails without permanently removing them.
  is_deleted INTEGER NOT NULL DEFAULT 0,
  is_synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);
`;

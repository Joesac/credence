export const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  fullname TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_disabled INTEGER NOT NULL DEFAULT 0,
  last_login TEXT,
  date_created TEXT NOT NULL DEFAULT (datetime('now')),
  date_updated TEXT NOT NULL DEFAULT (datetime('now')),
  is_synced INTEGER NOT NULL DEFAULT 0
);
`;

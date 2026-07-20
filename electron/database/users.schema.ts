export const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  fullname TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  date_created TEXT NOT NULL DEFAULT (datetime('now')),
  date_updated TEXT NOT NULL DEFAULT (datetime('now')),
  is_synced INTEGER NOT NULL DEFAULT 0
);
`;

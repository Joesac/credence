export const CREATE_DEPOSITS_TABLE = `
CREATE TABLE IF NOT EXISTS deposits (
  id TEXT PRIMARY KEY,
  transaction_id TEXT UNIQUE,
  member_id TEXT NOT NULL,
  received_by TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'momo')),
  amount REAL NOT NULL,
  notes TEXT,
  is_cancelled INTEGER NOT NULL DEFAULT 0,
  date_created TEXT NOT NULL DEFAULT (datetime('now')),
  date_updated TEXT NOT NULL DEFAULT (datetime('now')),
  is_synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (member_id) REFERENCES members(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (received_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);
`;

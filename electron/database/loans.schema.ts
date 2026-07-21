export const CREATE_LOANS_TABLE = `
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  issuer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  interest_rate REAL NOT NULL,
  repayment_frequency TEXT NOT NULL,
  due_date TEXT NOT NULL,
  notes TEXT,
  is_cancelled INTEGER NOT NULL DEFAULT 0,
  date_created TEXT NOT NULL DEFAULT (datetime('now')),
  is_synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (member_id) REFERENCES members(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (issuer_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);
`;

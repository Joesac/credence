export const CREATE_LOAN_REPAYMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS loan_repayments (
  id TEXT PRIMARY KEY,
  loan_id TEXT,
  receiver_id TEXT NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  is_cancelled INTEGER NOT NULL DEFAULT 0,
  date_created TEXT NOT NULL DEFAULT (datetime('now')),
  is_synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);
`;

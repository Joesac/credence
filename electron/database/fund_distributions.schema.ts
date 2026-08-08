export const CREATE_FUND_DISTRIBUTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS fund_distributions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  giver_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date_received TEXT NOT NULL,
  notes TEXT,
  date_created TEXT NOT NULL DEFAULT (datetime('now')),
  is_synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (member_id) REFERENCES members(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (giver_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);
`;

export const CREATE_APP_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  date_updated TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

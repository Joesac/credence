import Database from 'better-sqlite3';
import { MIGRATIONS } from './migrations';
import { Migration } from './types';

function ensureMigrationsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function hasMigrationRun(db: Database.Database, id: string): boolean {
  const stmt = db.prepare(`SELECT 1 FROM migrations WHERE id = @id LIMIT 1`);
  return Boolean(stmt.get({ id }));
}

function markMigrationComplete(db: Database.Database, id: string) {
  const stmt = db.prepare(`INSERT INTO migrations (id) VALUES (@id)`);
  stmt.run({ id });
}

export function runMigrations(db: Database.Database) {
  ensureMigrationsTable(db);

  for (const migration of MIGRATIONS) {
    if (hasMigrationRun(db, migration.id)) {
      continue;
    }

    const applyMigration = db.transaction((m: Migration) => {
      m.run(db);
      markMigrationComplete(db, m.id);
    });

    applyMigration(migration);
  }
}

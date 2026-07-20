import Database from 'better-sqlite3';

/**
 * Contract implemented by every schema migration. Each migration is idempotent and
 * executes within a transaction to guarantee atomic upgrades.
 */
export interface Migration {
  /**
   * Unique identifier used to track whether a migration has already run. Prefer
   * sortable strings like timestamps (e.g., 20240719_add_columns).
   */
  id: string;
  /**
   * Human-friendly summary that can be surfaced in logs for troubleshooting.
   */
  description?: string;
  /**
   * Migration logic. Implementations should be deterministic and safe to rerun.
   */
  run: (db: Database.Database) => void;
}

import Database from 'better-sqlite3';

export function tableHasColumn(db: Database.Database, table: string, column: string): boolean {
  const infoStmt = db.prepare(`PRAGMA table_info(${table})`);
  const columns = infoStmt.all() as { name: string }[];
  return columns.some(col => col.name === column);
}

export function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  if (tableHasColumn(db, table, column)) {
    return;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
}

function indexExists(db: Database.Database, table: string, indexName: string): boolean {
  const indexListStmt = db.prepare(`PRAGMA index_list(${table})`);
  const indexes = indexListStmt.all() as { name: string }[];
  return indexes.some(index => index.name === indexName);
}

export function createUniqueIndexIfMissing(
  db: Database.Database,
  table: string,
  indexName: string,
  expression: string
): void {
  if (indexExists(db, table, indexName)) {
    return;
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${indexName} ON ${table} ${expression}`);
}

export interface SyncStats {
  [table: string]: number;
}

export interface SyncProgress {
  table: string;
  current: number;
  total: number;
}

export interface SyncError {
  table: string;
  message: string;
  code: string;
}

export interface SyncResult {
  totalSynced: number;
  perTable: Record<string, number>;
  durationMs: number;
  errors: SyncError[];
}

export interface CloudSyncConfig {
  apiUrl: string | null;
  apiKey: string | null;
}

export interface SyncResponse {
  success: boolean;
  syncedIds: string[];
}

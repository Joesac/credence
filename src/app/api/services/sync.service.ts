import { Service, inject, signal } from '@angular/core';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';
import { CloudSyncConfigService } from '../config';
import { CloudUsersService } from './users';
import { CloudMembersService } from './members';
import { CloudDepositsService } from './deposits';
import { CloudWithdrawalsService } from './withdrawals';
import { CloudLoansService } from './loans';
import { CloudLoanRepaymentsService } from './loan-repayments';
import { CloudFundDistributionsService } from './fund-distributions';
import {
  SyncStats,
  SyncProgress,
  SyncResult,
  SyncError,
} from '@interfaces/sync.interface';
import { type CloudError } from './http-client';

const BATCH_SIZE = 100;

/**
 * Ordered list of tables to sync. Parent tables must sync before children
 * to satisfy foreign-key constraints on the cloud Neon DB.
 */
const SYNC_ORDER = [
  'users',
  'members',
  'deposits',
  'withdrawals',
  'loans',
  'loan_repayments',
  'fund_distributions',
] as const;

type SyncableTable = (typeof SYNC_ORDER)[number];

@Service()
export class SyncService {
  private readonly ipcBridge = inject(IpcBridgeService);
  private readonly configService = inject(CloudSyncConfigService);
  private readonly cloudUsers = inject(CloudUsersService);
  private readonly cloudMembers = inject(CloudMembersService);
  private readonly cloudDeposits = inject(CloudDepositsService);
  private readonly cloudWithdrawals = inject(CloudWithdrawalsService);
  private readonly cloudLoans = inject(CloudLoansService);
  private readonly cloudLoanRepayments = inject(CloudLoanRepaymentsService);
  private readonly cloudFundDistributions = inject(CloudFundDistributionsService);

  readonly isSyncing = signal(false);
  readonly progress = signal<SyncProgress | null>(null);

  private readonly cloudServices: Record<SyncableTable, { sync: (rows: Record<string, unknown>[]) => Promise<{ syncedIds: string[] }> }> = {
    users: this.cloudUsers,
    members: this.cloudMembers,
    deposits: this.cloudDeposits,
    withdrawals: this.cloudWithdrawals,
    loans: this.cloudLoans,
    loan_repayments: this.cloudLoanRepayments,
    fund_distributions: this.cloudFundDistributions,
  };

  /**
   * Fetches per-table unsynced row counts from the local DB.
   */
  async getSyncStats(): Promise<SyncStats> {
    return this.ipcBridge.executeIPC((api) => api.getSyncStats());
  }

  /**
   * Orchestrates a full sync across all 7 tables in dependency order.
   * Each table is synced independently — one table failing does not abort the rest.
   * Returns a summary with per-table counts, duration, and any errors.
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing()) {
      throw { code: 'SYNC_IN_PROGRESS', message: 'A sync is already running.' } as CloudError;
    }

    this.isSyncing.set(true);
    this.progress.set(null);

    const startTime = Date.now();
    const perTable: Record<string, number> = {};
    const errors: SyncError[] = [];
    let totalSynced = 0;

    try {
      for (const table of SYNC_ORDER) {
        try {
          const count = await this.syncTable(table);
          perTable[table] = count;
          totalSynced += count;
        } catch (err) {
          const cloudErr = err as CloudError;
          perTable[table] = 0;
          errors.push({
            table,
            code: cloudErr.code ?? 'UNKNOWN',
            message: cloudErr.message ?? 'Sync failed for this table.',
          });
        }
      }

      if (errors.length === 0) {
        await this.configService.setLastSyncAt(new Date().toISOString());
      }

      return {
        totalSynced,
        perTable,
        durationMs: Date.now() - startTime,
        errors,
      };
    } finally {
      this.isSyncing.set(false);
      this.progress.set(null);
    }
  }

  /**
   * Syncs a single table: fetch unsynced rows → batch POST to cloud → mark synced.
   * Returns the number of rows successfully synced.
   */
  private async syncTable(table: SyncableTable): Promise<number> {
    const rows = await this.ipcBridge.executeIPC((api) =>
      api.getUnsyncedRows({ table })
    );

    if (!rows.length) {
      return 0;
    }

    const service = this.cloudServices[table];
    let syncedCount = 0;

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

      this.progress.set({
        table,
        current: i + batch.length,
        total: rows.length,
      });

      const response = await service.sync(batch);

      if (response.syncedIds.length > 0) {
        await this.ipcBridge.executeIPC((api) =>
          api.markRowsSynced({ table, ids: response.syncedIds })
        );
        syncedCount += response.syncedIds.length;
      }
    }

    return syncedCount;
  }
}

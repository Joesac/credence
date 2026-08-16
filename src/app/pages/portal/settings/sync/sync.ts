import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { form, FormField, required } from '@angular/forms/signals';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { SyncService } from '@api/services/sync.service';
import { CloudSyncConfigService } from '@api/config';
import { ToastService } from '@core/components/toast/service/toast-service';
import { SyncStats, SyncResult } from '@interfaces/sync.interface';

interface ConfigData {
  apiUrl: string;
  apiKey: string;
}

const TABLE_LABELS: Record<string, string> = {
  users: 'Users',
  members: 'Members',
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
  loans: 'Loans',
  loan_repayments: 'Loan Repayments',
  fund_distributions: 'Fund Distributions',
};

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [FormField, Inputfield, MatButtonModule],
  templateUrl: './sync.html',
  styleUrl: './sync.scss',
  host: { 'class': 'w-full flex justify-center' },
})
export class SyncComponent implements OnInit {
  private readonly syncService = inject(SyncService);
  private readonly configService = inject(CloudSyncConfigService);
  private readonly toastService = inject(ToastService);

  protected readonly isSyncing = this.syncService.isSyncing;
  protected readonly progress = this.syncService.progress;
  protected readonly syncStats = signal<SyncStats>({});
  protected readonly lastSyncAt = signal<string | null>(null);
  protected readonly isConfigured = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSavingConfig = signal(false);
  protected readonly lastResult = signal<SyncResult | null>(null);
  protected readonly tableLabels = TABLE_LABELS;

  private readonly configModel = signal<ConfigData>({ apiUrl: '', apiKey: '' });

  protected readonly configForm = form(this.configModel, (path) => {
    required(path.apiUrl, { message: 'API URL is required.' });
    required(path.apiKey, { message: 'API key is required.' });
  });

  async ngOnInit(): Promise<void> {
    await this.loadState();
  }

  private async loadState(): Promise<void> {
    try {
      const [config, stats, lastSync] = await Promise.all([
        this.configService.getConfig(),
        this.syncService.getSyncStats(),
        this.configService.getLastSyncAt(),
      ]);

      this.isConfigured.set(!!config.apiUrl && !!config.apiKey);
      this.syncStats.set(stats);
      this.lastSyncAt.set(lastSync);

      if (config.apiUrl) {
        this.configModel.update((prev) => ({ ...prev, apiUrl: config.apiUrl! }));
      }
      if (config.apiKey) {
        this.configModel.update((prev) => ({ ...prev, apiKey: config.apiKey! }));
      }
    } catch (error) {
      console.error('Failed to load sync state', error);
      this.toastService.error({ message: 'Unable to load sync configuration.' });
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async onSaveConfig(event: Event): Promise<void> {
    event.preventDefault();

    if (this.configForm().invalid() || this.isSavingConfig()) {
      if (this.configForm().invalid()) {
        this.toastService.error({ message: 'Please fill in both API URL and key.' });
      }
      return;
    }

    const payload = this.configForm().value();
    this.isSavingConfig.set(true);

    try {
      await this.configService.saveConfig({
        apiUrl: payload.apiUrl.trim(),
        apiKey: payload.apiKey.trim(),
      });
      this.isConfigured.set(true);
      this.toastService.success({ message: 'Cloud sync configuration saved.' });
    } catch (error) {
      this.toastService.error({ message: 'Unable to save configuration. Please try again.' });
    } finally {
      this.isSavingConfig.set(false);
    }
  }

  protected async onSyncNow(): Promise<void> {
    if (this.isSyncing()) return;

    this.lastResult.set(null);

    try {
      const result = await this.syncService.syncAll();
      this.lastResult.set(result);

      if (result.errors.length > 0) {
        const failedTables = result.errors.map((e) => e.table).join(', ');
        this.toastService.warning({
          message: `Sync completed with ${result.errors.length} error(s). Failed: ${failedTables}.`,
        });
      } else if (result.totalSynced === 0) {
        this.toastService.success({ message: 'Everything is already synced.' });
      } else {
        this.toastService.success({
          message: `Synced ${result.totalSynced} record${result.totalSynced !== 1 ? 's' : ''} successfully.`,
        });
      }

      // Refresh stats + last sync time
      const [stats, lastSync] = await Promise.all([
        this.syncService.getSyncStats(),
        this.configService.getLastSyncAt(),
      ]);
      this.syncStats.set(stats);
      this.lastSyncAt.set(lastSync);
    } catch (error: any) {
      const code = error?.code ?? '';
      if (code === 'CLOUD_NOT_CONFIGURED') {
        this.toastService.error({ message: 'Please configure the API URL and key first.' });
      } else if (code === 'SYNC_IN_PROGRESS') {
        this.toastService.warning({ message: 'A sync is already in progress.' });
      } else {
        this.toastService.error({ message: error?.message ?? 'Sync failed. Please try again.' });
      }
    }
  }

  protected formatLastSync(timestamp: string | null): string {
    if (!timestamp) return 'Never synced';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  }

  protected onEditConfig(): void {
    this.isConfigured.set(false);
  }

  protected async onClearConfig(): Promise<void> {
    try {
      await this.configService.saveConfig({ apiUrl: '', apiKey: '' });
      this.configModel.set({ apiUrl: '', apiKey: '' });
      this.isConfigured.set(false);
      this.toastService.success({ message: 'Cloud sync configuration cleared.' });
    } catch (error) {
      this.toastService.error({ message: 'Unable to clear configuration. Please try again.' });
    }
  }

  protected get totalUnsynced(): number {
    const stats = this.syncStats();
    return Object.values(stats).reduce((sum, count) => sum + count, 0);
  }

  protected get tableEntries(): { table: string; label: string; count: number }[] {
    const stats = this.syncStats();
    return Object.entries(TABLE_LABELS).map(([table, label]) => ({
      table,
      label,
      count: stats[table] ?? 0,
    }));
  }
}

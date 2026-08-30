import { Service, inject } from '@angular/core';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';
import { AuthService } from '../pages/auth/services/auth-service';
import { CloudSyncConfig } from '@interfaces/sync.interface';

export const SETTING_API_URL = 'api_base_url';
export const SETTING_API_KEY = 'api_key';
export const SETTING_LAST_SYNC_AT = 'last_sync_at';

/**
 * Retrieves and persists cloud sync configuration (API URL + key)
 * via the Electron IPC bridge into the local app_settings table.
 */
@Service()
export class CloudSyncConfigService {
  private readonly ipcBridge = inject(IpcBridgeService);
  private readonly authService = inject(AuthService);

  private getActorId(): string {
    const actorId = this.authService.getUserId();
    if (!actorId) {
      throw new Error('NOT_AUTHENTICATED');
    }
    return actorId;
  }

  async getConfig(): Promise<CloudSyncConfig> {
    const [apiUrl, apiKey] = await Promise.all([
      this.ipcBridge.executeIPC((api) => api.getSetting({ key: SETTING_API_URL })),
      this.ipcBridge.executeIPC((api) => api.getSetting({ key: SETTING_API_KEY })),
    ]);
    return { apiUrl, apiKey };
  }

  async saveConfig(config: CloudSyncConfig): Promise<void> {
    await this.ipcBridge.executeIPC((api) =>
      api.saveSyncConfig({
        actorId: this.getActorId(),
        apiUrl: config.apiUrl ?? '',
        apiKey: config.apiKey ?? '',
      })
    );
  }

  async clearConfig(): Promise<void> {
    await this.ipcBridge.executeIPC((api) =>
      api.clearSyncConfig({ actorId: this.getActorId() })
    );
  }

  async getLastSyncAt(): Promise<string | null> {
    return this.ipcBridge.executeIPC((api) => api.getSetting({ key: SETTING_LAST_SYNC_AT }));
  }

  async setLastSyncAt(timestamp: string): Promise<void> {
    await this.ipcBridge.executeIPC((api) => api.setSetting({ key: SETTING_LAST_SYNC_AT, value: timestamp }));
  }

  get isConfigured(): Promise<boolean> {
    return this.getConfig().then((c) => !!c.apiUrl && !!c.apiKey);
  }
}

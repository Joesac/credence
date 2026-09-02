import { Service, inject } from '@angular/core';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';
import { AuditLog } from '@interfaces/audit-log.interface';

/**
 * Loads audit logs from the Electron main process.
 */
@Service()
export class AuditLogService {
  private readonly ipcBridge = inject(IpcBridgeService);

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.ipcBridge.executeIPC((api) => api.getAuditLogs());
  }
}

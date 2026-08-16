import { Service } from '@angular/core';
import { CloudHttpService } from './http-client';
import { SyncResponse } from '@interfaces/sync.interface';

@Service()
export class CloudWithdrawalsService extends CloudHttpService {
  sync(rows: Record<string, unknown>[]): Promise<SyncResponse> {
    return this.post<SyncResponse>('/api/sync/withdrawals', { rows });
  }
}

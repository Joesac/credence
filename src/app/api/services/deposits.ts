import { Service } from '@angular/core';
import { CloudHttpService } from './http-client';
import { SyncResponse } from '@interfaces/sync.interface';

@Service()
export class CloudDepositsService extends CloudHttpService {
  sync(rows: Record<string, unknown>[]): Promise<SyncResponse> {
    return this.post<SyncResponse>('/api/sync/deposits', { rows });
  }
}

import { Service } from '@angular/core';
import { CloudHttpService } from './http-client';
import { SyncResponse } from '@interfaces/sync.interface';

@Service()
export class CloudMembersService extends CloudHttpService {
  sync(rows: Record<string, unknown>[]): Promise<SyncResponse> {
    return this.post<SyncResponse>('/api/sync/members', { rows });
  }
}

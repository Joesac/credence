import { Service } from '@angular/core';
import { CloudHttpService } from './http-client';
import { SyncResponse } from '@interfaces/sync.interface';

/**
 * Cloud sync client for the users table.
 * Pushes unsynced user rows to the cloud API for upsert.
 */
@Service()
export class CloudUsersService extends CloudHttpService {
  sync(rows: Record<string, unknown>[]): Promise<SyncResponse> {
    return this.post<SyncResponse>('/api/sync/users', { rows });
  }
}

import { Service } from '@angular/core';
import { CloudHttpService } from './http-client';

export interface MobilePasswordEntry {
  id: string;
  password: string;
}

export interface MobilePasswordSetResponse {
  success: boolean;
}

@Service()
export class CloudAdminService extends CloudHttpService {
  /**
   * Sets a temporary mobile password for a single member.
   */
  setMobilePassword(memberId: string, password: string): Promise<MobilePasswordSetResponse> {
    return this.post<MobilePasswordSetResponse>(`/api/admin/members/${memberId}/mobile-password`, { password });
  }

  /**
   * Bulk-sets temporary mobile passwords for many members.
   */
  setMobilePasswords(members: MobilePasswordEntry[]): Promise<MobilePasswordSetResponse> {
    return this.post<MobilePasswordSetResponse>('/api/admin/members/mobile-passwords', { members });
  }
}

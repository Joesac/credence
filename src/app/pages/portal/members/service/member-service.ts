import { Service } from '@angular/core';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';
import { Member, MemberFinancialSummary, MemberPayload } from '@interfaces/member.interface';
import { PaginatedResponse, PaginationRequest } from '@interfaces/pagination.interface';

@Service()
export class MemberService extends IpcBridgeService {
  /**
   * Retrieves paginated active members from the Electron IPC bridge.
   */
  getMembers(payload: PaginationRequest): Promise<PaginatedResponse<Member>> {
    return this.executeIPC(api => api.getMembers(payload));
  }

  /**
   * Fetches a single member by id for detail views or edit forms.
   */
  getMemberById(id: string): Promise<Member | null> {
    return this.executeIPC(api => api.getMemberById({ id }));
  }

  /**
   * Persists a new member record, delegating account number generation to the backend and returning the stored entity.
   */
  addMember(payload: MemberPayload): Promise<Member> {
    return this.executeIPC(api => api.addMember(payload));
  }

  /**
   * Updates mutable member fields while keeping audit timestamps in sync.
   */
  updateMember(id: string, payload: Partial<MemberPayload>): Promise<Member | null> {
    return this.executeIPC(api => api.updateMember({ id, ...payload }));
  }

  /**
   * Soft deletes a member by flipping the backend flag instead of removing the row.
   */
  deleteMember(id: string): Promise<{ success: boolean }> {
    return this.executeIPC(api => api.deleteMember({ id }));
  }

  /**
   * Retrieves member aggregate deposit/withdrawal totals for dashboards or contextual displays.
   */
  getMemberFinancialSummary(memberId: string): Promise<MemberFinancialSummary> {
    return this.executeIPC(api => api.getMemberFinancials({ memberId }));
  }
}

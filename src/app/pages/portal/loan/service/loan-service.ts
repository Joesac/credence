import { Service } from '@angular/core';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';
import {
  Loan,
  LoanPayload,
  LoanUpdatePayload,
  PaginatedLoans,
  LoanQueryOptions,
  MemberLoanQueryOptions,
} from '@interfaces/loan.interface';
import { PaginationRequest } from '@interfaces/pagination.interface';

@Service()
export class LoanService extends IpcBridgeService {
  /**
   * Fetches paginated loans with optional cancellation/member/issuer filters.
   */
  getLoans(payload: PaginationRequest & LoanQueryOptions): Promise<PaginatedLoans> {
    return this.executeIPC(api => api.getLoans(payload));
  }

  /**
   * Retrieves paginated loans for a specific member, primarily for profile views.
   */
  getMemberLoans(payload: PaginationRequest & MemberLoanQueryOptions): Promise<PaginatedLoans> {
    return this.executeIPC(api => api.getMemberLoans(payload));
  }

  /**
   * Persists a newly issued loan and returns the computed record from SQLite.
   */
  addLoan(payload: LoanPayload): Promise<Loan> {
    return this.executeIPC(api => api.addLoan(payload));
  }

  /**
   * Updates existing loan attributes (amount, repayment terms, etc.) and returns the refreshed record.
   */
  updateLoan(payload: LoanUpdatePayload): Promise<Loan | null> {
    return this.executeIPC(api => api.updateLoan(payload));
  }

  /**
   * Soft deletes (cancels) the targeted loan.
   */
  deleteLoan(id: string): Promise<{ success: boolean }> {
    return this.executeIPC(api => api.deleteLoan({ id }));
  }
}

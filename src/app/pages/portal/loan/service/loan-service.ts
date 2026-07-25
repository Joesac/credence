import { Service } from '@angular/core';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';
import {
  Loan,
  LoanPayload,
  LoanUpdatePayload,
  PaginatedLoans,
  LoanQueryOptions,
  MemberLoanQueryOptions,
  LoanRepaymentPayload,
  LoanRepayment,
  PaginatedLoanRepayments,
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

  /**
   * Records a repayment for a specific loan.
   */
  addLoanRepayment(payload: LoanRepaymentPayload): Promise<LoanRepayment | null> {
    return this.executeIPC(api => api.addLoanRepayment(payload));
  }

  /**
   * Updates an existing loan repayment record (amount, notes, or cancellation status).
   */
  updateLoanRepayment(payload: { id: string; amount?: number; notes?: string | null; isCancelled?: boolean }): Promise<LoanRepayment | null> {
    return this.executeIPC(api => api.updateLoanRepayment(payload));
  }

  /**
   * Lists repayments for a specific loan (paged).
   */
  getLoanRepaymentsByLoanId(payload: { loanId: string; page: number; pageSize: number }): Promise<PaginatedLoanRepayments> {
    return this.executeIPC(api => api.getLoanRepaymentsByLoanId(payload));
  }
}

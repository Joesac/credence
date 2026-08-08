import { PaginatedResponse } from './pagination.interface';

export type LoanRepaymentFrequency = 'weekly' | 'monthly' | string;

export interface LoanPayload {
  memberId: string;
  issuerId: string;
  amount: number;
  interestRate: number;
  repaymentFrequency: LoanRepaymentFrequency;
  dueDate: string;
  notes?: string | null;
  date: string;
}

export interface LoanUpdatePayload extends Partial<LoanPayload> {
  id: string;
}

export interface LoanRelationSummary {
  id: string;
  fullname: string;
  accountNumber?: string | null;
  username?: string | null;
}

export interface Loan {
  id: string;
  member_id: string;
  issuer_id: string;
  amount: number;
  interest_rate: number;
  repayment_frequency: LoanRepaymentFrequency;
  due_date: string;
  notes: string | null;
  is_cancelled: number;
  date_created: string;
  is_synced: number;
  computedInterestAmount: number;
  outstandingBalance: number;
  totalRepaid: number;
  member?: LoanRelationSummary | null;
  issuer?: LoanRelationSummary | null;
}

export interface LoanQueryOptions {
  includeCancelled?: boolean;
  memberId?: string;
  issuerId?: string;
}

export interface MemberLoanQueryOptions {
  memberId: string;
  includeCancelled?: boolean;
}

export interface LoanRepaymentPayload {
  loanId: string;
  receiverId: string;
  amount: number;
  notes?: string | null;
  date: string;
}

export interface LoanRepaymentRelation {
  id: string;
  fullname: string;
  username?: string | null;
}

export interface LoanRepaymentLoanDetails {
  id: string;
  amount: number;
  member_id: string;
  member_name: string | null;
  issuer_id: string;
  issuer_name: string | null;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  receiver_id: string;
  amount: number;
  notes: string | null;
  is_cancelled: number;
  date_created: string;
  is_synced: number;
  receiver?: LoanRepaymentRelation | null;
  loan?: LoanRepaymentLoanDetails | null;
}

export type PaginatedLoans = PaginatedResponse<Loan>;

export type PaginatedLoanRepayments = PaginatedResponse<LoanRepayment>;

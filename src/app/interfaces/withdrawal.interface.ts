import { PaginatedResponse } from './pagination.interface';

export interface WithdrawalPayload {
  memberId: string;
  issuerId: string;
  amount: number;
  notes?: string | null;
}

export interface WithdrawalUpdatePayload extends Partial<WithdrawalPayload> {
  id: string;
}

export interface Withdrawal {
  id: string;
  transaction_id: string | null;
  member_id: string;
  member_name: string;
  issuer_id: string;
  amount: number;
  notes: string | null;
  is_cancelled: number;
  date_created: string;
  date_updated: string;
  is_synced: number;
}

export type PaginatedWithdrawals = PaginatedResponse<Withdrawal>;

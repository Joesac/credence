import { PaginatedResponse } from './pagination.interface';

export type DepositPaymentMethod = 'cash' | 'momo';

export interface DepositPayload {
  memberId: string;
  receivedBy: string;
  paymentMethod: DepositPaymentMethod;
  amount: number;
  refreshmentToken: number;
  notes?: string | null;
}

export interface DepositUpdatePayload extends Partial<DepositPayload> {
  id: string;
}

export interface Deposit {
  id: string;
  transaction_id: string | null;
  member_id: string;
  member_name: string;
  received_by: string;
  payment_method: DepositPaymentMethod;
  amount: number;
  refreshment_token: number;
  notes: string | null;
  is_cancelled: number;
  date_created: string;
  date_updated: string;
  is_synced: number;
}

export type PaginatedDeposits = PaginatedResponse<Deposit>;

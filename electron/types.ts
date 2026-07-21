/**
 * Seed payload types used during startup account bootstrap flows.
 */
export interface UserSeedPayload {
  fullname: string;
  username: string;
  password: string;
}

/**
 * IPC payload types exchanged between renderer and Electron main process.
 */
export interface CreateUserPayload {
  fullname: string;
  username: string;
  password: string;
}

export interface LoginUserPayload {
  username: string;
  password: string;
}

export interface LogoutUserPayload {
  userId: string;
}

export interface UpdateUserPayload {
  id: string;
  fullname?: string;
  username?: string;
  password?: string;
}

export interface CreateMemberPayload {
  fullname: string;
  telephoneNumber: string;
  location: string;
  creatorId: string;
}

export interface UpdateMemberPayload {
  id: string;
  fullname?: string;
  telephoneNumber?: string;
  location?: string;
  creatorId?: string;
}

export interface DeleteMemberPayload {
  id: string;
}

export type DepositPaymentMethod = 'cash' | 'momo';

export interface CreateDepositPayload {
  memberId: string;
  receivedBy: string;
  paymentMethod: DepositPaymentMethod;
  amount: number;
  notes?: string | null;
}

export interface UpdateDepositPayload {
  id: string;
  memberId?: string;
  receivedBy?: string;
  paymentMethod?: DepositPaymentMethod;
  amount?: number;
  notes?: string | null;
}

export interface DeleteDepositPayload {
  id: string;
}

export interface DepositQueryOptions extends PaginationRequest {
  includeCancelled?: boolean;
  memberId?: string;
}

export interface CreateWithdrawalPayload {
  memberId: string;
  issuerId: string;
  amount: number;
  notes?: string | null;
}

export interface UpdateWithdrawalPayload {
  id: string;
  memberId?: string;
  issuerId?: string;
  amount?: number;
  notes?: string | null;
}

export interface DeleteWithdrawalPayload {
  id: string;
}

export interface WithdrawalQueryOptions extends PaginationRequest {
  includeCancelled?: boolean;
  memberId?: string;
}

export interface MemberFinancialSummaryPayload {
  memberId: string;
}

export interface MemberFinancialSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  availableBalance: number;
}

export interface CreateLoanPayload {
  memberId: string;
  issuerId: string;
  amount: number;
  interestRate: number;
  repaymentFrequency: string;
  dueDate: string;
  notes?: string | null;
}

export interface UpdateLoanPayload extends Partial<Omit<CreateLoanPayload, 'memberId' | 'issuerId'>> {
  id: string;
  memberId?: string;
  issuerId?: string;
}

export interface DeleteLoanPayload {
  id: string;
}

export interface LoanQueryOptions extends PaginationRequest {
  includeCancelled?: boolean;
  memberId?: string;
  issuerId?: string;
}

export interface PaginationRequest {
  page: number;
  pageSize: number;
  search?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export type FetchMembersPayload = PaginationRequest;

/**
 * Database row and projection types used by user repository helpers.
 */
export type DbUserRow = {
  id: string;
  fullname: string;
  username: string;
  password: string;
  date_created: string;
  date_updated: string;
  is_synced: number;
};

export type SanitizedUser = Omit<DbUserRow, 'password'>;

export type DbMemberRow = {
  id: string;
  fullname: string;
  account_number: string;
  telephoneNumber: string;
  location: string;
  creator_id: string;
  date_created: string;
  date_updated: string;
  is_deleted: number;
  is_synced: number;
};

export type SanitizedMember = DbMemberRow;

export type DbDepositRow = {
  id: string;
  transaction_id: string | null;
  member_id: string;
  received_by: string;
  payment_method: DepositPaymentMethod;
  amount: number;
  notes: string | null;
  is_cancelled: number;
  date_updated: string;
  date_created: string;
  is_synced: number;
};

export type SanitizedDeposit = DbDepositRow;

export type DbWithdrawalRow = {
  id: string;
  transaction_id: string | null;
  member_id: string;
  issuer_id: string;
  amount: number;
  notes: string | null;
  is_cancelled: number;
  date_created: string;
  date_updated: string;
  is_synced: number;
};

export type SanitizedWithdrawal = DbWithdrawalRow;

export type DbLoanRow = {
  id: string;
  member_id: string;
  issuer_id: string;
  amount: number;
  interest_rate: number;
  repayment_frequency: string;
  due_date: string;
  notes: string | null;
  is_cancelled: number;
  date_created: string;
  is_synced: number;
};

export type SanitizedLoan = DbLoanRow & {
  computedInterestAmount: number;
  outstandingBalance: number;
  totalRepaid: number;
};

export interface SerializedError {
  code: string;
  message: string;
  details?: unknown;
}

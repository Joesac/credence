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

export interface VerifyPasswordPayload {
  userId: string;
  password: string;
}

export interface LogoutUserPayload {
  userId: string;
}

export interface UpdateUserPayload {
  id: string;
  currentPassword?: string;
  fullname?: string;
  username?: string;
  password?: string;
  isDisabled?: number | boolean;
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
  isDisabled?: number | boolean;
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
  refreshmentToken: number;
  notes?: string | null;
  date: string;
}

export interface UpdateDepositPayload {
  id: string;
  memberId?: string;
  receivedBy?: string;
  paymentMethod?: DepositPaymentMethod;
  amount?: number;
  refreshmentToken?: number;
  notes?: string | null;
}

export interface DeleteDepositPayload {
  id: string;
}

export interface DepositQueryOptions extends PaginationRequest {
  includeCancelled?: boolean;
  memberId?: string;
  date?: string;
}

export interface CreateWithdrawalPayload {
  memberId: string;
  issuerId: string;
  amount: number;
  notes?: string | null;
  date: string;
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
  date?: string;
}

export interface DailySummaryPayload {
  date: string;
}

export interface DailySummary {
  totalDepositsAmount: number;
  depositCount: number;
  totalWithdrawalsAmount: number;
  withdrawalCount: number;
  netCollection: number;
  refreshmentTokenAmount: number;
  refreshmentTokenCount: number;
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
  date: string;
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

export interface CreateLoanRepaymentPayload {
  loanId: string;
  receiverId: string;
  amount: number;
  notes?: string | null;
  date: string;
}

export interface UpdateLoanRepaymentPayload {
  id: string;
  amount?: number;
  notes?: string | null;
  isCancelled?: boolean;
}

export interface DeleteLoanRepaymentPayload {
  id: string;
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
  is_disabled: number;
  last_login: string | null;
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
  is_disabled: number;
  is_synced: number;
  creator_fullname: string | null;
  creator_username: string | null;
};

export type SanitizedMember = DbMemberRow;

export type DbDepositRow = {
  id: string;
  transaction_id: string | null;
  member_id: string;
  received_by: string;
  payment_method: DepositPaymentMethod;
  amount: number;
  refreshment_token: number;
  notes: string | null;
  is_cancelled: number;
  date_updated: string;
  date_created: string;
  is_synced: number;
  member_name: string | null;
  received_by_name: string | null;
};

export type SanitizedDeposit = Omit<DbDepositRow, 'member_name' | 'received_by_name'> & { 
  member_name: string;
  received_by_name: string;
};

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
  member_name: string | null;
  issuer_name: string | null;
};

export type SanitizedWithdrawal = Omit<DbWithdrawalRow, 'member_name' | 'issuer_name'> & { 
  member_name: string;
  issuer_name: string;
};

export type DbLoanRepaymentRow = {
  id: string;
  loan_id: string;
  receiver_id: string;
  amount: number;
  notes: string | null;
  is_cancelled: number;
  date_created: string;
  is_synced: number;
};

export type LoanRepaymentRelation = {
  id: string;
  fullname: string;
  username?: string | null;
};

export type LoanRepaymentLoanDetails = {
  id: string;
  amount: number;
  member_id: string;
  member_name: string | null;
  issuer_id: string;
  issuer_name: string | null;
};

export type SanitizedLoanRepayment = DbLoanRepaymentRow & {
  receiver?: LoanRepaymentRelation | null;
  loan?: LoanRepaymentLoanDetails | null;
};

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

export interface DashboardStats {
  totalMembers: number;
  nonDisabledMembers: number;
  disabledMembers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  activeLoansCount: number;
  totalActiveLoanPrincipal: number;
  todayCollection: number;
  todayRefreshmentTokens: number;
}

export interface RecentActivity {
  id: string;
  type: 'deposit' | 'withdrawal' | 'loan' | 'repayment';
  member_name: string;
  amount: number;
  date: string;
  status: string;
}

export interface CreateFundDistributionPayload {
  memberId: string;
  giverId: string;
  amount: number;
  notes?: string | null;
  dateReceived?: string;
}

export interface FundDistributionMemberStatsPayload {
  memberId: string;
}

export interface FundDistributionStats {
  totalDeposits: number;
  totalWithdrawals: number;
  totalLoanAmount: number;
  totalRepayments: number;
  amountToReceive: number;
  hasReceived: boolean;
}

export interface GlobalFundDistributionStats {
  totalDeposits: number;
  totalWithdrawals: number;
  netContributions: number;
}

export interface DashboardChartDataPoint {
  date: string;
  deposits: number;
  withdrawals: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivities: RecentActivity[];
  chartData: DashboardChartDataPoint[];
}

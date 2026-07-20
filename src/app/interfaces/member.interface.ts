export interface Member {
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
}

export interface MemberPayload {
  fullname: string;
  telephoneNumber: string;
  location: string;
  creatorId: string;
}

export interface MemberFinancialSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  availableBalance: number;
}

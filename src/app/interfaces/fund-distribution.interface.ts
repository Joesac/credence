export interface FundDistributionSummary {
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

export interface CreateFundDistributionPayload {
  memberId: string;
  giverId: string;
  amount: number;
  notes?: string | null;
  dateReceived?: string;
}

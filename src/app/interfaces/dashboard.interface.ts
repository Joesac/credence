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

export interface DailySummary {
  totalDepositsAmount: number;
  depositCount: number;
  totalWithdrawalsAmount: number;
  withdrawalCount: number;
  netCollection: number;
  refreshmentTokenAmount: number;
  refreshmentTokenCount: number;
}

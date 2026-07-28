import Database from 'better-sqlite3';
import { DashboardData, DashboardStats, RecentActivity, DashboardChartDataPoint } from '../types';

export function fetchDashboardData(db: Database.Database): DashboardData {
  // 1. Fetch Stats
  const stats: DashboardStats = {
    totalMembers: (db.prepare('SELECT COUNT(*) as count FROM members WHERE is_deleted = 0').get() as { count: number }).count,
    nonDisabledMembers: (db.prepare('SELECT COUNT(*) as count FROM members WHERE is_deleted = 0 AND is_disabled = 0').get() as { count: number }).count,
    disabledMembers: (db.prepare('SELECT COUNT(*) as count FROM members WHERE is_deleted = 0 AND is_disabled = 1').get() as { count: number }).count,
    totalDeposits: (db.prepare('SELECT IFNULL(SUM(amount), 0) as total FROM deposits WHERE is_cancelled = 0').get() as { total: number }).total,
    totalWithdrawals: (db.prepare('SELECT IFNULL(SUM(amount), 0) as total FROM withdrawals WHERE is_cancelled = 0').get() as { total: number }).total,
    activeLoansCount: (db.prepare('SELECT COUNT(*) as count FROM loans WHERE is_cancelled = 0').get() as { count: number }).count,
    totalActiveLoanPrincipal: (db.prepare('SELECT IFNULL(SUM(amount), 0) as total FROM loans WHERE is_cancelled = 0').get() as { total: number }).total,
    todayCollection: (db.prepare("SELECT IFNULL(SUM(amount), 0) as total FROM deposits WHERE is_cancelled = 0 AND date(date_created) = date('now')").get() as { total: number }).total,
    todayRefreshmentTokens: (db.prepare("SELECT IFNULL(SUM(refreshment_token), 0) as total FROM deposits WHERE is_cancelled = 0 AND date(date_created) = date('now')").get() as { total: number }).total,
  };

  // 2. Fetch Recent Activities (Last 10)
  // We union deposits, withdrawals, and repayments to get a chronological feed
  const recentActivities: RecentActivity[] = (db.prepare(`
    SELECT * FROM (
      SELECT 
        id, 
        'deposit' as type, 
        (SELECT fullname FROM members WHERE id = member_id) as member_name, 
        amount, 
        date_created as date,
        CASE WHEN is_cancelled = 1 THEN 'Cancelled' ELSE 'Completed' END as status
      FROM deposits
      UNION ALL
      SELECT 
        id, 
        'withdrawal' as type, 
        (SELECT fullname FROM members WHERE id = member_id) as member_name, 
        amount, 
        date_created as date,
        CASE WHEN is_cancelled = 1 THEN 'Cancelled' ELSE 'Completed' END as status
      FROM withdrawals
      UNION ALL
      SELECT 
        lr.id, 
        'repayment' as type, 
        (SELECT m.fullname FROM members m JOIN loans l ON l.member_id = m.id WHERE l.id = lr.loan_id) as member_name, 
        lr.amount, 
        lr.date_created as date,
        CASE WHEN lr.is_cancelled = 1 THEN 'Cancelled' ELSE 'Completed' END as status
      FROM loan_repayments lr
    ) 
    ORDER BY datetime(date) DESC 
    LIMIT 10
  `).all() as any[]).map(row => ({
    id: row.id,
    type: row.type,
    member_name: row.member_name || 'Unknown',
    amount: row.amount,
    date: row.date,
    status: row.status
  }));

  // 3. Fetch Chart Data (Last 30 Days)
  const chartData: DashboardChartDataPoint[] = (db.prepare(`
    WITH RECURSIVE days(date) AS (
      SELECT date('now', '-29 days')
      UNION ALL
      SELECT date(date, '+1 day') FROM days WHERE date < date('now')
    )
    SELECT 
      days.date,
      IFNULL(dep.total, 0) as deposits,
      IFNULL(wdr.total, 0) as withdrawals
    FROM days
    LEFT JOIN (
      SELECT date(date_created) as d_date, SUM(amount) as total 
      FROM deposits 
      WHERE is_cancelled = 0 
      GROUP BY d_date
    ) dep ON dep.d_date = days.date
    LEFT JOIN (
      SELECT date(date_created) as w_date, SUM(amount) as total 
      FROM withdrawals 
      WHERE is_cancelled = 0 
      GROUP BY w_date
    ) wdr ON wdr.w_date = days.date
    ORDER BY days.date ASC
  `).all() as any[]).map(row => ({
    date: row.date,
    deposits: row.deposits,
    withdrawals: row.withdrawals
  }));

  return {
    stats,
    recentActivities,
    chartData
  };
}

import { Menu } from '../interfaces/menu.interface';

export const MENU: Menu[] = [
  { id: 'portal/dashboard', label: 'Dashboard', icon: 'dashboard' },
  {
    id: 'portal/members',
    label: 'Members',
    icon: 'group',
    isActive: false,
    children: [
      { id: 'register', label: 'Register', isActive: false },
      { id: 'directory', label: 'Directory', isActive: false }
    ]
  },
  {
    id: 'portal/transactions',
    label: 'Transactions',
    icon: 'sync_alt',
    isActive: false,
    children: [
      { id: 'deposit', label: 'Deposit', isActive: false },
      { id: 'withdrawal', label: 'Withdrawal', isActive: false },
      { id: 'history', label: 'History', isActive: false }
    ]
  },
  {
    id: 'portal/loans',
    label: 'Loans',
    icon: 'account_balance_wallet',
    isActive: false,
    children: [
      { id: 'issue', label: 'Issue' },
      { id: 'repayment', label: 'Repayment Tracking' }
    ]
  },
  {
    id: 'portal/reports',
    label: 'Reports',
    icon: 'bar_chart',
    isActive: false,
    children: [
      { id: 'daily', label: 'Daily Collections', isActive: false },
      // { id: 'monthly', label: 'Monthly Summaries', isActive: false }
    ]
  },
  {
    id: 'portal/settings',
    label: 'Settings',
    icon: 'settings',
    isActive: false,
    children: [
      { id: 'user-details', label: 'User Details', isActive: false },
      { id: 'users-list', label: 'Users', isActive: false },
    ]
  },
];

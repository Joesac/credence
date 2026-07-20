import { Menu } from '../interfaces/menu.interface';

export const MENU: Menu[] = [
  { id: 'portal/dashboard', label: 'Dashboard', icon: 'grid' },
  {
    id: 'portal/members',
    label: 'Members',
    icon: 'users',
    isActive: false,
    children: [
      { id: 'register', label: 'Register', isActive: false },
      { id: 'directory', label: 'Directory', isActive: false }
    ]
  },
  {
    id: 'portal/transactions',
    label: 'Transactions',
    icon: 'arrows',
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
    icon: 'briefcase',
    isActive: false,
    children: [
      { id: 'issue', label: 'Issue' },
      { id: 'repayment', label: 'Repayment Tracking' }
    ]
  },
  {
    id: 'portal/reports',
    label: 'Reports',
    icon: 'chart',
    isActive: false,
    children: [
      { id: 'daily', label: 'Daily Collections', isActive: false },
      { id: 'monthly', label: 'Monthly Summaries', isActive: false }
    ]
  },
  { id: 'portal/settings', label: 'Settings', icon: 'cog', isActive: false }
];

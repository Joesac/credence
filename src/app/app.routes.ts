import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Members } from './pages/members/members';
import { Transactions } from './pages/transactions/transactions';
import { Loan } from './pages/loan/loan';
import { Report } from './pages/report/report';
import { Settings } from './pages/settings/settings';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard, data: { breadcrumb: ['Dashboard'] } },
  {
    path: 'members',
    component: Members,
    data: { breadcrumb: ['Members'] },
    children: [
      { 
        path: 'register', 
        loadComponent: () => import('./pages/members/register/register').then(m => m.Register),
        data: { breadcrumb: ['Register'] }
      },
      { 
        path: 'directory', 
        loadComponent: () => import('./pages/members/directory/directory').then(m => m.Directory),
        data: { breadcrumb: ['Directory'] }
      }
    ]
  },
  {
    path: 'transactions',
    component: Transactions,
    data: { breadcrumb: ['Transactions'] },
    children: [
      { 
        path: 'deposit', 
        loadComponent: () => import('./pages/transactions/deposit/deposit').then(m => m.Deposit),
        data: { breadcrumb: ['Deposit'] }
      },
      { 
        path: 'withdrawal', 
        loadComponent: () => import('./pages/transactions/withdrawal/withdrawal').then(m => m.Withdrawal),
        data: { breadcrumb: ['Withdrawal'] }
      },
      { 
        path: 'history', 
        loadComponent: () => import('./pages/transactions/history/history').then(m => m.History),
        data: { breadcrumb: ['History'] }
      }
    ]
  },
  {
    path: 'loans',
    component: Loan,
    data: { breadcrumb: ['Loans'] },
    children: [
      { 
        path: 'issue', 
        loadComponent: () => import('./pages/loan/issue/issue').then(m => m.Issue),
        data: { breadcrumb: ['Issue'] }
      },
      { 
        path: 'repayment', 
        loadComponent: () => import('./pages/loan/repayment/repayment').then(m => m.Repayment),
        data: { breadcrumb: ['Repayment'] }
      }
    ]
  },
  {
    path: 'reports',
    component: Report,
    data: { breadcrumb: ['Reports'] },
    children: [
      { 
        path: 'daily', 
        loadComponent: () => import('./pages/report/daily/daily').then(m => m.Daily),
        data: { breadcrumb: ['Daily Collections'] }
      },
      { 
        path: 'monthly', 
        loadComponent: () => import('./pages/report/monthly/monthly').then(m => m.Monthly),
        data: { breadcrumb: ['Monthly Summaries'] }
      }
    ]
  },
  { path: 'settings', component: Settings, data: { breadcrumb: ['Settings'] } }
];

import { Routes } from '@angular/router';
import { Dashboard } from './pages/portal/dashboard/dashboard';
import { Members } from './pages/portal/members/members';
import { Transactions } from './pages/portal/transactions/transactions';
import { Loan } from './pages/portal/loan/loan';
import { Report } from './pages/portal/report/report';
import { Settings } from './pages/portal/settings/settings';
import { Login } from './pages/auth/login/login';
import { Portal } from './pages/portal/portal';
import { authGuard, guestGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'portal/dashboard', pathMatch: 'full' },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'portal', component: Portal, canActivate: [authGuard], children: [
    { path: 'dashboard', component: Dashboard, data: { breadcrumb: ['Dashboard'] } },
    {
      path: 'members',
      component: Members,
      data: { breadcrumb: ['Members'] },
      children: [
        { 
          path: 'register', 
          loadComponent: () => import('./pages/portal/members/register/register').then(m => m.Register),
          data: { breadcrumb: ['Register'] }
        },
        { 
          path: 'directory', 
          loadComponent: () => import('./pages/portal/members/directory/directory').then(m => m.Directory),
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
          loadComponent: () => import('./pages/portal/transactions/deposit/deposit').then(m => m.Deposit),
          data: { breadcrumb: ['Deposit'] }
        },
        { 
          path: 'withdrawal', 
          loadComponent: () => import('./pages/portal/transactions/withdrawal/withdrawal').then(m => m.Withdrawal),
          data: { breadcrumb: ['Withdrawal'] }
        },
        { 
          path: 'history', 
          loadComponent: () => import('./pages/portal/transactions/history/history').then(m => m.History),
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
          loadComponent: () => import('./pages/portal/loan/issue/issue').then(m => m.Issue),
          data: { breadcrumb: ['Issue'] }
        },
        { 
          path: 'repayment', 
          loadComponent: () => import('./pages/portal/loan/repayment/repayment').then(m => m.Repayment),
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
          loadComponent: () => import('./pages/portal/report/daily/daily').then(m => m.Daily),
          data: { breadcrumb: ['Daily Collections'] }
        },
        { 
          path: 'monthly', 
          loadComponent: () => import('./pages/portal/report/monthly/monthly').then(m => m.Monthly),
          data: { breadcrumb: ['Monthly Summaries'] }
        },
        { 
          path: 'fund-distribution', 
          loadComponent: () => import('./pages/portal/report/fund-distribution-stats/fund-distribution-stats').then(m => m.FundDistributionStats),
          data: { breadcrumb: ['Fund Distribution'] }
        }
      ]
    },
    { 
      path: 'settings', 
      component: Settings, 
      data: { breadcrumb: ['Settings'] },
      children: [
        {
          path: 'user-details',
          loadComponent: () => import('./pages/portal/settings/user/details-component/details-component').then(m => m.DetailsComponent),
          data: { breadcrumb: ['User Details'] }
        },
        {
          path: 'users-list',
          loadComponent: () => import('./pages/portal/settings/user/users-list-component/users-list-component').then(m => m.UsersListComponent),
          data: { breadcrumb: ['Users'] }
        }
      ] 
    }
  ] },
];

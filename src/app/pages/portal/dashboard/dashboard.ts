import { Component, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from './service/dashboard-service';
import { DashboardData } from '@interfaces/dashboard.interface';
import { ToastService } from '@core/components/toast/service/toast-service';
import { CurrencyFormatterPipe } from '@shared/pipes/currency-formatter-pipe';
import { DateFormatterPipe } from '@shared/pipes/date-formatter-pipe';
import { TimeFormatterPipe } from '@shared/pipes/time-formatter-pipe';
import { AuthService } from '../../auth/services/auth-service';
import { ConfirmPasswordDialogComponent } from '@shared/components/confirm-password-dialog/confirm-password-dialog';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgApexchartsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    CurrencyFormatterPipe,
    DateFormatterPipe,
    TimeFormatterPipe,
    MatDialogModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  protected readonly isLoading = signal(true);
  protected readonly dashboardData = signal<DashboardData | null>(null);
  protected readonly selectedDate = signal<Date>(new Date());
  protected readonly showWelcome = signal(false);
  protected readonly userFirstName = signal('');
  protected readonly showAvailableFunds = signal(localStorage.getItem('credence.showAvailableFunds') === 'true');

  @ViewChild('chart') chart!: ChartComponent;

  // Chart options
  protected chartOptions: any = {
    series: [
      { name: 'Deposits', data: [] },
      { name: 'Withdrawals', data: [] }
    ],
    chart: {
      type: 'area',
      height: 350,
      toolbar: { show: false },
      animations: { enabled: true, easing: 'easeinout', speed: 800 }
    },
    colors: ['#5F77D1', '#F49236'], // Brand Primary and Brand Secondary
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      type: 'datetime',
      categories: [],
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `₵${val.toLocaleString()}`
      }
    },
    tooltip: {
      x: { format: 'dd MMM yyyy' },
      theme: 'light'
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100, 100, 100]
      }
    },
    grid: {
      borderColor: 'rgba(161, 161, 170, 0.1)', // Zinc-400 with low opacity
      strokeDashArray: 4
    }
  };

  async ngOnInit(): Promise<void> {
    await this.initWelcomeMessage();
    await this.loadDashboard();
  }

  ngOnDestroy(): void {
    if (this.showWelcome()) {
      this.dashboardService.setWelcomeMessageShown();
    }
  }

  /**
   * Resolves the user's first name for the personalized welcome message.
   * Falls back to the backend if the full name is not already cached locally.
   */
  private async initWelcomeMessage(): Promise<void> {
    let fullName = this.authService.getFullname();

    if (!fullName) {
      try {
        const user = await this.authService.getActiveUser();
        fullName = user.fullname;
      } catch {
        fullName = this.authService.getUsername() ?? 'User';
      }
    }

    const firstName = fullName.split(' ')[0] || 'User';
    this.userFirstName.set(firstName);
    this.showWelcome.set(this.dashboardService.showWelcomeMessage);
  }

  private async loadDashboard(): Promise<void> {
    try {
      const data = await this.dashboardService.getDashboardData();
      this.dashboardData.set(data);
      this.updateChart(data);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
      this.toastService.error({ message: 'Unable to load dashboard data.' });
    } finally {
      this.isLoading.set(false);
    }
  }

  private updateChart(data: DashboardData): void {
    const categories = data.chartData.map(d => d.date);
    const deposits = data.chartData.map(d => d.deposits);
    const withdrawals = data.chartData.map(d => d.withdrawals);

    this.chartOptions = {
      ...this.chartOptions,
      series: [
        { name: 'Deposits', data: deposits },
        { name: 'Withdrawals', data: withdrawals }
      ],
      xaxis: {
        ...this.chartOptions.xaxis,
        categories: categories
      }
    };
  }

  /**
   * Toggles the visibility of the Available Funds balance.
   * Revealing the balance requires password confirmation; hiding is always allowed.
   */
  protected async toggleAvailableFunds(): Promise<void> {
    if (this.showAvailableFunds()) {
      this.setAvailableFundsVisible(false);
      return;
    }

    const result = await firstValueFrom(
      this.dialog.open(ConfirmPasswordDialogComponent, { disableClose: true, width: '400px' }).afterClosed()
    );

    if (result === true) {
      this.setAvailableFundsVisible(true);
    }
  }

  private setAvailableFundsVisible(visible: boolean): void {
    this.showAvailableFunds.set(visible);
    localStorage.setItem('credence.showAvailableFunds', String(visible));
  }

  protected getActivityIcon(type: string): string {
    switch (type) {
      case 'deposit': return 'arrow_downward';
      case 'withdrawal': return 'arrow_upward';
      case 'loan': return 'account_balance_wallet';
      case 'repayment': return 'payments';
      default: return 'help_outline';
    }
  }

  protected getActivityColor(type: string): string {
    switch (type) {
      case 'deposit': return 'text-emerald-600 bg-emerald-500/10';
      case 'withdrawal': return 'text-amber-600 bg-amber-500/10';
      case 'loan': return 'text-blue-600 bg-blue-500/10';
      case 'repayment': return 'text-brand-primary bg-brand-primary/10';
      default: return 'text-text-muted bg-surface-hover';
    }
  }
}

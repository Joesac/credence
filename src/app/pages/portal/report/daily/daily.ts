import { Component, inject, signal, computed, effect, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { DataTable, ColumnDef } from '@shared/components/data-table/data-table';
import { DataTableCellDirective } from '@shared/components/data-table/directive/data-table-cell-directive';
import { UtilsService } from '@shared/services/utils-service';
import { DepositService } from '../../transactions/deposit/service/deposit-service';
import { WithdrawalService } from '../../transactions/withdrawal/service/withdrawal-service';
import { ToastService } from '@core/components/toast/service/toast-service';
import { Deposit } from '@interfaces/deposit.interface';
import { Withdrawal } from '@interfaces/withdrawal.interface';
import { DailySummary } from '@interfaces/dashboard.interface';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';
import { RightSidebarService } from '@core/services/right-sidebar-service';
import { ActionsButtonComponent, ActionButtonOption } from '@shared/components/actions-button/actions-button.component';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog-component/confirm-dialog-component';

type DailyTransaction = {
  id: string;
  transactionId: string;
  type: 'Deposit' | 'Withdrawal';
  memberName: string;
  amount: number;
  refreshmentToken?: number;
  paymentMethod?: string;
  receivedBy?: string;
  receivedByName?: string;
  issuerId?: string;
  issuerName?: string;
  notes?: string | null;
  occurredAt: string;
  dateCreated: string;
  dateUpdated: string;
  isCancelled: boolean;
  action?: string;
};

@Component({
  selector: 'app-daily',
  imports: [
    FormsModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    DataTable,
    DataTableCellDirective,
    ActionsButtonComponent,
    PortalModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './daily.html',
  styleUrl: './daily.scss',
})
export class Daily {
  protected readonly utilsService = inject(UtilsService);
  private readonly depositService = inject(DepositService);
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly toastService = inject(ToastService);
  private readonly ipcBridge = inject(IpcBridgeService);
  protected readonly rightSidebarService = inject(RightSidebarService);
  private readonly dialog = inject(MatDialog);

  @ViewChild('viewDetailsPortal', { static: true }) viewDetailsPortal!: CdkPortal;

  protected readonly selectedDate = signal<Date>(new Date());
  protected readonly isLoadingDeposits = signal<boolean>(false);
  protected readonly isLoadingWithdrawals = signal<boolean>(false);
  protected readonly isLoadingSummary = signal<boolean>(false);
  protected readonly dailySummary = signal<DailySummary | null>(null);

  protected readonly selectedTransaction = signal<DailyTransaction | null>(null);

  protected readonly depositPage = signal<number>(1);
  protected readonly depositPageSize = signal<number>(10);
  protected readonly depositTotalRecords = signal<number>(0);

  protected readonly withdrawalPage = signal<number>(1);
  protected readonly withdrawalPageSize = signal<number>(10);
  protected readonly withdrawalTotalRecords = signal<number>(0);

  private readonly deposits = signal<Deposit[]>([]);
  private readonly withdrawals = signal<Withdrawal[]>([]);
  private depositRequestId = 0;
  private withdrawalRequestId = 0;

  constructor() {
    effect(() => {
      const date = this.selectedDate();
      const page = this.depositPage();
      const pageSize = this.depositPageSize();
      void this.fetchDeposits(date, page, pageSize);
    });

    effect(() => {
      const date = this.selectedDate();
      const page = this.withdrawalPage();
      const pageSize = this.withdrawalPageSize();
      void this.fetchWithdrawals(date, page, pageSize);
    });

    effect(() => {
      const date = this.selectedDate();
      void this.fetchDailySummary(date);
    });
  }

  protected readonly transactionColumns: ColumnDef<DailyTransaction>[] = [
    {
      key: 'occurredAt',
      header: 'Date & Time',
      formatter: (row) => ({
        primary: this.utilsService.dateFormatter(row.occurredAt),
        secondary: this.utilsService.timeFormatter(row.occurredAt).toUpperCase(),
      }),
    },
    { key: 'transactionId', header: 'Transaction ID' },
    { key: 'type', header: 'Type' },
    { key: 'isCancelled', header: 'Status' },
    { key: 'memberName', header: 'Member' },
    {
      key: 'amount',
      header: 'Amount',
      formatter: (row) => this.utilsService.formatCurrency(row.amount),
    },
    { key: 'action', header: '' },
  ];

  protected readonly depositColumns: ColumnDef<DailyTransaction>[] = [
    ...this.transactionColumns.slice(0, -1),
    {
      key: 'refreshmentToken',
      header: 'Refreshment Token',
      formatter: (row) => (row.refreshmentToken === undefined || row.refreshmentToken === null) ? '-' : String(row.refreshmentToken),
    },
    ...this.transactionColumns.slice(-1),
  ];

  protected readonly depositRows = computed<DailyTransaction[]>(() =>
    this.deposits().map((deposit) => this.toDailyRow({
      id: deposit.id,
      transactionId: deposit.transaction_id ?? deposit.id,
      memberName: deposit.member_name,
      amount: deposit.amount,
      refreshmentToken: deposit.refreshment_token,
      paymentMethod: deposit.payment_method,
      receivedBy: deposit.received_by,
      receivedByName: deposit.received_by_name,
      notes: deposit.notes,
      occurredAt: deposit.date_updated ?? deposit.date_created,
      dateCreated: deposit.date_created,
      dateUpdated: deposit.date_updated,
      type: 'Deposit',
      isCancelled: Boolean(deposit.is_cancelled),
    }))
  );

  protected readonly withdrawalRows = computed<DailyTransaction[]>(() =>
    this.withdrawals().map((withdrawal) => this.toDailyRow({
      id: withdrawal.id,
      transactionId: withdrawal.transaction_id ?? withdrawal.id,
      memberName: withdrawal.member_name,
      amount: withdrawal.amount,
      issuerId: withdrawal.issuer_id,
      issuerName: withdrawal.issuer_name,
      notes: withdrawal.notes,
      occurredAt: withdrawal.date_updated ?? withdrawal.date_created,
      dateCreated: withdrawal.date_created,
      dateUpdated: withdrawal.date_updated,
      type: 'Withdrawal',
      isCancelled: Boolean(withdrawal.is_cancelled),
    }))
  );

  protected getTransactionActions(row: DailyTransaction): ActionButtonOption[] {
    return [
      { id: 'view-details', label: 'View details', icon: 'visibility' },
      ...(row.isCancelled ? [] : [{ id: 'cancel', label: 'Cancel', icon: 'cancel' }]),
    ];
  }

  protected readonly depositEmptyMessage = 'No deposits for the selected date.';
  protected readonly withdrawalEmptyMessage = 'No withdrawals for the selected date.';

  protected onDateChange(date: Date | null): void {
    if (!date) {
      return;
    }
    this.depositPage.set(1);
    this.withdrawalPage.set(1);
    this.selectedDate.set(date);
  }

  private toDailyRow(row: DailyTransaction): DailyTransaction {
    return { ...row };
  }

  protected handleTransactionAction(action: ActionButtonOption, row: DailyTransaction): void {
    if (action.id === 'view-details') {
      this.selectedTransaction.set(row);
      this.rightSidebarService.open(this.viewDetailsPortal);
      return;
    }

    if (action.id !== 'cancel' || row.isCancelled) {
      return;
    }

    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Cancel ${row.type}`,
        message: `Are you sure you want to cancel this ${row.type.toLowerCase()} transaction (${row.transactionId}) by ${row.memberName}?`,
        onConfirm: () => row.type === 'Deposit' ? this.cancelDeposit(row) : this.cancelWithdrawal(row),
      } as ConfirmDialogData,
    });
  }

  private async cancelDeposit(row: DailyTransaction): Promise<void> {
    const date = this.selectedDate();
    const response = await this.depositService.deleteDeposit(row.id);
    if (!response.success) {
      throw new Error('Unable to cancel deposit.');
    }
    this.toastService.success({ message: 'Deposit cancelled successfully.' });
    void this.fetchDeposits(date, this.depositPage(), this.depositPageSize());
    void this.fetchDailySummary(date);
  }

  private async cancelWithdrawal(row: DailyTransaction): Promise<void> {
    const date = this.selectedDate();
    const response = await this.withdrawalService.deleteWithdrawal(row.id);
    if (!response.success) {
      throw new Error('Unable to cancel withdrawal.');
    }
    this.toastService.success({ message: 'Withdrawal cancelled successfully.' });
    void this.fetchWithdrawals(date, this.withdrawalPage(), this.withdrawalPageSize());
    void this.fetchDailySummary(date);
  }

  private formatDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async fetchDeposits(date: Date, page: number, pageSize: number): Promise<void> {
    const requestId = ++this.depositRequestId;
    this.isLoadingDeposits.set(true);
    try {
      const response = await this.depositService.getDeposits({
        page,
        pageSize,
        includeCancelled: true,
        date: this.formatDateParam(date),
      });
      if (requestId !== this.depositRequestId) {
        return;
      }
      this.deposits.set(response.data);
      this.depositTotalRecords.set(response.pagination.totalRecords);
      if (this.depositPage() !== response.pagination.page) {
        this.depositPage.set(response.pagination.page);
      }
      if (this.depositPageSize() !== response.pagination.pageSize) {
        this.depositPageSize.set(response.pagination.pageSize);
      }
    } catch (error) {
      if (requestId !== this.depositRequestId) {
        return;
      }
      console.error('Failed to load daily deposits', error);
      this.toastService.error({ message: 'Unable to load daily deposits.' });
      this.deposits.set([]);
      this.depositTotalRecords.set(0);
    } finally {
      if (requestId === this.depositRequestId) {
        this.isLoadingDeposits.set(false);
      }
    }
  }

  private async fetchWithdrawals(date: Date, page: number, pageSize: number): Promise<void> {
    const requestId = ++this.withdrawalRequestId;
    this.isLoadingWithdrawals.set(true);
    try {
      const response = await this.withdrawalService.getWithdrawals({
        page,
        pageSize,
        includeCancelled: true,
        date: this.formatDateParam(date),
      });
      if (requestId !== this.withdrawalRequestId) {
        return;
      }
      this.withdrawals.set(response.data);
      this.withdrawalTotalRecords.set(response.pagination.totalRecords);
      if (this.withdrawalPage() !== response.pagination.page) {
        this.withdrawalPage.set(response.pagination.page);
      }
      if (this.withdrawalPageSize() !== response.pagination.pageSize) {
        this.withdrawalPageSize.set(response.pagination.pageSize);
      }
    } catch (error) {
      if (requestId !== this.withdrawalRequestId) {
        return;
      }
      console.error('Failed to load daily withdrawals', error);
      this.toastService.error({ message: 'Unable to load daily withdrawals.' });
      this.withdrawals.set([]);
      this.withdrawalTotalRecords.set(0);
    } finally {
      if (requestId === this.withdrawalRequestId) {
        this.isLoadingWithdrawals.set(false);
      }
    }
  }

  private summaryRequestId = 0;

  private async fetchDailySummary(date: Date): Promise<void> {
    const requestId = ++this.summaryRequestId;
    this.isLoadingSummary.set(true);
    try {
      const summary = await this.ipcBridge.executeIPC(api =>
        api.getDailySummary({ date: this.formatDateParam(date) })
      );
      if (requestId !== this.summaryRequestId) {
        return;
      }
      this.dailySummary.set(summary);
    } catch (error) {
      if (requestId !== this.summaryRequestId) {
        return;
      }
      console.error('Failed to load daily summary', error);
      this.dailySummary.set(null);
    } finally {
      if (requestId === this.summaryRequestId) {
        this.isLoadingSummary.set(false);
      }
    }
  }
}

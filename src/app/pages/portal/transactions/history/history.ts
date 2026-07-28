import { Component, signal, computed, inject, effect } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { UserDetails } from '../../members/components/user-details/user-details';
import { Member } from '@interfaces/member.interface';
import { DataTable, ColumnDef } from '@shared/components/data-table/data-table';
import { DataTableCellDirective } from '@shared/components/data-table/directive/data-table-cell-directive';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';
import { UtilsService } from '@shared/services/utils-service';
import { DepositService } from '../deposit/service/deposit-service';
import { WithdrawalService } from '../withdrawal/service/withdrawal-service';
import { ToastService } from '@core/components/toast/service/toast-service';
import { Deposit } from '@interfaces/deposit.interface';
import { Withdrawal } from '@interfaces/withdrawal.interface';
import { ActionsButtonComponent, ActionButtonOption } from '@shared/components/actions-button/actions-button.component';

type HistoryTransaction = {
  id: string;
  transactionId: string;
  memberId: string;
  type: 'Deposit' | 'Withdrawal';
  amount: number;
  refreshmentToken?: number;
  occurredAt: string;
  isCancelled: boolean;
  action?: string;
};

@Component({
  selector: 'app-history',
  imports: [
    MatTabsModule,
    UserDetails,
    DataTable,
    DataTableCellDirective,
    ActionsButtonComponent,
    MemberSelectionDropdown
  ],
  templateUrl: './history.html',
  styleUrl: './history.scss',
  host: { 'class': 'w-full flex justify-center' }
})
export class History {
  private readonly utilsService = inject(UtilsService);
  private readonly depositService = inject(DepositService);
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly toastService = inject(ToastService);
  
  protected readonly selectedMember = signal<Member | null>(null);
  protected readonly isLoadingDeposits = signal<boolean>(false);
  protected readonly isLoadingWithdrawals = signal<boolean>(false);

  protected readonly cancellingDepositId = signal<string | null>(null);
  protected readonly cancellingWithdrawalId = signal<string | null>(null);

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
      const member = this.selectedMember();
      const page = this.depositPage();
      const pageSize = this.depositPageSize();
      if (!member) {
        return;
      }
      void this.fetchDeposits(member.id, page, pageSize);
    });

    effect(() => {
      const member = this.selectedMember();
      const page = this.withdrawalPage();
      const pageSize = this.withdrawalPageSize();
      if (!member) {
        return;
      }
      void this.fetchWithdrawals(member.id, page, pageSize);
    });
  }

  protected readonly transactionColumns: ColumnDef<HistoryTransaction>[] = [
    {
      key: 'occurredAt',
      header: 'Date & Time',
      formatter: (row) => {
        return {
          primary: this.utilsService.dateFormatter(row.occurredAt),
          secondary: this.utilsService.timeFormatter(row.occurredAt).toUpperCase()
        };
      }
    },
    { key: 'transactionId', header: 'Transaction ID' },
    { key: 'type', header: 'Type' },
    { key: 'isCancelled', header: 'Status' },
    {
      key: 'amount',
      header: 'Amount',
      formatter: (row) => this.utilsService.formatCurrency(row.amount)
    },
    { key: 'action', header: '' }
  ];

  protected readonly depositColumns: ColumnDef<HistoryTransaction>[] = [
    this.transactionColumns[0],
    this.transactionColumns[1],
    this.transactionColumns[2],
    this.transactionColumns[3],
    this.transactionColumns[4],
    {
      key: 'refreshmentToken',
      header: 'Refreshment Token',
      formatter: (row) => row.refreshmentToken ?? '',
    },
    this.transactionColumns[5],
  ];

  protected readonly transactionActions: ActionButtonOption[] = [
    { id: 'cancel', label: 'Cancel' }
  ];

  protected readonly depositRows = computed<HistoryTransaction[]>(() => {
    const memberId = this.selectedMember()?.id;
    if (!memberId) {
      return [];
    }

    return this.deposits().map((deposit) => this.toHistoryRow({
      id: deposit.id,
      transactionId: deposit.transaction_id ?? deposit.id,
      memberId: deposit.member_id,
      amount: deposit.amount,
      refreshmentToken: deposit.refreshment_token,
      occurredAt: deposit.date_updated ?? deposit.date_created,
      type: 'Deposit',
      isCancelled: Boolean(deposit.is_cancelled),
    }));
  });

  protected readonly withdrawalRows = computed<HistoryTransaction[]>(() => {
    const memberId = this.selectedMember()?.id;
    if (!memberId) {
      return [];
    }

    return this.withdrawals().map((withdrawal) => this.toHistoryRow({
      id: withdrawal.id,
      transactionId: withdrawal.transaction_id ?? withdrawal.id,
      memberId: withdrawal.member_id,
      amount: withdrawal.amount,
      occurredAt: withdrawal.date_updated ?? withdrawal.date_created,
      type: 'Withdrawal',
      isCancelled: Boolean(withdrawal.is_cancelled),
    }));
  });

  protected readonly depositEmptyMessage = computed(() => {
    if (!this.selectedMember()) {
      return 'Select a member to view transaction history.';
    }
    return 'No deposit history';
  });

  protected readonly withdrawalEmptyMessage = computed(() => {
    if (!this.selectedMember()) {
      return 'Select a member to view transaction history.';
    }
    return 'No withdrawal history';
  });

  protected onSelectMember(member: Member | null) {
    this.selectedMember.set(member);
    if (!member) {
      this.clearData();
      return;
    }
    this.depositPage.set(1);
    this.withdrawalPage.set(1);
  }

  private toHistoryRow(row: HistoryTransaction): HistoryTransaction {
    return {
      ...row,
      memberId: row.memberId,
    };
  }

  protected handleTransactionAction(action: ActionButtonOption, row: HistoryTransaction): void {
    if (action.id !== 'cancel' || row.isCancelled) {
      return;
    }

    if (row.type === 'Deposit') {
      void this.cancelDeposit(row);
      return;
    }

    void this.cancelWithdrawal(row);
  }

  private async cancelDeposit(row: HistoryTransaction): Promise<void> {
    const member = this.selectedMember();
    if (!member) {
      return;
    }

    this.cancellingDepositId.set(row.id);
    try {
      const response = await this.depositService.deleteDeposit(row.id);
      if (!response.success) {
        this.toastService.error({ message: 'Unable to cancel deposit.' });
        return;
      }
      this.toastService.success({ message: 'Deposit cancelled successfully.' });
      if (this.selectedMember()?.id === member.id) {
        await this.fetchDeposits(member.id, this.depositPage(), this.depositPageSize());
      }
    } catch (error) {
      const ipcError = this.depositService.extractIpcError(error);
      this.toastService.error({ message: (ipcError.message || '') as string });
    } finally {
      if (this.cancellingDepositId() === row.id) {
        this.cancellingDepositId.set(null);
      }
    }
  }

  private async cancelWithdrawal(row: HistoryTransaction): Promise<void> {
    const member = this.selectedMember();
    if (!member) {
      return;
    }

    this.cancellingWithdrawalId.set(row.id);
    try {
      const response = await this.withdrawalService.deleteWithdrawal(row.id);
      if (!response.success) {
        this.toastService.error({ message: 'Unable to cancel withdrawal.' });
        return;
      }
      this.toastService.success({ message: 'Withdrawal cancelled successfully.' });
      if (this.selectedMember()?.id === member.id) {
        await this.fetchWithdrawals(member.id, this.withdrawalPage(), this.withdrawalPageSize());
      }
    } catch (error) {
      const ipcError = this.withdrawalService.extractIpcError(error);
      this.toastService.error({ message: (ipcError.message || '') as string });
    } finally {
      if (this.cancellingWithdrawalId() === row.id) {
        this.cancellingWithdrawalId.set(null);
      }
    }
  }

  private clearData() {
    this.deposits.set([]);
    this.withdrawals.set([]);
    this.isLoadingDeposits.set(false);
    this.isLoadingWithdrawals.set(false);
    this.depositTotalRecords.set(0);
    this.withdrawalTotalRecords.set(0);
    this.depositPage.set(1);
    this.withdrawalPage.set(1);
    this.depositRequestId++;
    this.withdrawalRequestId++;
  }

  private async fetchDeposits(memberId: string, page: number, pageSize: number): Promise<void> {
    const requestId = ++this.depositRequestId;
    this.isLoadingDeposits.set(true);
    try {
      const response = await this.depositService.getDeposits({ page, pageSize, includeCancelled: true, memberId });
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
      console.error('Failed to load deposit history', error);
      this.toastService.error({ message: 'Unable to load deposit history.' });
      this.deposits.set([]);
      this.depositTotalRecords.set(0);
    } finally {
      if (requestId === this.depositRequestId) {
        this.isLoadingDeposits.set(false);
      }
    }
  }

  private async fetchWithdrawals(memberId: string, page: number, pageSize: number): Promise<void> {
    const requestId = ++this.withdrawalRequestId;
    this.isLoadingWithdrawals.set(true);
    try {
      const response = await this.withdrawalService.getWithdrawals({ page, pageSize, includeCancelled: true, memberId });
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
      console.error('Failed to load withdrawal history', error);
      this.toastService.error({ message: 'Unable to load withdrawal history.' });
      this.withdrawals.set([]);
      this.withdrawalTotalRecords.set(0);
    } finally {
      if (requestId === this.withdrawalRequestId) {
        this.isLoadingWithdrawals.set(false);
      }
    }
  }
}

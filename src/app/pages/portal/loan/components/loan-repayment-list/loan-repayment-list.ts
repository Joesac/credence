import { Component, effect, inject, input, output, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DataTable, ColumnDef } from '@shared/components/data-table/data-table';
import { DataTableCellDirective } from '@shared/components/data-table/directive/data-table-cell-directive';
import { ActionsButtonComponent, ActionButtonOption } from '@shared/components/actions-button/actions-button.component';
import { ToastService } from '@core/components/toast/service/toast-service';
import { LoanRepayment, PaginatedLoanRepayments } from '@interfaces/loan.interface';
import { LoanService } from '../../service/loan-service';
import { CurrencyFormatterPipe } from '@shared/pipes/currency-formatter-pipe';
import { DateFormatterPipe } from '@shared/pipes/date-formatter-pipe';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog-component/confirm-dialog-component';

@Component({
  selector: 'app-loan-repayment-list',
  imports: [
    DataTable,
    DataTableCellDirective,
    ActionsButtonComponent,
  ],
  providers: [CurrencyFormatterPipe, DateFormatterPipe],
  templateUrl: './loan-repayment-list.html',
  styleUrl: './loan-repayment-list.scss',
})
export class LoanRepaymentList {
  private readonly loanService = inject(LoanService);
  private readonly toastService = inject(ToastService);
  private readonly currencyPipe = inject(CurrencyFormatterPipe);
  private readonly datePipe = inject(DateFormatterPipe);
  private readonly dialog = inject(MatDialog);
  private requestId = 0;

  /** The loan whose repayments should be listed. */
  readonly loanId = input.required<string>();

  readonly onRepaymentCancelled = output<void>();

  protected readonly repayments = signal<LoanRepayment[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly totalRecords = signal(0);

  protected readonly columns: ColumnDef<LoanRepayment>[] = [
    { key: 'receiver', header: 'Issuer name', formatter: (row) => row.receiver?.fullname ?? '—' },
    { key: 'amount', header: 'Amount', formatter: (row) => this.currencyPipe.transform(row.amount) },
    { key: 'is_cancelled', header: 'Cancelled', formatter: (row) => (row.is_cancelled ? 'Yes' : 'No') },
    { key: 'notes', header: 'Notes' },
    { key: 'date_created', header: 'Date created', formatter: (row) => this.datePipe.transform(row.date_created) },
    { key: 'action', header: '' },
  ];

  protected readonly cancelOptions: ActionButtonOption[] = [
    { id: 'cancel', label: 'Cancel' },
  ];

  constructor() {
    effect(() => {
      const loanId = this.loanId();
      const page = this.currentPage();
      const pageSize = this.pageSize();

      if (!loanId) {
        this.repayments.set([]);
        this.totalRecords.set(0);
        return;
      }

      void this.loanRepayments(loanId, page, pageSize);
    });
  }

  private async loanRepayments(loanId: string, page: number, pageSize: number): Promise<void> {
    const requestId = ++this.requestId;
    this.isLoading.set(true);

    try {
      const response: PaginatedLoanRepayments = await this.loanService.getLoanRepaymentsByLoanId({ loanId, page, pageSize });

      if (requestId !== this.requestId) {
        return;
      }

      this.repayments.set(response.data);
      this.totalRecords.set(response.pagination.totalRecords);
      this.currentPage.set(response.pagination.page);
      this.pageSize.set(response.pagination.pageSize);
    } catch (error) {
      if (requestId !== this.requestId) {
        return;
      }

      this.toastService.error({ message: 'Could not load repayments' });
      this.repayments.set([]);
      this.totalRecords.set(0);
    } finally {
      if (requestId === this.requestId) {
        this.isLoading.set(false);
      }
    }
  }

  protected handleActionSelection(option: ActionButtonOption, repayment: LoanRepayment): void {
    if (option.id !== 'cancel') return;

    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancel Repayment',
        message: `Are you sure you want to cancel this repayment of ${this.currencyPipe.transform(repayment.amount)}?`,
        onConfirm: () => this.cancelRepayment(repayment),
      } as ConfirmDialogData,
    });
  }

  private async cancelRepayment(repayment: LoanRepayment): Promise<void> {
    await this.loanService.updateLoanRepayment({ id: repayment.id, isCancelled: true });
    this.toastService.success({ message: 'Repayment cancelled' });
    await this.loanRepayments(this.loanId(), this.currentPage(), this.pageSize());
    this.onRepaymentCancelled.emit();
  }
}

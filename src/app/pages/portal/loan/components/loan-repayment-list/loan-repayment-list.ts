import { Component, effect, inject, input, signal } from '@angular/core';
import { DataTable, ColumnDef } from '@shared/components/data-table/data-table';
import { DataTableCellDirective } from '@shared/components/data-table/directive/data-table-cell-directive';
import { ActionsButtonComponent, ActionButtonOption } from '@shared/components/actions-button/actions-button.component';
import { ToastService } from '@core/components/toast/service/toast-service';
import { LoanRepayment, PaginatedLoanRepayments } from '@interfaces/loan.interface';
import { LoanService } from '../../service/loan-service';
import { CurrencyFormatterPipe } from '@shared/pipes/currency-formatter-pipe';
import { DateFormatterPipe } from '@shared/pipes/date-formatter-pipe';

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
  private requestId = 0;

  /** The loan whose repayments should be listed. */
  readonly loanId = input.required<string>();

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

      void this.loadRepayments(loanId, page, pageSize);
    });
  }

  private async loadRepayments(loanId: string, page: number, pageSize: number): Promise<void> {
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
    if (option.id === 'cancel') {
      void this.cancelRepayment(repayment);
    }
  }

  private async cancelRepayment(repayment: LoanRepayment): Promise<void> {
    this.isLoading.set(true);

    try {
      await this.loanService.updateLoanRepayment({ id: repayment.id, isCancelled: true });
      this.toastService.success({ message: 'Repayment cancelled' });
      await this.loadRepayments(this.loanId(), this.currentPage(), this.pageSize());
    } catch (error) {
      console.error('Failed to cancel repayment', error);
      this.toastService.error({ message: 'Could not cancel repayment' });
    } finally {
      this.isLoading.set(false);
    }
  }
}

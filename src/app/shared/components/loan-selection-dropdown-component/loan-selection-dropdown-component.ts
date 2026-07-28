import { Component, signal, computed, output, effect, inject, debounced, input } from '@angular/core';
import { Dropdown } from '@shared/components/dropdown/dropdown';
import { LoanService } from '../../../pages/portal/loan/service/loan-service';
import { Loan } from '@interfaces/loan.interface';


@Component({
  selector: 'app-loan-selection-dropdown-component',
  imports: [Dropdown],
  templateUrl: './loan-selection-dropdown-component.html',
  styleUrl: './loan-selection-dropdown-component.scss',
  host: {
    'class': 'w-full'
  }
})
export class LoanSelectionDropdownComponent {
  readonly onSelectLoan = output<Loan | null>();
  readonly memberId = input<string | null>(null);
  private readonly loanService = inject(LoanService);

  protected readonly searchQuery = signal<string>('');
  private readonly debouncedQuery = debounced(this.searchQuery, 500);
  protected readonly loans = signal<Loan[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly selectedLoanId = signal<string | null>(null);
  private previousMemberId: string | null = null;
  private previousQuery = '';
  private readonly currencyFormatter = new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  private readonly dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  protected readonly loansToDisplayInDrop = computed(() =>
    this.loans().map(loan => ({
      label: this.buildLoanLabel(loan),
      value: loan.id,
    }))
  );

  constructor() {
    effect(() => {
      const memberId = this.memberId();
      const query = this.debouncedQuery.value().trim();

      if (!memberId) {
        if (this.previousMemberId !== null) {
          this.resetState();
        }
        this.previousMemberId = null;
        this.previousQuery = '';
        return;
      }

      if (memberId !== this.previousMemberId) {
        this.previousMemberId = memberId;
        this.previousQuery = '';
        this.resetState();
        void this.loadLoans(memberId, this.previousQuery);
        return;
      }

      if (query !== this.previousQuery) {
        this.previousQuery = query;
        void this.loadLoans(memberId, query);
      }
    });
  }

  protected handleSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  protected onLoanSelect(loanId: string | null): void {
    if (!loanId) {
      this.clearSelection();
      return;
    }

    const loan = this.loans().find(m => m.id === loanId) ?? null;
    if (loan) {
      this.selectedLoanId.set(loan.id);
      this.searchQuery.set(this.buildLoanLabel(loan));
    }
    this.onSelectLoan.emit(loan);
  }

  refreshLoans(): void {
    const memberId = this.memberId();
    if (!memberId) {
      this.resetState();
      return;
    }

    void this.loadLoans(memberId, this.searchQuery().trim());
  }

  private async loadLoans(memberId: string, search: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await this.loanService.getMemberLoans({
        page: 1,
        pageSize: 20,
        memberId,
        includeCancelled: false,
        search,
      });
      const activeLoans = response.data.filter(loan => loan.is_cancelled === 0 && loan.outstandingBalance > 0);
      this.loans.set(activeLoans);

      if (!activeLoans.length) {
        this.clearSelection();
      } else if (this.selectedLoanId()) {
        const stillSelected = activeLoans.some(loan => loan.id === this.selectedLoanId());
        if (!stillSelected) {
          this.clearSelection();
        }
      }
    } catch (error) {
      console.error('Unable to fetch loans', error);
      this.loans.set([]);
      this.clearSelection();
    } finally {
      this.isLoading.set(false);
    }
  }

  private resetState(): void {
    this.isLoading.set(false);
    this.loans.set([]);
    this.searchQuery.set('');
    this.clearSelection();
  }

  private clearSelection(): void {
    if (this.selectedLoanId()) {
      this.selectedLoanId.set(null);
    }
    this.onSelectLoan.emit(null);
  }

  private buildLoanLabel(loan: Loan): string {
    return `${this.formatAmount(loan.amount)} - ${this.formatDate(loan.date_created)}`;
  }

  private formatAmount(amount: number): string {
    return `GHC ${this.currencyFormatter.format(amount)}`;
  }

  private formatDate(date: string): string {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.valueOf())) {
      return date;
    }
    return this.dateFormatter.format(parsed);
  }
}

import { Component, signal, computed, inject, viewChild } from '@angular/core';
import { required, form, FormField, min } from '@angular/forms/signals';
import { MatButtonModule } from "@angular/material/button";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MemberSummary } from '../../members/components/member-summary/member-summary';
import { Member } from '@interfaces/member.interface';
import { Loan } from '@interfaces/loan.interface';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';
import { LoanSelectionDropdownComponent } from '@shared/components/loan-selection-dropdown-component/loan-selection-dropdown-component';
import { LoanDetails, LoanDetailsData } from '../components/loan-details/loan-details';
import { ToastService } from '@core/components/toast/service/toast-service';
import { UtilsService } from '@shared/services/utils-service';
import { DisableCoverComponent } from '@shared/components/disable-cover-component/disable-cover-component';
import { AuthService } from '../../../auth/services/auth-service';
import { LoanService } from '../service/loan-service';
import { LoanRepaymentList } from '../components/loan-repayment-list/loan-repayment-list';

interface repaymentData {
  date: Date;
  amount: number | null;
  notes: string;
}

@Component({
  selector: 'app-repayment',
  imports: [
    MatButtonModule,
    FormField,
    MemberSummary,
    Inputfield,
    MemberSelectionDropdown,
    LoanSelectionDropdownComponent,
    LoanDetails,
    LoanRepaymentList,
    DisableCoverComponent,
    MatDatepickerModule,
    MatInputModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './repayment.html',
  styleUrl: './repayment.scss'
})
export class Repayment {
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly loanService = inject(LoanService);
  private readonly utilService = inject(UtilsService);

  private readonly memberSummaryComponent = viewChild(MemberSummary);
  private readonly loanDropdownComponent = viewChild(LoanSelectionDropdownComponent);

  protected readonly viewRepayments = signal(false);

  protected readonly selectedMember = signal<Member | null>(null);
  protected readonly selectedLoan = signal<Loan | null>(null);
  protected readonly isSubmitting = signal(false);

  protected readonly maxDate: Date = new Date();

  protected readonly loanDetails = computed<LoanDetailsData | null>(() => {
    const loan = this.selectedLoan();
    if (!loan) {
      return null;
    }

    return {
      amountLoaned: loan.amount,
      rate: loan.interest_rate,
      dueDate: loan.due_date,
      dateCreated: loan.date_created,
      amountPaid: loan.totalRepaid,
    };
  });

  private INITIAL_DATA = <repaymentData>({
    date: new Date(),
    amount: null,
    notes: ''
  })
  protected readonly repaymentModel = signal<repaymentData>(this.INITIAL_DATA);
  protected repaymentForm = form(this.repaymentModel, (path) => {
    required(path.date, {
      message: 'Date is required'
    });

    required(path.amount, {
      message: 'Amount is required'
    });
    min(path.amount, 1, { message: 'Minimum amount is 1' });
  });

  protected onSelectMember(member: Member | null) {
    this.selectedMember.set(member);
    this.selectedLoan.set(null);
  }

  protected onSelectLoan(loan: Loan | null) {
    this.selectedLoan.set(loan);
  }

  protected async onSubmit(event: Event) {
    event.preventDefault();

    if (this.repaymentForm().invalid()) {
      this.toastService.error({ message: 'Enter a valid repayment amount before submitting.' });
      return;
    }

    const member = this.selectedMember();
    if (!member) {
      this.toastService.error({ message: 'Select a member before recording repayments.' });
      return;
    }

    const loan = this.selectedLoan();
    if (!loan) {
      this.toastService.error({ message: 'Select a loan to apply this repayment.' });
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    let receiverId: string;
    try {
      const activeUser = await this.authService.getActiveUser();
      receiverId = activeUser.id;
    } catch (error) {
      await this.authService.handleAuthError(error, this.toastService);
      return;
    }

    const { date, amount, notes } = this.repaymentForm().value();
    const normalizedAmount = Number(amount);
    const payload = {
      loanId: loan.id,
      receiverId,
      amount: normalizedAmount,
      notes: notes?.trim() ? notes.trim() : null,
      date: (date as Date).toLocaleDateString('en-CA'),
    };

    this.isSubmitting.set(true);
    try {
      await this.loanService.addLoanRepayment(payload);
      this.toastService.success({ message: `Repayment of ${this.formatCurrency(normalizedAmount)} recorded.` });
      this.repaymentForm().reset({ ...this.INITIAL_DATA });
      await this.refreshSelectedLoanDetails(member.id, loan.id);
      this.loanDropdownComponent()?.refreshLoans();
      this.memberSummaryComponent()?.refreshFinancialSummary();
    } catch (error) {
      console.error('Repayment submission failed', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to record repayment. Please try again.';
      this.toastService.error({ message });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async onRepaymentCancelled(): Promise<void> {
    const member = this.selectedMember();
    const loan = this.selectedLoan();
    if (!member || !loan) return;
    await this.refreshSelectedLoanDetails(member.id, loan.id);
    this.loanDropdownComponent()?.refreshLoans();
    this.memberSummaryComponent()?.refreshFinancialSummary();
  }

  private formatCurrency(amount: number): string {
    return this.utilService.formatCurrency(amount);
  }

  private async refreshSelectedLoanDetails(memberId: string, loanId: string): Promise<void> {
    try {
      const response = await this.loanService.getMemberLoans({
        page: 1,
        pageSize: 20,
        memberId,
        includeCancelled: false,
      });
      const refreshed = response.data.find(item => item.id === loanId) ?? null;
      this.selectedLoan.set(refreshed);
    } catch (error) {
      console.error('Unable to refresh loan after repayment', error);
    }
  }
}

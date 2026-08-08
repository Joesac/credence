import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { form, required, FormField, min } from '@angular/forms/signals';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';
import { MemberSummary } from '../../members/components/member-summary/member-summary';
import { Member } from '@interfaces/member.interface';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { Dropdown } from '@shared/components/dropdown/dropdown';
import { UtilsService } from '@shared/services/utils-service';
import { DisableCoverComponent } from '@shared/components/disable-cover-component/disable-cover-component';
import { ToastService } from '@core/components/toast/service/toast-service';
import { AuthService } from '../../../auth/services/auth-service';
import { LoanService } from '../service/loan-service';
import { LoanPayload } from '@interfaces/loan.interface';

interface LoanIssueData {
  issueDate: Date;
  amount: number | null;
  interestRate: number | null;
  repaymentFrequency: string;
  dueDate: string | Date | null;
  notes: string;
}

@Component({
  selector: 'app-issue',
  imports: [
    Dropdown, 
    MemberSelectionDropdown, 
    MemberSummary, 
    FormField, 
    Inputfield,
    MatDatepickerModule,
    MatInputModule,
    MatButtonModule,
    DisableCoverComponent
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './issue.html',
  styleUrl: './issue.scss',
  host: { 'class': 'w-full flex justify-center' }
})
export class Issue {
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly loanService = inject(LoanService);
  private readonly utilsService = inject(UtilsService);

  private readonly memberSummaryComponent = viewChild(MemberSummary);

  protected readonly REPAYMENT_FREQUENCIES = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' }
  ];

  protected readonly selectedMember = signal<Member | null>(null);
  protected readonly isSubmitting = signal(false);

  // Due date must be at least one day after the selected issue date
  protected readonly minDate = computed(() => this.addOneDay(this.loanIssueModel().issueDate));

  // Prevent issue date from being in the future
  protected maxDate: Date = new Date();

  private readonly INITIAL_DATA: LoanIssueData = {
    issueDate: new Date(),
    amount: null,
    interestRate: null,
    repaymentFrequency: 'weekly',
    dueDate: null,
    notes: '',
  };

  protected readonly loanIssueModel = signal<LoanIssueData>(this.INITIAL_DATA);
  protected loanIssueForm = form(this.loanIssueModel, (path) => {
    required(path.issueDate, {
      message: 'Issue date is required'
    });

    required(path.amount, {
      message: 'Amount is required'
    });
    min(path.amount, 1, { message: 'Minimum amount is 1' });

    required(path.interestRate, {
      message: 'Interest Rate is required'
    });
    min(path.interestRate, 1, { message: 'Minimum interest rate is 1' });

    required(path.repaymentFrequency, { message: 'Repayment frequency is required' });

    required(path.dueDate, { message: 'Due date is required' });
  });

  protected onSelectMember(member: Member | null) {
    this.selectedMember.set(member);
    this.resetForm();
  }

  protected async onSubmit(event: Event) {
    event.preventDefault();
    if (this.loanIssueForm().invalid()) {
      this.toastService.error({ message: 'Please complete all required fields.' });
      return;
    }

    const member = this.selectedMember();
    if (!member) {
      this.toastService.error({ message: 'Select a member before issuing a loan.' });
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    let issuerId: string;
    try {
      const activeUser = await this.authService.getActiveUser();
      issuerId = activeUser.id;
    } catch (error) {
      await this.authService.handleAuthError(error, this.toastService);
      return;
    }

    const { issueDate, amount, interestRate, repaymentFrequency, dueDate, notes } = this.loanIssueForm().value();
    const normalizedDueDate = this.utilsService.normalizeDueDate(dueDate);
    
    if (!normalizedDueDate) {
      this.toastService.error({ message: 'Please choose a valid due date.' });
      return;
    }

    const payload: LoanPayload = {
      memberId: member.id,
      issuerId,
      amount: Number(amount),
      interestRate: Number(interestRate),
      repaymentFrequency,
      dueDate: normalizedDueDate,
      notes: notes?.trim() ? notes.trim() : null,
      date: (issueDate as Date).toLocaleDateString('en-CA'),
    };

    this.isSubmitting.set(true);
    try {
      await this.loanService.addLoan(payload);
      this.toastService.success({ message: 'Loan issued successfully.' });
      this.resetForm();
      this.memberSummaryComponent()?.refreshFinancialSummary();
    } catch (error) {
      const ipcError = this.loanService.extractIpcError(error);
      const message = (ipcError.message as string) || 'Unable to issue loan. Please try again.';

      let header = '';
      if (ipcError.code === 'HAS_EXISTING_LOAN') {
        header = "Cannot Issue Loan";
      }
      this.toastService.error({ message, header });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private resetForm() {
    this.loanIssueForm().reset({ ...this.INITIAL_DATA });
  }

  private addOneDay(date: Date): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return next;
  }
}

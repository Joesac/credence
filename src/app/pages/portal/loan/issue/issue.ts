import { Component, signal } from '@angular/core';
import { form, required, FormField, min } from '@angular/forms/signals';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';
import { UserDetails } from '../../members/components/user-details/user-details';
import { Member } from '@interfaces/member.interface';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { Dropdown } from '@shared/components/dropdown/dropdown';

interface LoanIssueData {
  amount: number | null;
  interestRate: number | null;
  repaymentFrequency: string;
  dueDate: string;
  notes: string;
}

@Component({
  selector: 'app-issue',
  imports: [
    Dropdown, 
    MemberSelectionDropdown, 
    UserDetails, 
    FormField, 
    Inputfield,
    MatDatepickerModule,
    MatInputModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './issue.html',
  styleUrl: './issue.scss',
})
export class Issue {

  protected readonly REPAYMENT_FREQUENCIES = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Montly', value: 'montly' }
  ];

  protected readonly INTEREST_RATES = [
    { label: '10', value: 'weekly' },
    { label: 'Montly', value: 'montly' }
  ];

  protected readonly selectedMember = signal<Member | null>(null);

  private INITIAL_DATA = <LoanIssueData>({
    amount: null,
    interestRate: null,
    repaymentFrequency: 'weekly',
    dueDate: '',
    notes: ''
  });
  
  protected readonly LoanIssueModel = signal<LoanIssueData>(this.INITIAL_DATA);
  protected loanIssueForm = form(this.LoanIssueModel, (path) => {
    required(path.amount, {
      message: 'Amount is required'
    });
    min(path.amount, 1, { message: 'Minimum amount is 1' });

    required(path.interestRate, {
      message: 'Interest Rate is required'
    });
    min(path.amount, 1, { message: 'Minimum amount is 1' });

    required(path.repaymentFrequency, { message: 'Repayment frequency is required' });

    // @Todo: Change this to a date picker;
    required(path.dueDate, { message: 'Due date is required' });
  });

  protected onSelectMember(member: Member | null) {
    console.log(member);
    this.selectedMember.set(member);
  }

  protected onSubmit(event: Event) {
    event.preventDefault();
    if (this.loanIssueForm().invalid()) return;
    console.log('Model payload', this.loanIssueForm().value());
    this.loanIssueForm().reset({ ...this.INITIAL_DATA });
  }
}

import { Component, signal, computed } from '@angular/core';
import { required, form, FormField, min } from '@angular/forms/signals';
import { UserDetails } from '../../members/components/user-details/user-details';
import { Member } from '@interfaces/member.interface';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';
import { LoanDetails, LoanDetailsData } from '../components/loan-details/loan-details';

interface repaymentData {
  amount: number | null;
  notes: string;
}

@Component({
  selector: 'app-repayment',
   imports: [
    FormField, 
    UserDetails, 
    Inputfield, 
    MemberSelectionDropdown,
    LoanDetails
  ],
  templateUrl: './repayment.html',
  styleUrl: './repayment.scss',
  host: { 'class': 'w-full flex justify-center' }
})
export class Repayment {
  protected readonly selectedMember = signal<Member | null>(null);
  
  protected readonly loanDetails = signal<LoanDetailsData>({ 
    amountLoaned: 570, 
    rate: 15, 
    dueDate: '2026-07-03T14:42:00Z', 
    amountPaid: 200 
  });

  private INITIAL_DATA = <repaymentData>({
    amount: null,
    notes: ''
  })
  protected readonly repaymentModel = signal<repaymentData>(this.INITIAL_DATA);
  protected repaymentForm = form(this.repaymentModel, (path) => {
    required(path.amount, {
      message: 'Amount is required'
    });
    min(path.amount, 1, { message: 'Minimum amount is 1' });
  });

  protected onSelectMember(member: Member | null) {
    console.log(member);
    this.selectedMember.set(member);
  }

  protected onSubmit(event: Event) {
    event.preventDefault();
    if (this.repaymentForm().invalid()) return;
    console.log('Model payload', this.repaymentForm().value());
    this.repaymentForm().reset({ ...this.INITIAL_DATA });
  }
}

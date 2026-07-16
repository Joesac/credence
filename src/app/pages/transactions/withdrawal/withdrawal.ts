import { Component, signal, computed } from '@angular/core';
import { required, form, FormField, min } from '@angular/forms/signals';
import { UserDetails } from '../../members/components/user-details/user-details';
import { Member } from '../../../interfaces/user.interface';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';

interface withdrawalData {
  amount: number | null;
  notes: string;
}

@Component({
  selector: 'app-withdrawal',
  imports: [
    FormField, 
    UserDetails, 
    Inputfield, 
    MemberSelectionDropdown
  ],
  templateUrl: './withdrawal.html',
  styleUrl: './withdrawal.scss',
  host: { 'class': 'w-full flex justify-center' }
})
export class Withdrawal {
  protected readonly selectedMember = signal<Member | null>(null);

  private INITIAL_DATA = <withdrawalData>({
    amount: null,
    notes: ''
  })
  protected readonly withdrawalModel = signal<withdrawalData>(this.INITIAL_DATA);
  protected withdrawalForm = form(this.withdrawalModel, (path) => {
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
    if (this.withdrawalForm().invalid()) return;
    console.log('Model payload', this.withdrawalForm().value());
    this.withdrawalForm().reset({ ...this.INITIAL_DATA });
  }
}

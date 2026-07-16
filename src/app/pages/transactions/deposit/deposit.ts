import { Component, signal, computed } from '@angular/core';
import { required, form, FormField, min } from '@angular/forms/signals';
import { Dropdown } from '@shared/components/dropdown/dropdown';
import { UserDetails } from '../../members/components/user-details/user-details';
import { Member } from '../../../interfaces/user.interface';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';

interface DepositData {
  depositType: string;
  paymentMethod: string;
  amount: number | null;
}

@Component({
  selector: 'app-deposit',
  imports: [Dropdown, FormField, UserDetails, Inputfield, MemberSelectionDropdown],
  templateUrl: './deposit.html',
  styleUrl: './deposit.scss',
  host: { 'class': 'w-full flex justify-center' }
})
export class Deposit {
  protected readonly selectedMember = signal<Member | null>(null);

  protected readonly DEPOSIT_TYPES = [
    { label: "Savings", value: 'savings'  },
    { label: "Loan Repayment", value: 'loan_repayment'  }
  ];

  protected readonly PAYMENT_METHODS = [
    { label: "Cash", value: "cash"  },
    { label: "Mobile Money", value: "mobile_money"  }
  ];

  private INITIAL_DATA = <DepositData>({
    depositType: '',
    paymentMethod: '',
    amount: null
  })
  protected readonly depositModel = signal<DepositData>(this.INITIAL_DATA);
  protected depositForm = form(this.depositModel, (path) => {
    required(path.depositType, {
      message: 'Deposit Type is required'
    });

    required(path.paymentMethod, {
      message: 'Payment Method is required'
    });

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
    if (this.depositForm().invalid()) return;
    console.log('Deposit payload', this.depositForm().value());
    this.depositForm().reset({ ...this.INITIAL_DATA });
  }
}

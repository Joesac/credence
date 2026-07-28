import { Component, inject, signal, viewChild } from '@angular/core';
import { required, form, FormField, min } from '@angular/forms/signals';
import { Dropdown } from '@shared/components/dropdown/dropdown';
import { UserDetails } from '../../members/components/user-details/user-details';
import { Member } from '../../../../interfaces/member.interface';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';
import { ToastService } from '@core/components/toast/service/toast-service';
import { AuthService } from '../../../auth/services/auth-service';
import { DepositService } from './service/deposit-service';
import { DepositPaymentMethod } from '@interfaces/deposit.interface';

interface DepositData {
  paymentMethod: string;
  amount: number | null;
  refreshmentToken: number | null;
  notes: string;
}

@Component({
  selector: 'app-deposit',
  imports: [Dropdown, FormField, UserDetails, Inputfield, MemberSelectionDropdown],
  templateUrl: './deposit.html',
  styleUrl: './deposit.scss',
  host: { 'class': 'w-full flex justify-center' }
})
export class Deposit {
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly depositService = inject(DepositService);

  private readonly userDetailsComponent = viewChild(UserDetails);

  protected readonly selectedMember = signal<Member | null>(null);
  protected readonly isSubmitting = signal(false);

  protected readonly PAYMENT_METHODS = [
    { label: "Cash", value: "cash"  },
    { label: "Mobile Money", value: "momo"  }
  ];

  private INITIAL_DATA = <DepositData>({
    paymentMethod: '',
    amount: null,
    refreshmentToken: null,
    notes: '',
  })
  protected readonly depositModel = signal<DepositData>(this.INITIAL_DATA);
  protected depositForm = form(this.depositModel, (path) => {
    required(path.paymentMethod, {
      message: 'Payment Method is required'
    });

    required(path.amount, {
      message: 'Amount is required'
    });
    min(path.amount, 1, { message: 'Minimum amount is 1' });
    required(path.refreshmentToken, {
      message: 'Refreshment token is required'
    });
  });

  protected onSelectMember(member: Member | null) {
    this.selectedMember.set(member);
  }

  protected async onSubmit(event: Event) {
    event.preventDefault();

    if (this.depositForm().invalid()) {
      this.toastService.error({ message: 'Please complete all required fields.' });
      return;
    }

    const member = this.selectedMember();
    if (!member) {
      this.toastService.error({ message: 'Select a member before recording a deposit.' });
      return;
    }

    if (this.isSubmitting()) {
      return;
    }

    let receivedBy: string;
    try {
      const activeUser = await this.authService.getActiveUser();
      receivedBy = activeUser.id;
    } catch (error) {
      await this.authService.handleAuthError(error, this.toastService);
      return;
    }

    const { paymentMethod, amount, refreshmentToken, notes } = this.depositForm().value();
    const payload = {
      memberId: member.id,
      receivedBy,
      paymentMethod: paymentMethod as DepositPaymentMethod,
      amount: Number(amount),
      refreshmentToken: Number(refreshmentToken),
      notes: notes?.trim() ? notes.trim() : null,
    };

    this.isSubmitting.set(true);
    try {
      await this.depositService.addDeposit(payload);
      this.toastService.success({ message: 'Deposit recorded successfully.' });
      this.depositForm().reset({ ...this.INITIAL_DATA });
      this.userDetailsComponent()?.refreshFinancialSummary();
    } catch (error) {
      console.error('Deposit submission failed', error);
      this.toastService.error({ message: 'Unable to record deposit. Please try again.' });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

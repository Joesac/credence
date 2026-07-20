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
  });

  protected onSelectMember(member: Member | null) {
    this.selectedMember.set(member);
  }

  protected async onSubmit(event: Event) {
    event.preventDefault();

    if (this.depositForm().invalid()) {
      this.toastService.error('Please complete all required fields.');
      return;
    }

    const member = this.selectedMember();
    if (!member) {
      this.toastService.error('Select a member before recording a deposit.');
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
      console.error('Unable to verify active session', error);
      const message = error instanceof Error ? error.message : '';
      if (message === 'NOT_AUTHENTICATED' || message === 'SESSION_EXPIRED') {
        await this.authService.logout();
        this.toastService.error('Session expired. Please log in again.');
      } else {
        this.toastService.error('Unable to verify your session. Please try again.');
      }
      return;
    }

    const { paymentMethod, amount, notes } = this.depositForm().value();
    const payload = {
      memberId: member.id,
      receivedBy,
      paymentMethod: paymentMethod as DepositPaymentMethod,
      amount: Number(amount),
      notes: notes?.trim() ? notes.trim() : null,
    };

    this.isSubmitting.set(true);
    try {
      await this.depositService.addDeposit(payload);
      this.toastService.success('Deposit recorded successfully.');
      this.depositForm().reset({ ...this.INITIAL_DATA });
      this.userDetailsComponent()?.refreshFinancialSummary();
    } catch (error) {
      console.error('Deposit submission failed', error);
      this.toastService.error('Unable to record deposit. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

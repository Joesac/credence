import { Component, inject, signal, viewChild } from '@angular/core';
import { required, form, FormField, min } from '@angular/forms/signals';
import { UserDetails } from '../../members/components/user-details/user-details';
import { Member } from '@interfaces/member.interface';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';
import { ToastService } from '@core/components/toast/service/toast-service';
import { AuthService } from '../../../auth/services/auth-service';
import { WithdrawalService } from './service/withdrawal-service';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';

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
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly ipcBridgeService = inject(IpcBridgeService);
  private readonly userDetailsComponent = viewChild(UserDetails);

  protected readonly selectedMember = signal<Member | null>(null);
  protected readonly isSubmitting = signal(false);

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
    this.selectedMember.set(member);
  }

  protected async onSubmit(event: Event) {
    event.preventDefault();

    if (this.withdrawalForm().invalid()) {
      this.toastService.error('Please enter a valid withdrawal amount.');
      return;
    }

    const member = this.selectedMember();
    if (!member) {
      this.toastService.error('Select a member before recording a withdrawal.');
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

    const { amount, notes } = this.withdrawalForm().value();
    const payload = {
      memberId: member.id,
      issuerId,
      amount: Number(amount),
      notes: notes?.trim() ? notes.trim() : null,
    };

    this.isSubmitting.set(true);
    try {
      await this.withdrawalService.addWithdrawal(payload);
      this.toastService.success('Withdrawal recorded successfully.');
      this.withdrawalForm().reset({ ...this.INITIAL_DATA });
      this.userDetailsComponent()?.refreshFinancialSummary();
    } catch (error) {
      const ipcErrorObj = this.ipcBridgeService.extractIpcError(error);
      
      this.toastService.error((ipcErrorObj.message || '') as string);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

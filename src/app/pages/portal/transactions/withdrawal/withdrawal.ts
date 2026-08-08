import { Component, inject, signal, viewChild } from '@angular/core';
import { required, form, FormField, min } from '@angular/forms/signals';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MemberSummary } from '../../members/components/member-summary/member-summary';
import { Member } from '@interfaces/member.interface';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';
import { DisableCoverComponent } from '@shared/components/disable-cover-component/disable-cover-component';
import { ToastService } from '@core/components/toast/service/toast-service';
import { AuthService } from '../../../auth/services/auth-service';
import { WithdrawalService } from './service/withdrawal-service';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';

interface withdrawalData {
  date: Date;
  amount: number | null;
  notes: string;
}

@Component({
  selector: 'app-withdrawal',
  imports: [
    FormField, 
    MemberSummary, 
    Inputfield, 
    MemberSelectionDropdown,
    DisableCoverComponent,
    MatDatepickerModule,
    MatInputModule,
    MatButtonModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './withdrawal.html',
  styleUrl: './withdrawal.scss',
  host: { 'class': 'w-full flex justify-center' }
})
export class Withdrawal {
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly withdrawalService = inject(WithdrawalService);
  private readonly ipcBridgeService = inject(IpcBridgeService);
  private readonly memberSummaryComponent = viewChild(MemberSummary);

  protected readonly selectedMember = signal<Member | null>(null);
  protected readonly isSubmitting = signal(false);

  protected readonly maxDate: Date = new Date();

  private INITIAL_DATA = <withdrawalData>({
    date: new Date(),
    amount: null,
    notes: ''
  })
  protected readonly withdrawalModel = signal<withdrawalData>(this.INITIAL_DATA);
  protected withdrawalForm = form(this.withdrawalModel, (path) => {
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
  }

  protected async onSubmit(event: Event) {
    event.preventDefault();

    if (this.withdrawalForm().invalid()) {
      this.toastService.error({ message: 'Please enter a valid withdrawal amount.' });
      return;
    }

    const member = this.selectedMember();
    if (!member) {
      this.toastService.error({ message: 'Select a member before recording a withdrawal.' });
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

    const { date, amount, notes } = this.withdrawalForm().value();
    const payload = {
      memberId: member.id,
      issuerId,
      amount: Number(amount),
      notes: notes?.trim() ? notes.trim() : null,
      date: (date as Date).toLocaleDateString('en-CA'),
    };

    this.isSubmitting.set(true);
    try {
      await this.withdrawalService.addWithdrawal(payload);
      this.toastService.success({ message: 'Withdrawal recorded successfully.' });
      this.withdrawalForm().reset({ ...this.INITIAL_DATA });
      this.memberSummaryComponent()?.refreshFinancialSummary();
    } catch (error) {
      const ipcErrorObj = this.ipcBridgeService.extractIpcError(error);
      
      this.toastService.error({ message: (ipcErrorObj.message || '') as string });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

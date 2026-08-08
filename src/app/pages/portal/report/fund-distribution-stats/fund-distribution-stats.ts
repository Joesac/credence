import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog-component/confirm-dialog-component';
import { Member } from '@interfaces/member.interface';
import {
  FundDistributionSummary,
  GlobalFundDistributionStats,
} from '@interfaces/fund-distribution.interface';
import { UtilsService } from '@shared/services/utils-service';
import { ToastService } from '@core/components/toast/service/toast-service';
import { AuthService } from '../../../auth/services/auth-service';
import { FundDistributionService } from './service/fund-distribution-service';

@Component({
  selector: 'app-fund-distribution-stats',
  imports: [
    MemberSelectionDropdown,
    MatButtonModule,
    MatDialogModule,
    DecimalPipe,
  ],
  templateUrl: './fund-distribution-stats.html',
  styleUrl: './fund-distribution-stats.scss',
  host: { 'class': 'w-full flex justify-center' }
})
export class FundDistributionStats {
  private readonly fundDistributionService = inject(FundDistributionService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly utilsService = inject(UtilsService);
  private readonly dialog = inject(MatDialog);

  protected readonly selectedMember = signal<Member | null>(null);
  protected readonly memberStats = signal<FundDistributionSummary | null>(null);
  protected readonly globalStats = signal<GlobalFundDistributionStats | null>(null);
  protected readonly isLoadingMemberStats = signal(false);
  protected readonly isSubmitting = signal(false);

  constructor() {
    void this.loadGlobalStats();
  }

  protected onSelectMember(member: Member | null): void {
    this.selectedMember.set(member);
    this.memberStats.set(null);
    if (member) {
      void this.loadMemberStats(member.id);
    }
  }

  protected onReceiveMoney(): void {
    const member = this.selectedMember();
    const stats = this.memberStats();
    if (!member || !stats || stats.hasReceived) {
      return;
    }

    this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Fund Distribution',
        message: `Confirm giving ${this.utilsService.formatCurrency(stats.amountToReceive)} to ${member.fullname}. This cannot be undone.`,
        onConfirm: async () => this.recordPayout(member.id, stats.amountToReceive),
      },
    });
  }

  private async loadGlobalStats(): Promise<void> {
    try {
      const stats = await this.fundDistributionService.getGlobalStats();
      this.globalStats.set(stats);
    } catch (error) {
      this.toastService.error({ message: 'Unable to load global fund distribution stats.' });
    }
  }

  private async loadMemberStats(memberId: string): Promise<void> {
    this.isLoadingMemberStats.set(true);
    try {
      const stats = await this.fundDistributionService.getMemberStats(memberId);
      this.memberStats.set(stats);
    } catch (error) {
      this.toastService.error({ message: 'Unable to load member fund distribution stats.' });
    } finally {
      this.isLoadingMemberStats.set(false);
    }
  }

  private async recordPayout(memberId: string, amount: number): Promise<void> {
    this.isSubmitting.set(true);
    try {
      const activeUser = await this.authService.getActiveUser();
      await this.fundDistributionService.createFundDistribution({
        memberId,
        giverId: activeUser.id,
        amount,
      });
      this.toastService.success({ message: 'Fund distribution recorded successfully.' });
      await this.loadMemberStats(memberId);
    } catch (error) {
      const ipcError = this.fundDistributionService.extractIpcError(error);
      this.toastService.error({ message: (ipcError.message || 'Unable to record distribution.') as string });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

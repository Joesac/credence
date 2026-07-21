import { DecimalPipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { Member, MemberFinancialSummary } from '@interfaces/member.interface';
import { MemberService } from '../../service/member-service';
import { ToastService } from '@core/components/toast/service/toast-service';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './user-details.html',
  styleUrl: './user-details.scss',
  host: { 'class': 'w-full' }
})
export class UserDetails {
  readonly user = input.required<Member>();
  readonly showFinancialStatus = input<boolean>(false);

  private readonly memberService = inject(MemberService);
  private readonly toastService = inject(ToastService);
  private readonly ipcBridgeService = inject(IpcBridgeService);

  protected readonly financialSummary = signal<MemberFinancialSummary | null>(null);
  protected readonly isFinancialSummaryLoading = signal(false);
  private currentRequestId = 0;

  constructor() {
    effect(() => {
      const member = this.user();
      const shouldShow = this.showFinancialStatus();
      
      if (!member || !shouldShow) {
        this.financialSummary.set(null);
        this.isFinancialSummaryLoading.set(false);
        return;
      }

      void this.loadFinancialSummary(member.id);
    });
  }

  refreshFinancialSummary(): void {
    const member = this.user();
    if (!member || !this.showFinancialStatus()) return;
    void this.loadFinancialSummary(member.id);
  }

  private async loadFinancialSummary(memberId: string): Promise<void> {
    const requestId = ++this.currentRequestId;
    this.isFinancialSummaryLoading.set(true);

    try {
      const summary = await this.memberService.getMemberFinancialSummary(memberId);
      if (requestId !== this.currentRequestId) {
        return;
      }
      this.financialSummary.set(summary);
    } catch (error) {
      const ipcErrorObj = this.ipcBridgeService.extractIpcError(error);
            
      this.toastService.error({ message: (ipcErrorObj.message || '') as string });

      if (requestId !== this.currentRequestId) {
        return;
      }
      
      this.financialSummary.set(null);
    } finally {
      if (requestId === this.currentRequestId) {
        this.isFinancialSummaryLoading.set(false);
      }
    }
  }
}

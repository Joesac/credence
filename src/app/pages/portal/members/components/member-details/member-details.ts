import { DecimalPipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { Member, MemberFinancialSummary } from '@interfaces/member.interface';
import { MemberService } from '../../service/member-service';
import { ToastService } from '@core/components/toast/service/toast-service';
import { UtilsService } from '@shared/services/utils-service';

@Component({
  selector: 'app-member-details',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './member-details.html',
  styleUrl: './member-details.scss',
  host: { 'class': 'block w-full' }
})
export class MemberDetails {
  readonly member = input.required<Member>();

  private readonly memberService = inject(MemberService);
  private readonly toastService = inject(ToastService);
  private readonly utilsService = inject(UtilsService);

  protected readonly financialSummary = signal<MemberFinancialSummary | null>(null);
  protected readonly isFinancialSummaryLoading = signal(false);
  private currentRequestId = 0;

  constructor() {
    effect(() => {
      const m = this.member();
      void this.loadFinancialSummary(m.id);
    });
  }

  protected formatDate(dateStr: string): string {
    return `${this.utilsService.dateFormatter(dateStr)} ${this.utilsService.timeFormatter(dateStr).toUpperCase()}`;
  }

  private async loadFinancialSummary(memberId: string): Promise<void> {
    const requestId = ++this.currentRequestId;
    this.isFinancialSummaryLoading.set(true);

    try {
      const summary = await this.memberService.getMemberFinancialSummary(memberId);
      if (requestId !== this.currentRequestId) return;
      this.financialSummary.set(summary);
    } catch (error) {
      if (requestId !== this.currentRequestId) return;
      this.toastService.error({ message: 'Could not load financial summary.' });
      this.financialSummary.set(null);
    } finally {
      if (requestId === this.currentRequestId) {
        this.isFinancialSummaryLoading.set(false);
      }
    }
  }
}

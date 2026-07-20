import { Component, signal, computed, inject } from '@angular/core';
import { UserDetails } from '../../members/components/user-details/user-details';
import { Member } from '@interfaces/member.interface';
import { DataTable, ColumnDef } from '@shared/components/data-table/data-table';
import { MemberSelectionDropdown } from '@shared/components/member-selection-dropdown/member-selection-dropdown';
import { Utils } from '@shared/services/utils';

type HistoryTransaction = {
  id: string;
  memberId: string;
  type: 'Deposit' | 'Withdrawal';
  amount: number;
  occurredAt: string;
};

@Component({
  selector: 'app-history',
  imports: [UserDetails, DataTable, MemberSelectionDropdown],
  templateUrl: './history.html',
  styleUrl: './history.scss',
  host: { 'class': 'w-full flex' }
})
export class History {
  private readonly utilsService = inject(Utils);
  
  protected readonly selectedMember = signal<Member | null>(null);
  protected readonly isLoadingHistory = signal<boolean>(false);

  private readonly transactions = signal<HistoryTransaction[]>([
    { id: 'TX-9081', memberId: '1', type: 'Deposit', amount: 250.5, occurredAt: '2026-07-01T09:15:00Z' },
    { id: 'TX-9082', memberId: '1', type: 'Withdrawal', amount: 120, occurredAt: '2026-07-03T14:42:00Z' },
    { id: 'TX-9083', memberId: '2', type: 'Deposit', amount: 600, occurredAt: '2026-07-02T11:05:00Z' },
    { id: 'TX-9084', memberId: '1', type: 'Deposit', amount: 75.25, occurredAt: '2026-07-05T08:20:00Z' },
    { id: 'TX-9085', memberId: '2', type: 'Withdrawal', amount: 90, occurredAt: '2026-07-06T16:55:00Z' }
  ]);

  protected readonly transactionColumns: ColumnDef<HistoryTransaction>[] = [
    {
      key: 'occurredAt',
      header: 'Date & Time',
      formatter: (row) => {
        return {
          primary: this.utilsService.dateFormatter(row.occurredAt),
          secondary: this.utilsService.timeFormatter(row.occurredAt).toUpperCase()
        };
      }
    },
    { key: 'id', header: 'Transaction ID' },
    { key: 'type', header: 'Type' },
    {
      key: 'amount',
      header: 'Amount',
      formatter: (row) => this.utilsService.currencyFormatter.format(row.amount)
    }
  ];

  protected readonly transactionRows = computed<HistoryTransaction[]>(() => {
    const memberId = this.selectedMember()?.id;
    if (!memberId) {
      return [];
    }

    return this.transactions().filter((tx) => tx.memberId === memberId);
  });

  protected readonly tableEmptyMessage = computed(() => {
    if (!this.selectedMember()) {
      return 'Select a member to view transaction history.';
    }
    return 'No transaction history';
  });

  protected onSelectMember(member: Member | null) {
    console.log(member);
    this.selectedMember.set(member);
  }
}

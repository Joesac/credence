import { Component, effect, inject, signal, debounced, OnInit, untracked } from '@angular/core';
import { DataTable, ColumnDef } from '@shared/components/data-table/data-table';
import { DataTableCellDirective } from "@shared/components/data-table/directive/data-table-cell-directive";
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { Member } from '@interfaces/member.interface';
import { MemberService } from '../service/member-service';
import { ToastService } from '@core/components/toast/service/toast-service';
import { ActionsButtonComponent, ActionButtonOption } from '@shared/components/actions-button/actions-button.component';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [
    DataTable,
    DataTableCellDirective,
    Inputfield,
    ActionsButtonComponent
  ],
  templateUrl: './directory.html',
  styleUrl: './directory.scss',
})
export class Directory implements OnInit {
  private readonly memberService = inject(MemberService);
  private readonly toastService = inject(ToastService);
  private requestId = 0;

  protected readonly members = signal<Member[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal<number>(1);
  protected readonly pageSize = signal<number>(10);
  protected readonly totalRecords = signal<number>(0);

  protected readonly searchQuery = signal<string | null>('');
  protected readonly debouncedQuery = debounced(this.searchQuery, 300);

  protected readonly tableConfig: ColumnDef<Member | { action: string }>[] = [
    { key: 'fullname', header: 'Name' },
    { key: 'account_number', header: 'Acc Number' },
    { key: 'telephoneNumber', header: 'Tel Number' },
    { key: 'location', header: 'Location' },
    { key: 'date_created', header: 'Date Created' },
    { key: 'date_updated', header: 'Date Updated' },
    { key: 'action', header: '' },
  ];

  protected readonly actionOptions: ActionButtonOption[] = [
    { id: 'contribution', label: 'Make Contribution' },
    { id: 'loan', label: 'Pay Loan' },
    { id: 'Disable', label: 'Disable' },
  ];

  constructor() {
    effect(() => {
      this.debouncedQuery.value();
      if (untracked(this.currentPage) !== 1) {
        this.currentPage.set(1);
      }
    });

    let initialized = false;
    effect(() => {
      const page = this.currentPage();
      const pageSize = this.pageSize();
      const search = this.debouncedQuery.value()?.trim() ?? '';
      if (!initialized) {
        initialized = true;
        return;
      }
      void this.loadMembers(page, pageSize, search);
    });
  }

  ngOnInit(): void {
    const search = this.debouncedQuery.value()?.trim() ?? '';
    void this.loadMembers(this.currentPage(), this.pageSize(), search);
  }

  private async loadMembers(page: number, pageSize: number, search?: string): Promise<void> {
    const requestId = ++this.requestId;
    this.isLoading.set(true);

    try {
      const response = await this.memberService.getMembers({
        page,
        pageSize,
        search: search || undefined,
      });

      if (requestId !== this.requestId) {
        return;
      }

      this.members.set(response.data);
      this.totalRecords.set(response.pagination.totalRecords);
      this.currentPage.set(response.pagination.page);
      this.pageSize.set(response.pagination.pageSize);
    } catch (error) {
      if (requestId !== this.requestId) {
        return;
      }
      console.error('Failed to load members directory page', error);
      this.toastService.error('Couldn\'t fetch members', {
        label: 'Retry',
        callback: () => {
          this.loadMembers(this.currentPage(), this.pageSize(), this.debouncedQuery.value()?.trim() ?? '');
        }
      });
      this.members.set([]);
      this.totalRecords.set(0);
    } finally {
      if (requestId === this.requestId) {
        this.isLoading.set(false);
      }
    }
  }

  protected handleActionSelection(option: ActionButtonOption, member: Member): void {
    switch (option.id) {
      case 'contribution':
        // TODO: wire to contribution flow
        this.toastService.success(`Ready to contribute for ${member.fullname}`);
        break;
      case 'loan':
        // TODO: wire to loan payment flow
        this.toastService.success(`Ready to record loan payment for ${member.fullname}`);
        break;
      default:
        break;
    }
  }
}

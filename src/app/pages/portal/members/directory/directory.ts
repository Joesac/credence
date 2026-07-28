import { Component, effect, inject, signal, debounced, OnInit, untracked } from '@angular/core';
import { DataTable, ColumnDef } from '@shared/components/data-table/data-table';
import { DataTableCellDirective } from "@shared/components/data-table/directive/data-table-cell-directive";
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { Member } from '@interfaces/member.interface';
import { MemberService } from '../service/member-service';
import { ToastService } from '@core/components/toast/service/toast-service';
import { ActionsButtonComponent, ActionButtonOption } from '@shared/components/actions-button/actions-button.component';
import { UtilsService } from '@shared/services/utils-service';

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
  private readonly utilsService = inject(UtilsService);
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
    { 
      key: 'date_created', 
      header: 'Date Created',
      formatter: (row) => {
        const member = row as Member;
        return `${this.utilsService.dateFormatter(member.date_created)} ${this.utilsService.timeFormatter(member.date_created).toUpperCase()}`;
      }
    },
    { 
      key: 'date_updated', 
      header: 'Date Updated',
      formatter: (row) => {
        const member = row as Member;
        return `${this.utilsService.dateFormatter(member.date_updated)} ${this.utilsService.timeFormatter(member.date_updated).toUpperCase()}`;
      }
    },
    { key: 'action', header: '' },
  ];

  protected getActionOptions(member: Member): ActionButtonOption[] {
    const options: ActionButtonOption[] = member.is_disabled
      ? [{ id: 'enable', label: 'Enable', icon: 'check_circle' }]
      : [{ id: 'disable', label: 'Disable', icon: 'block' }];

    options.push({ id: 'delete', label: 'Delete', icon: 'delete', disabled: !!member.is_deleted });
    return options;
  }

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
      this.toastService.error({
        message: 'Couldn\'t fetch members', action: {
          label: 'Retry',
          callback: () => {
            this.loadMembers(this.currentPage(), this.pageSize(), this.debouncedQuery.value()?.trim() ?? '');
          }
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

  protected async handleActionSelection(option: ActionButtonOption, member: Member): Promise<void> {
    if (option.disabled) {
      return;
    }

    switch (option.id) {
      case 'enable':
        await this.setMemberDisabled(member, false);
        break;
      case 'disable':
        await this.setMemberDisabled(member, true);
        break;
      case 'delete':
        await this.removeMember(member);
        break;
    }
  }

  private async setMemberDisabled(member: Member, disabled: boolean): Promise<void> {
    try {
      await this.memberService.updateMember(member.id, { isDisabled: disabled ? 1 : 0 });
      this.toastService.success({ message: `${member.fullname} ${disabled ? 'disabled' : 'enabled'}.` });
      this.refreshMembers();
    } catch (error) {
      console.error('Failed to toggle member disabled state', error);
      this.toastService.error({ message: `Could not ${disabled ? 'disable' : 'enable'} ${member.fullname}.` });
    }
  }

  private async removeMember(member: Member): Promise<void> {
    try {
      const result = await this.memberService.deleteMember(member.id);
      if (result.success) {
        this.toastService.success({ message: `${member.fullname} deleted.` });
      } else {
        this.toastService.error({ message: `${member.fullname} could not be deleted.` });
      }
      this.refreshMembers();
    } catch (error) {
      console.error('Failed to delete member', error);
      this.toastService.error({ message: `Could not delete ${member.fullname}.` });
    }
  }

  private refreshMembers(): void {
    const search = this.debouncedQuery.value()?.trim() ?? '';
    void this.loadMembers(this.currentPage(), this.pageSize(), search);
  }
}

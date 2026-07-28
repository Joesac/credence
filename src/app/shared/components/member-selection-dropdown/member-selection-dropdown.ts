import { Component, signal, computed, output, effect, inject, debounced } from '@angular/core';
import { Dropdown } from '@shared/components/dropdown/dropdown';
import { MemberService } from '../../../pages/portal/members/service/member-service';
import { Member } from '@interfaces/member.interface';

@Component({
  selector: 'app-member-selection-dropdown',
  imports: [Dropdown],
  templateUrl: './member-selection-dropdown.html',
  styleUrl: './member-selection-dropdown.scss',
  host: {
    'class': 'w-full'
  }
})
export class MemberSelectionDropdown {
  readonly onSelectMember = output<Member | null>();
  private readonly memberService = inject(MemberService);

  protected readonly searchQuery = signal<string>('');
  private readonly debouncedQuery = debounced(this.searchQuery, 500);
  protected readonly members = signal<Member[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly selectedMemberId = signal<string | null>(null);

  protected readonly membersToDisplayInDrop = computed(() =>
    this.members().map(member => ({
      label: member.fullname,
      value: member.id,
    }))
  );

  constructor() {
    effect(() => {
      const query = this.debouncedQuery.value().trim();
      void this.loadMembers(query);
    });

    void this.loadMembers('');
  }

  protected handleSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  protected onMemberSelect(memberId: string | null): void {
    if (!memberId) {
      this.selectedMemberId.set(null);
      this.onSelectMember.emit(null);
      return;
    }

    const member = this.members().find(m => m.id === memberId) ?? null;
    if (member) {
      this.selectedMemberId.set(member.id);
      this.searchQuery.set(member.fullname);
    }
    this.onSelectMember.emit(member);
  }

  private async loadMembers(search: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await this.memberService.getMembers({ page: 1, pageSize: 20, search });
      this.members.set(response.data);
    } catch (error) {
      console.error('Unable to fetch members', error);
      this.members.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}

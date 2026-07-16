import { Component, signal, computed, output, effect } from '@angular/core';
import { Dropdown } from '@shared/components/dropdown/dropdown';
import { Member } from '../../../interfaces/user.interface';

@Component({
  selector: 'app-member-selection-dropdown',
  imports: [Dropdown],
  templateUrl: './member-selection-dropdown.html',
  styleUrl: './member-selection-dropdown.scss',
})
export class MemberSelectionDropdown {
  readonly onSelectMember = output<Member | null>();

  protected readonly searchQuery = signal<string>('');
  
  // This should come from the API
  protected readonly members = <Member[]>([
    {
      id: '1',
      accountNumber: "tvc123",
      fullName: "Joseph Sackey Kontor",
      phoneNumber: '+233542462657',
      location: 'Tanoso',
      isActive: true
    },
    {
      id: '2',
      accountNumber: "tvc2",
      fullName: "Rachael Boateng",
      phoneNumber: '+233123454365',
      location: 'Bokankye Sene',
      isActive: false
    },
  ]);
  
  protected readonly membersToDisplayInDrop = this.members.map(member => ({
    label: member.fullName,
    value: member.id
  }));

  protected onMemberSelect(memberId: string | null) {
    const member = this.members.find((m: Member) => m.id === memberId);
    this.onSelectMember.emit(member || null);
  }
}

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DataTable, ColumnDef } from '@shared/components/data-table/data-table';
import { DataTableCellDirective } from '@shared/components/data-table/directive/data-table-cell-directive';
import { Member } from '@interfaces/member.interface';
import { MemberService } from '../../members/service/member-service';
import { CloudAdminService } from '@api/services/cloud-admin.service';
import { ToastService } from '@core/components/toast/service/toast-service';

interface GeneratedEntry {
  member: Member;
  password: string;
}

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

@Component({
  selector: 'app-mobile-passwords',
  standalone: true,
  imports: [DataTable, DataTableCellDirective],
  templateUrl: './mobile-passwords.html',
  styleUrl: './mobile-passwords.scss',
  host: { 'class': 'w-full flex justify-center' },
})
export class MobilePasswordsComponent implements OnInit {
  private readonly memberService = inject(MemberService);
  private readonly cloudAdminService = inject(CloudAdminService);
  private readonly toastService = inject(ToastService);

  protected readonly members = signal<Member[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly generatingIds = signal<Set<string>>(new Set());
  protected readonly isGenerating = computed(() => this.generatingIds().size > 0);
  protected readonly selectedIds = signal<Set<string>>(new Set());
  protected readonly generated = signal<Map<string, GeneratedEntry>>(new Map());
  protected readonly generatedList = computed(() => [...this.generated().values()]);

  protected readonly tableConfig: ColumnDef<Member>[] = [
    { key: 'select', header: 'Select' },
    { key: 'fullname', header: 'Full Name' },
    { key: 'account_number', header: 'Account Number' },
    { key: 'telephoneNumber', header: 'Telephone' },
    {
      key: 'has_password',
      header: 'Mobile Password',
      formatter: (row) => (row.has_password ? 'Set' : 'Not set'),
    },
    { key: 'action', header: 'Action' },
  ];

  ngOnInit(): void {
    void this.loadMembers();
  }

  private async loadMembers(): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await this.memberService.getMembers({ page: 1, pageSize: 10000 });
      this.members.set(response.data);
    } catch {
      this.toastService.error({ message: 'Failed to load members.' });
    } finally {
      this.isLoading.set(false);
    }
  }

  protected toggleSelection(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  protected selectAllMissing(): void {
    const missing = this.members()
      .filter((m) => !m.has_password)
      .map((m) => m.id);
    this.selectedIds.set(new Set(missing));
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  protected async generateForMember(member: Member): Promise<void> {
    const password = this.generatePassword();
    await this.generateForEntries([{ member, password }]);
  }

  protected async generateForSelected(): Promise<void> {
    const selected = this.members().filter((m) => this.selectedIds().has(m.id));
    if (!selected.length) {
      this.toastService.warning({ message: 'Select at least one member first.' });
      return;
    }
    const entries = selected.map((m) => ({ member: m, password: this.generatePassword() }));
    await this.generateForEntries(entries);
    this.clearSelection();
  }

  protected async generateForAllMissing(): Promise<void> {
    const missing = this.members().filter((m) => !m.has_password);
    if (!missing.length) {
      this.toastService.warning({ message: 'All members already have a mobile password.' });
      return;
    }
    const entries = missing.map((m) => ({ member: m, password: this.generatePassword() }));
    await this.generateForEntries(entries);
  }

  protected print(): void {
    if (!this.generated().size) {
      this.toastService.warning({ message: 'Generate passwords before printing.' });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      this.toastService.error({ message: 'Could not open print window. Please allow popups and try again.' });
      return;
    }

    const rows = this.generatedList()
      .map((entry) => `
        <tr>
          <td style="padding: 0.6rem 0.75rem; border-bottom: 1px solid #ccc;">${entry.member.account_number}</td>
          <td style="padding: 0.6rem 0.75rem; border-bottom: 1px solid #ccc;">${entry.member.fullname}</td>
          <td style="padding: 0.6rem 0.75rem; border-bottom: 1px solid #ccc; font-family: monospace; color: #16a34a; font-weight: 600; letter-spacing: 0.05em;">${entry.password}</td>
        </tr>
      `)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mobile Passwords</title>
          <style>
            @media print {
              body { margin: 0; padding: 1rem; font-family: system-ui, -apple-system, sans-serif; }
              table { width: 100%; border-collapse: collapse; }
              th { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 2px solid #16a34a; font-weight: 600; }
              td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #ccc; }
              .password { font-family: monospace; color: #16a34a; font-weight: 600; letter-spacing: 0.05em; }
              footer { margin-top: 1rem; font-size: 0.8rem; text-align: center; color: #666; }
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Name</th>
                <th>Temporary Password</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <footer>You will be asked to create your own password after first login.</footer>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 100);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  private async generateForEntries(entries: GeneratedEntry[]): Promise<void> {
    const ids = entries.map((e) => e.member.id);
    this.generatingIds.update((set) => {
      const next = new Set(set);
      for (const id of ids) next.add(id);
      return next;
    });
    try {
      await this.cloudAdminService.setMobilePasswords(
        entries.map((e) => ({ id: e.member.id, password: e.password }))
      );

      for (const entry of entries) {
        await this.memberService.updateMember(entry.member.id, { password: entry.password });
      }

      this.generated.update((map) => {
        const next = new Map(map);
        for (const entry of entries) {
          next.set(entry.member.id, entry);
        }
        return next;
      });

      this.members.update((list) =>
        list.map((m) => {
          const match = ids.includes(m.id);
          return match ? { ...m, has_password: 1 } : m;
        })
      );

      this.toastService.success({ message: `${entries.length} mobile password(s) generated.` });
    } catch {
      this.toastService.error({ message: 'Failed to generate mobile passwords.' });
    } finally {
      this.generatingIds.update((set) => {
        const next = new Set(set);
        for (const id of ids) next.delete(id);
        return next;
      });
    }
  }

  private generatePassword(length = 8): string {
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values)
      .map((v) => PASSWORD_CHARS[v % PASSWORD_CHARS.length])
      .join('');
  }
}

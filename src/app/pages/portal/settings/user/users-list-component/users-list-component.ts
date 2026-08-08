import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DataTable, ColumnDef } from '@shared/components/data-table/data-table';
import { DataTableCellDirective } from "@shared/components/data-table/directive/data-table-cell-directive";
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { User } from '@interfaces/user.interface';
import { AuthService } from '../../../../auth/services/auth-service';
import { ToastService } from '@core/components/toast/service/toast-service';
import { ActionsButtonComponent, ActionButtonOption } from '@shared/components/actions-button/actions-button.component';
import { UtilsService } from '@shared/services/utils-service';
import { AddUserDialogComponent } from '../add-user-dialog/add-user-dialog';

@Component({
  selector: 'app-users-list-component',
  imports: [
    DataTable,
    DataTableCellDirective,
    Inputfield,
    ActionsButtonComponent,
    MatDialogModule,
    MatButtonModule
  ],
  templateUrl: './users-list-component.html',
  styleUrl: './users-list-component.scss',
  host: { 'class': 'w-full flex justify-center' }
})
export class UsersListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly utilsService = inject(UtilsService);
  private readonly dialog = inject(MatDialog);

  protected readonly users = signal<User[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal<number>(1);
  protected readonly pageSize = signal<number>(10);
  protected readonly searchQuery = signal<string | null>('');

  protected readonly filteredUsers = computed(() => {
    const query = this.searchQuery()?.toLowerCase() || '';
    const allUsers = this.users();
    
    if (!query) return allUsers;
    
    return allUsers.filter(u => 
      u.fullname.toLowerCase().includes(query) || 
      u.username.toLowerCase().includes(query)
    );
  });

  protected readonly tableConfig: ColumnDef<User>[] = [
    { key: 'fullname', header: 'Name' },
    { key: 'username', header: 'Username' },
    { 
      key: 'last_login', 
      header: 'Last Login',
      formatter: (row) => {
        if (!row.last_login) return 'Never';
        return `${this.utilsService.dateFormatter(row.last_login)} ${this.utilsService.timeFormatter(row.last_login).toUpperCase()}`;
      }
    },
    { key: 'is_disabled', header: 'Status' },
    { 
      key: 'date_created', 
      header: 'Member Since',
      formatter: (row) => {
        if (!row.date_created) return '-';
        return `${this.utilsService.dateFormatter(row.date_created)} ${this.utilsService.timeFormatter(row.date_created).toUpperCase()}`;
      }
    },
    { key: 'action', header: '' },
  ];

  ngOnInit(): void {
    void this.loadUsers();
  }

  protected getActionOptions(user: User): ActionButtonOption[] {
    return [
      { 
        id: 'toggle-status', 
        label: user.is_disabled ? 'Enable' : 'Disable', 
        icon: user.is_disabled ? 'check_circle' : 'block' 
      }
    ];
  }

  protected async handleActionSelection(option: ActionButtonOption, user: User): Promise<void> {
    if (option.id === 'toggle-status') {
      await this.toggleStatus(user);
    }
  }

  protected addUser(): void {
    const dialogRef = this.dialog.open(AddUserDialogComponent, {
      width: '450px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        void this.loadUsers();
      }
    });
  }

  private async loadUsers(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.authService.getUsers();
      this.users.set(data);
    } catch (error) {
      this.toastService.error({ message: 'Failed to load users.' });
    } finally {
      this.isLoading.set(false);
    }
  }

  private async toggleStatus(user: User): Promise<void> {
    try {
      const updatedUser = await this.authService.toggleUserStatus(user.id);
      this.users.update(list => list.map(u => u.id === updatedUser.id ? updatedUser : u));
      this.toastService.success({ 
        message: `User ${updatedUser.is_disabled ? 'disabled' : 'enabled'} successfully.` 
      });
    } catch (error) {
      this.toastService.error({ message: 'Failed to update user status.' });
    }
  }
}

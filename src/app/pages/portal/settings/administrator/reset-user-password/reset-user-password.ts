import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { form, FormField, required, validate } from '@angular/forms/signals';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { Dropdown } from '@shared/components/dropdown/dropdown';
import { AuthService } from '../../../../auth/services/auth-service';
import { ToastService } from '@core/components/toast/service/toast-service';
import { User } from '@interfaces/user.interface';

interface ResetUserData {
  userId: string;
  newPassword: string;
  confirmPassword: string;
  actorPassword: string;
}

@Component({
  selector: 'app-reset-user-password',
  standalone: true,
  imports: [MatButtonModule, Inputfield, Dropdown, FormField],
  templateUrl: './reset-user-password.html',
  styleUrl: './reset-user-password.scss',
})
export class ResetUserPassword implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly isSubmitting = signal(false);
  protected readonly users = signal<User[]>([]);
  protected readonly userOptions = computed(() =>
    this.users().map((u) => ({ label: u.fullname, value: u.id }))
  );

  private readonly INITIAL_DATA: ResetUserData = {
    userId: '',
    newPassword: '',
    confirmPassword: '',
    actorPassword: '',
  };

  protected readonly resetModel = signal<ResetUserData>(this.INITIAL_DATA);

  protected readonly resetForm = form(this.resetModel, (path) => {
    required(path.userId, { message: 'Please select a user.' });
    required(path.newPassword, { message: 'New password is required.' });
    required(path.confirmPassword, { message: 'Please confirm the new password.' });
    required(path.actorPassword, { message: 'Your administrator password is required.' });

    validate(path.confirmPassword, (field) => {
      if (!field.value()) return null;
      return field.value() === this.resetModel().newPassword
        ? null
        : { message: 'Passwords do not match.', kind: 'error' };
    });
  });

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    try {
      this.users.set(await this.authService.getUsers());
    } catch {
      this.toastService.error({ message: 'Failed to load users.' });
    }
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.resetForm().invalid() || this.isSubmitting()) {
      if (this.resetForm().invalid()) {
        this.toastService.error({ message: 'Please complete all required fields.' });
      }
      return;
    }

    const { userId, newPassword, actorPassword } = this.resetForm().value();
    this.isSubmitting.set(true);

    try {
      await this.authService.adminResetUserPassword({
        actorPassword,
        targetUserId: userId,
        newPassword,
      });
      this.toastService.success({ message: 'Password reset successfully.' });
      this.resetForm().reset({ ...this.INITIAL_DATA });
    } catch (error) {
      const ipcError = this.authService.extractIpcError(error);
      this.toastService.error({
        message: (typeof ipcError.message === 'string' ? ipcError.message : 'Unable to reset password.') as string,
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

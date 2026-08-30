import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { form, FormField, required, validate } from '@angular/forms/signals';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { AuthService } from '../../../../auth/services/auth-service';
import { ToastService } from '@core/components/toast/service/toast-service';

interface ResetSyncData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-reset-sync-password',
  standalone: true,
  imports: [MatButtonModule, Inputfield, FormField],
  templateUrl: './reset-sync-password.html',
  styleUrl: './reset-sync-password.scss',
})
export class ResetSyncPassword implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly isSubmitting = signal(false);
  protected readonly isSyncPasswordSet = signal(false);

  private readonly INITIAL_DATA: ResetSyncData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  protected readonly resetModel = signal<ResetSyncData>(this.INITIAL_DATA);

  protected readonly resetForm = form(this.resetModel, (path) => {
    required(path.newPassword, { message: 'New cloud sync password is required.' });
    required(path.confirmPassword, { message: 'Please confirm the new password.' });

    validate(path.currentPassword, (field) => {
      if (!this.isSyncPasswordSet()) return null;
      if (!field.value()) {
        return { message: 'Current cloud sync password is required.', kind: 'error' };
      }
      return null;
    });

    validate(path.confirmPassword, (field) => {
      if (!field.value()) return null;
      return field.value() === this.resetModel().newPassword
        ? null
        : { message: 'Passwords do not match.', kind: 'error' };
    });
  });

  async ngOnInit(): Promise<void> {
    await this.checkStatus();
  }

  private async checkStatus(): Promise<void> {
    try {
      const status = await this.authService.getSyncAdminPasswordStatus();
      this.isSyncPasswordSet.set(status.isSet);
    } catch {
      this.toastService.error({ message: 'Unable to check sync password status.' });
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

    const { currentPassword, newPassword } = this.resetForm().value();
    this.isSubmitting.set(true);

    try {
      await this.authService.setSyncAdminPassword({
        currentPassword: this.isSyncPasswordSet() ? currentPassword : undefined,
        newPassword,
      });
      this.toastService.success({
        message: this.isSyncPasswordSet()
          ? 'Cloud sync password updated successfully.'
          : 'Cloud sync password set successfully.',
      });
      this.resetModel.set(this.INITIAL_DATA);
      this.isSyncPasswordSet.set(true);
    } catch (error) {
      const ipcError = this.authService.extractIpcError(error);
      this.toastService.error({
        message: (typeof ipcError.message === 'string' ? ipcError.message : 'Unable to update cloud sync password.') as string,
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

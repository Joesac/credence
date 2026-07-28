import { Component, inject, signal, computed } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { form, FormField, required, validate } from '@angular/forms/signals';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { AuthService } from '../../../../auth/services/auth-service';
import { ToastService } from '@core/components/toast/service/toast-service';

interface AddUserData {
  fullname: string;
  username: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-add-user-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    FormField,
    Inputfield,
  ],
  templateUrl: './add-user-dialog.html',
})
export class AddUserDialogComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<AddUserDialogComponent>);

  protected readonly isSubmitting = signal(false);

  private readonly INITIAL_DATA: AddUserData = {
    fullname: '',
    username: '',
    password: '',
    confirmPassword: '',
  };

  protected readonly addUserModel = signal<AddUserData>(this.INITIAL_DATA);

  protected readonly showPasswordMismatch = computed(() => {
    const { password, confirmPassword } = this.addUserModel();
    return confirmPassword.length > 0 && password !== confirmPassword;
  });

  protected readonly addUserForm = form(this.addUserModel, (path) => {
    required(path.fullname, { message: 'Fullname is required.' });
    required(path.username, { message: 'Username is required.' });
    required(path.password, { message: 'Password is required.' });
    required(path.confirmPassword, { message: 'Please confirm your password.' });

    validate(path.confirmPassword, (field) => {
      if (!field.value()) return null;
      return field.value() === this.addUserModel().password
        ? null
        : { message: 'Passwords do not match.', kind: 'error' };
    });
  });

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.addUserForm().invalid() || this.isSubmitting()) {
      if (this.addUserForm().invalid()) {
        this.toastService.error({ message: 'Please complete all required fields.' });
      }
      return;
    }

    const { fullname, username, password } = this.addUserForm().value();

    this.isSubmitting.set(true);

    try {
      await this.authService.register({
        fullname: fullname.trim(),
        username: username.trim().toLowerCase(),
        password: password
      });
      
      this.toastService.success({ message: 'User created successfully.' });
      this.dialogRef.close(true);
    } catch (error) {
      const ipcError = this.authService.extractIpcError(error);
      const errorMessage = typeof ipcError.message === 'string' ? ipcError.message : '';

      if (ipcError.code === 'USERNAME_TAKEN' || 
          errorMessage.includes('UNIQUE constraint failed: users.username')) {
        this.toastService.error({ message: 'This username is already taken. Please choose another one.' });
      } else {
        this.toastService.error({ message: 'Unable to create user. Please try again.' });
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected onCancel(): void {
    this.dialogRef.close(false);
  }
}

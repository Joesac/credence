import { Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { AuthService } from '../../../../auth/services/auth-service';
import { ToastService } from '@core/components/toast/service/toast-service';

interface UserDetailsData {
  fullName: string;
  username: string;
  currentPassword: string;
  password: string;
}

@Component({
  selector: 'app-details-component',
  standalone: true,
  imports: [
    FormField,
    Inputfield
  ],
  templateUrl: './details-component.html',
  styleUrl: './details-component.scss',
})
export class DetailsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly isSubmitting = signal(false);
  protected readonly isLoading = signal(true);
  protected userId: string | null = null;

  protected readonly userModel = signal<UserDetailsData>({
    fullName: '',
    username: '',
    currentPassword: '',
    password: ''
  });

  protected readonly detailsForm = form(this.userModel, (path) => {
    required(path.fullName, {
      message: 'Fullname is required.'
    });

    required(path.username, {
      message: 'Username is required.'
    });

    required(path.currentPassword, {
      message: 'Current password is required to save changes.'
    });
  });

  async ngOnInit(): Promise<void> {
    try {
      const activeUser = await this.authService.getActiveUser();
      this.userId = activeUser.id;
      this.userModel.set({
        fullName: activeUser.fullname,
        username: activeUser.username,
        currentPassword: '',
        password: ''
      });
    } catch (error) {
      console.error('Failed to load user details', error);
      this.toastService.error({ message: 'Unable to load your profile details.' });
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.detailsForm().invalid() || this.isSubmitting() || !this.userId) {
      if (this.detailsForm().invalid()) {
        this.toastService.error({ message: 'Please complete all required fields.' });
      }
      return;
    }

    const payload = this.detailsForm().value();
    this.isSubmitting.set(true);

    try {
      await this.authService.updateUser({
        id: this.userId,
        currentPassword: payload.currentPassword.trim(),
        fullname: payload.fullName.trim(),
        username: payload.username.trim(),
        password: payload.password.trim() || undefined
      });

      this.toastService.success({ message: 'Profile updated successfully.' });
      
      // Clear password fields after successful update
      this.userModel.update(prev => ({ ...prev, currentPassword: '', password: '' }));
    } catch (error: any) {
      const errorCode = error?.code || error?.message;

      if (errorCode === 'INVALID_CURRENT_PASSWORD') {
        this.toastService.error({ message: 'The current password you entered is incorrect.' });
      } else if (errorCode === 'USERNAME_TAKEN') {
        this.toastService.error({ message: 'This username is already taken. Please choose another one.' });
      } else {
        this.toastService.error({ message: 'Unable to update profile. Please try again.' });
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { AuthService } from '../../../pages/auth/services/auth-service';

@Component({
  selector: 'app-sync-admin-password-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, Inputfield],
  templateUrl: './sync-admin-password-dialog.html',
  styleUrl: './sync-admin-password-dialog.scss',
})
export class SyncAdminPasswordDialogComponent {
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<SyncAdminPasswordDialogComponent>);

  protected readonly password = signal<string | number | null>('');
  protected readonly isVerifying = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected async confirm(): Promise<void> {
    const value = String(this.password() ?? '').trim();
    if (!value) {
      this.errorMessage.set('Please enter the cloud sync password.');
      return;
    }

    this.isVerifying.set(true);
    this.errorMessage.set(null);

    try {
      const result = await this.authService.verifySyncAdminPassword(value);
      if (result.valid) {
        this.dialogRef.close(true);
      } else {
        this.errorMessage.set('Incorrect cloud sync password.');
      }
    } catch {
      this.errorMessage.set('Unable to verify the password. Please try again.');
    } finally {
      this.isVerifying.set(false);
    }
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }
}

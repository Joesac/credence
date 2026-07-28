import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../pages/auth/services/auth-service';
import { Inputfield } from '../inputfield/inputfield';

@Component({
  selector: 'app-confirm-password-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    Inputfield,
  ],
  templateUrl: './confirm-password-dialog.html',
  styleUrl: './confirm-password-dialog.scss',
})
export class ConfirmPasswordDialogComponent {
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<ConfirmPasswordDialogComponent>);

  protected readonly password = signal<string | number | null>('');
  protected readonly isVerifying = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected async confirm(): Promise<void> {
    const value = String(this.password() ?? '').trim();
    if (!value) {
      this.errorMessage.set('Please enter your password.');
      return;
    }

    this.isVerifying.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.verifyPassword(value);
      this.dialogRef.close(true);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Incorrect password.');
    } finally {
      this.isVerifying.set(false);
    }
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }
}

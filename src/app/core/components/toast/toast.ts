import { Component, inject } from '@angular/core';
import { MatSnackBar, MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export interface SnackbarData {
  message: string;
  type: 'success' | 'error';
  actionLabel?: string;
}

@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class Toast {
  // Leverage modern Angular 22 inject() pattern
  data = inject<SnackbarData>(MAT_SNACK_BAR_DATA);
  private snackBarRef = inject<MatSnackBarRef<Toast>>(MatSnackBarRef);

  /**
   * Dismisses the snackbar with action event
   */
  triggerAction(): void {
    this.snackBarRef.dismissWithAction();
  }
}

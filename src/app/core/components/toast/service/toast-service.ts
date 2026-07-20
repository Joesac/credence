import { inject, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Toast as ToastComponent } from '../toast';

export interface SnackbarAction {
  label: string;
  callback: () => void;
}

@Service()
export class ToastService {
     private snackBar = inject(MatSnackBar);

  /**
   * Triggers a green success toast
   */
  success(message: string, action?: SnackbarAction): void {
    this.show(message, 'success', action);
  }

  /**
   * Triggers a red error/critical warning toast
   */
  error(message: string, action?: SnackbarAction): void {
    this.show(message, 'error', action);
  }

  /**
   * Orchestrates the MatSnackBar logic
   */
  private show(message: string, type: 'success' | 'error', action?: SnackbarAction): void {
    const ref = this.snackBar.openFromComponent(ToastComponent, {
      duration: 5000, // Default display time of 5 seconds
      data: {
        message,
        type,
        actionLabel: action?.label
      },
      panelClass: ['custom-toast-container'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });

    // If an action callback config was provided, handle clicking the action button
    if (action) {
      ref.onAction().subscribe(() => {
        action.callback();
      });
    }
  }
}

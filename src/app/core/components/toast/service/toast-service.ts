import { inject, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Toast as ToastComponent } from '../toast';

export interface SnackbarAction {
  label: string;
  callback: () => void;
}

interface SnackbarArgs {
  message: string;
  header?: string;
  action?: SnackbarAction;
}

@Service()
export class ToastService {
     private snackBar = inject(MatSnackBar);

  /**
   * Triggers a green success toast
   */
  success({ message, header, action }: SnackbarArgs): void {
    this.show(message, 'success', header, action);
  }

  /**
   * Triggers a red error/critical warning toast
   */
  error({ message, header, action }: SnackbarArgs): void {
    this.show(message, 'error', header, action);
  }

  /**
   * Orchestrates the MatSnackBar logic
   */
  private show(message: string, type: 'success' | 'error', header?: string, action?: SnackbarAction): void {
    const ref = this.snackBar.openFromComponent(ToastComponent, {
      duration: 5000, // Default display time of 5 seconds
      data: {
        message,
        type,
        actionLabel: action?.label,
        header
      },
      panelClass: ['custom-toast-container'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });

    // If an action callback config was provided, handle clicking the action button
    if (action) {
      ref.onAction().subscribe(() => {
        action.callback();
      });
    }
  }
}

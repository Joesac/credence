import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastService } from '@core/components/toast/service/toast-service';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';

export interface ConfirmDialogData {
  title: string;
  message: string;
  onConfirm: () => Promise<unknown>;
}

@Component({
  selector: 'app-confirm-dialog-component',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog-component.html',
  styleUrl: './confirm-dialog-component.scss',
})
export class ConfirmDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  private readonly toastService = inject(ToastService);
  private readonly ipcBridgeService = inject(IpcBridgeService);

  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  readonly isProcessing = signal(false);

  protected async confirm(): Promise<void> {
    if (this.isProcessing()) return;

    this.isProcessing.set(true);
    this.dialogRef.disableClose = true;

    try {
      await this.data.onConfirm();
      this.dialogRef.close(true);
    } catch (error) {
      const ipcError = this.ipcBridgeService.extractIpcError(error);
      this.toastService.error({ message: (ipcError.message || '') as string });
    } finally {
      this.isProcessing.set(false);
      this.dialogRef.disableClose = false;
    }
  }

  protected cancel(): void {
    if (this.isProcessing()) return;
    this.dialogRef.close(false);
  }
}

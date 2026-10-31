import { Component, inject, input, output, viewChild } from '@angular/core';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { MatButtonModule } from '@angular/material/button';
import { UtilsService } from '@shared/services/utils-service';
import { RightSidebarService } from '@core/services/right-sidebar-service';

/**
 * Shared row shape for the transaction details sidebar, used by both the Daily
 * Collections report and the History pages. Fields may be omitted by the
 * caller; the sidebar hides the corresponding sections when missing.
 */
export type TransactionDetailsRow = {
  id: string;
  transactionId: string;
  type: 'Deposit' | 'Withdrawal';
  memberName: string;
  amount: number;
  refreshmentToken?: number;
  paymentMethod?: string;
  receivedBy?: string;
  receivedByName?: string;
  issuerId?: string;
  issuerName?: string;
  notes?: string | null;
  occurredAt: string;
  dateCreated: string;
  dateUpdated: string;
  isCancelled: boolean;
};

@Component({
  selector: 'app-transaction-details-sidebar',
  imports: [
    PortalModule,
    MatButtonModule
  ],
  templateUrl: './transaction-details-sidebar.html',
})
export class TransactionDetailsSidebar {
  /** The transaction to display in the sidebar. */
  transaction = input<TransactionDetailsRow | null>(null);

  /** Emitted when the user requests cancellation of the displayed transaction. */
  onCancelTransaction = output<TransactionDetailsRow>();

  private readonly rightSidebarService = inject(RightSidebarService);
  protected readonly utilsService = inject(UtilsService);

  protected closeSidebar(): void {
    this.rightSidebarService.close();
  }

  private readonly viewDetailsPortal = viewChild.required<CdkPortal>('viewDetailsPortal');

  /** Opens the sidebar with the currently bound transaction. */
  open(): void {
    this.rightSidebarService.open(this.viewDetailsPortal());
  }
}

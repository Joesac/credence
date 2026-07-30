import { Service, signal } from '@angular/core';
import { Portal } from '@angular/cdk/portal';

@Service()
export class RightSidebarService {
  protected readonly isOpenSignal = signal<boolean>(false);
  protected readonly portalSignal = signal<Portal<unknown> | null>(null);

  readonly isOpen = this.isOpenSignal.asReadonly();
  readonly portal = this.portalSignal.asReadonly();

  open(portal: Portal<unknown>): void {
    this.portalSignal.set(portal);
    this.isOpenSignal.set(true);
  }

  close(): void {
    this.isOpenSignal.set(false);
    this.portalSignal.set(null);
  }
}

import { Service, NgZone, inject, signal } from '@angular/core';
import { Subject, Observable, fromEvent, merge, Subscription, timer } from 'rxjs';
import { switchMap, startWith, filter } from 'rxjs/operators';

@Service()
export class IdleService {
  private ngZone = inject(NgZone);

  // Time configurations in milliseconds
  private readonly TOTAL_SESSION_MINUTES = 15;
  private readonly WARNING_WINDOW_MINUTES = 1;

  readonly IDLE_TIMEOUT_MS = this.TOTAL_SESSION_MINUTES * 60 * 1000;
  readonly WARNING_DURATION_MS = this.WARNING_WINDOW_MINUTES * 60 * 1000;
  readonly WARNING_THRESHOLD_MS = (this.TOTAL_SESSION_MINUTES - this.WARNING_WINDOW_MINUTES) * 60 * 1000;

  private warningSubject = new Subject<number>();
  private timeoutSubject = new Subject<void>();

  readonly onWarning$: Observable<number> = this.warningSubject.asObservable();
  readonly onTimeout$: Observable<void> = this.timeoutSubject.asObservable();

  readonly isWarningActive = signal<boolean>(false);

  private idleSubscription?: Subscription;
  private countdownSubscription?: Subscription;
  private timeoutSubscription?: Subscription;
  private debugInterval?: Subscription;
  private logoutCallback?: () => void;

  startMonitoring(onLogoutCallback?: () => void): void {
    this.stopMonitoring();

    if (onLogoutCallback) {
      this.logoutCallback = onLogoutCallback;
    }

    if (this.logoutCallback) {
      this.timeoutSubscription = this.onTimeout$.subscribe(() => this.logoutCallback?.());
    }

    this.ngZone.runOutsideAngular(() => {
      console.log(`[IdleService] Monitoring started. Wait time: ${this.WARNING_THRESHOLD_MS / 1000 / 60}m. Warning window: ${this.WARNING_DURATION_MS / 1000}s.`);
      
      const activityEvents$ = merge(
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'click'),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'scroll', { capture: true, passive: true }),
        fromEvent(document, 'touchstart', { passive: true })
      );

      this.idleSubscription = activityEvents$
        .pipe(
          startWith(null),
          filter(() => !this.isWarningActive()), // Ignore activity while warning modal is shown
          switchMap(() => {
            console.log('[IdleService] Activity detected. Resetting idle timer...');
            this.startDebugCountdown(this.WARNING_THRESHOLD_MS);
            // Wait for 14 mins (WARNING_THRESHOLD_MS) of idle before emitting warning
            return timer(this.WARNING_THRESHOLD_MS);
          })
        )
        .subscribe(() => {
          this.stopDebugCountdown();
          this.ngZone.run(() => this.triggerWarning());
        });
    });
  }

  private startDebugCountdown(durationMs: number): void {
    this.stopDebugCountdown();
    let secondsLeft = Math.floor(durationMs / 1000);
    this.debugInterval = timer(0, 1000).subscribe(() => {
      if (secondsLeft < 0) {
        this.stopDebugCountdown();
        return;
      }
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      console.log(`[IdleService] Idle time remaining before warning: ${mins}m ${secs}s`);
      secondsLeft -= 1;
    });
  }

  private stopDebugCountdown(): void {
    this.debugInterval?.unsubscribe();
  }

  stopMonitoring(): void {
    this.idleSubscription?.unsubscribe();
    this.timeoutSubscription?.unsubscribe();
    this.stopCountdown();
    this.stopDebugCountdown();
    this.isWarningActive.set(false);
    this.logoutCallback = undefined; // Clear reference to component
  }

  /**
   * Manually resets the idle timer (e.g. from the warning modal)
   */
  reset(): void {
    this.ngZone.run(() => {
      this.cancelWarning();
      // Restart monitoring to reset the switchMap timer
      this.startMonitoring();
    });
  }

  private triggerWarning(): void {
    console.log('[IdleService] ⚠ Warning threshold reached. Starting countdown...');
    this.isWarningActive.set(true);
    let secondsLeft = this.WARNING_DURATION_MS / 1000;

    this.warningSubject.next(secondsLeft);

    this.countdownSubscription = timer(0, 1000).subscribe(() => {
      this.ngZone.run(() => {
        console.log(`[IdleService] ⚠ ${secondsLeft}s remaining...`);
        secondsLeft--;
        if (secondsLeft > 0) {
          this.warningSubject.next(secondsLeft);
        } else {
          this.stopCountdown();
          this.isWarningActive.set(false);
          this.timeoutSubject.next(); // Full 15 minutes reached
        }
      });
    });
  }

  private cancelWarning(): void {
    this.stopCountdown();
    this.isWarningActive.set(false);
  }

  private stopCountdown(): void {
    this.countdownSubscription?.unsubscribe();
  }
}
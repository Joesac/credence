import { Component, computed, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MENU } from '@constants/menu.const';
import { Menu } from '@interfaces/menu.interface';
import { Topbar } from '@shared/components/topbar/topbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { PortalModule } from '@angular/cdk/portal';
import { RightSidebarService } from '@core/services/right-sidebar-service';
import { IdleService } from '@core/services/idle-service';
import { ToastService } from '@core/components/toast/service/toast-service';
import { AppService } from '@core/services/app';
import { AuthService } from '../auth/services/auth-service';
import { AuthUser } from '@interfaces/user.interface';
import { LOGIN_ROUTE } from '@constants/routes.const';
import { Subscription } from 'rxjs';
import { SessionWarningModal } from '@core/components/session-warning-modal/session-warning-modal';

@Component({
  selector: 'app-portal',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatButtonModule, PortalModule, Topbar, SessionWarningModal],
  templateUrl: './portal.html',
  styleUrl: './portal.scss',
})
export class Portal implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly idleService = inject(IdleService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  protected readonly rightSidebarService = inject(RightSidebarService);
  protected readonly app = inject(AppService);
  protected readonly expandedSections = signal<Record<string, boolean>>({});
  protected readonly activeUser = signal<AuthUser | null>(null);
  protected readonly menu = computed(() => this.filterMenu(MENU));

  protected readonly showSessionWarning = signal(false);
  protected readonly sessionRemainingSeconds = signal(0);
  protected readonly version = this.app.version;

  private warningSub?: Subscription;

  ngOnInit(): void {
    // 1. Load active user for menu filtering
    void this.loadActiveUser();

    // 2. Start idle monitoring & pass logout handler
    this.idleService.startMonitoring(() => this.handleLogout());

    // 3. Subscribe to the warning signal
    this.warningSub = this.idleService.onWarning$.subscribe((secondsRemaining) => {
      this.sessionRemainingSeconds.set(secondsRemaining);
      this.showSessionWarning.set(true);
    });

  }

  private async loadActiveUser(): Promise<void> {
    try {
      const user = await this.authService.getActiveUser();
      this.activeUser.set(user);
    } catch {
      this.activeUser.set(null);
    }
  }

  private filterMenu(items: Menu[]): Menu[] {
    const role = this.activeUser()?.role;
    return items
      .map((item) => ({
        ...item,
        children: item.children?.filter((child) => !child.role || child.role === role),
      }))
      .filter((item) => !item.role || item.role === role);
  }

  protected continueSession(): void {
    this.showSessionWarning.set(false);
    this.idleService.reset();
  }

  private handleLogout(): void {
    this.toastService.warning({
      message: 'Logged out due to 15 minutes of inactivity.',
    });
    this.authService.logout();
    this.router.navigate([LOGIN_ROUTE]);
  }

  ngOnDestroy(): void {
    // Stop monitoring when portal component unmounts
    this.idleService.stopMonitoring();
    this.warningSub?.unsubscribe();
  }

  // private async handleTimeout(): Promise<void> {
  //   this.idleService.stop();
  //   await this.authService.logout();
  //   this.toastService.success({ message: 'You have been signed out due to inactivity.' });
  //   await this.router.navigate([LOGIN_ROUTE]);
  // }

  toggleSubmenu(event: Event, item: Menu): void {
    if (!item.children?.length) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.expandedSections.update((map) => ({
      ...map,
      [item.id]: !map[item.id]
    }));
  }

  isSubmenuOpen(item: Menu): boolean {
    const map = this.expandedSections();
    if (map[item.id] !== undefined) {
      return map[item.id];
    }

    return this.isRouteActive('/' + item.id);
  }

  isRouteActive(url: string, exact: boolean = false): boolean {
    return this.router.isActive(url, {
      paths: exact ? 'exact' : 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
  }

  hasActiveSub(item: Menu): boolean {
    return !!item.children?.some((sub) => this.isRouteActive('/' + item.id + '/' + sub.id, true));
  }
}

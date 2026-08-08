import { Service, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { IpcBridgeService } from './ipc-bridge-service';

@Service()
export class AppService {
  private readonly router = inject(Router);
  private readonly ipcBridge = inject(IpcBridgeService);

  readonly pageRoute = signal<string[]>([]);
  readonly version = signal('');
  readonly isSidebarOpen = signal(true);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.updatePageRoute());

    this.updatePageRoute();

    this.ipcBridge
      .executeIPC((api) => api.getVersion())
      .then((version) => this.version.set(version));
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update((open) => !open);
  }

  private updatePageRoute(): void {
    const breadcrumbs = this.collectBreadcrumbs(this.router.routerState.snapshot.root);
    this.pageRoute.set(breadcrumbs);
  }

  private collectBreadcrumbs(route: ActivatedRouteSnapshot | null, acc: string[] = []): string[] {
    if (!route) {
      return acc;
    }

    const current = (route.data?.['breadcrumb'] as string[] | undefined) ?? [];
    const nextAcc = current.length ? [...acc, ...current] : acc;
    const primaryChild = route.children?.find((child) => child.outlet === 'primary') ?? null;

    return this.collectBreadcrumbs(primaryChild, nextAcc);
  }
}

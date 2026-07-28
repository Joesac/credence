import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MENU } from '@constants/menu.const';
import { Menu } from '@interfaces/menu.interface';
import { Topbar } from '@shared/components/topbar/topbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-portal',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatButtonModule, Topbar],
  templateUrl: './portal.html',
  styleUrl: './portal.scss',
})
export class Portal {
  private readonly router = inject(Router);
  protected readonly expandedSections = signal<Record<string, boolean>>({});
  protected readonly menu = MENU;

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

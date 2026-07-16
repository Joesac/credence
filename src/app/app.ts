import { Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MENU } from './constants/menu.const';
import { Menu } from './interfaces/menu.interface';
import { Topbar } from '@shared/components/topbar/topbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',  
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatSidenavModule, MatButtonModule, Topbar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
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

    return this.hasActiveSub(item);
  }

  hasActiveSub(item: Menu): boolean {
    return !!item.children?.some((s) => s.isActive);
  }
}

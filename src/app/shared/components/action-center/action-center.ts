import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../pages/auth/services/auth-service';
import { LOGIN_ROUTE } from '../../../constants/routes.const';

@Component({
  selector: 'app-action-center',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './action-center.html',
  styleUrl: './action-center.scss',
})
export class ActionCenter implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isDarkMode = signal(false);

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    this.setTheme(isDark);
  }

  protected toggleTheme(): void {
    this.setTheme(!this.isDarkMode());
  }

  private setTheme(isDark: boolean): void {
    this.isDarkMode.set(isDark);
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  /**
   * Returns the authenticated username for display in the action center.
   * Falls back to a generic label when no session username is present.
   */
  protected get username(): string {
    return this.authService.getUsername() ?? 'User';
  }

  /**
   * Logs out the active user, clears local session state, and navigates to login.
   */
  protected async onLogout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate([LOGIN_ROUTE]);
  }
}

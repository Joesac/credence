import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../pages/auth/services/auth-service';
import { LOGIN_ROUTE } from '@constants/routes.const';
import { ButtonThemeSwitchter } from '@core/components/button-theme-switchter/button-theme-switchter';

@Component({
  selector: 'app-action-center',
  standalone: true,
  imports: [MatButtonModule, ButtonThemeSwitchter],
  templateUrl: './action-center.html',
  styleUrl: './action-center.scss',
})
export class ActionCenter {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

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

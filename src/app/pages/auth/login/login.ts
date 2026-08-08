import { Component, signal, inject } from '@angular/core';
import { form, required, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Inputfield } from '@shared/components/inputfield/inputfield';
import { ButtonThemeSwitchter } from '@core/components/button-theme-switchter/button-theme-switchter';
import { ToastService } from '@core/components/toast/service/toast-service';
import { AppService } from '@core/services/app';
import { PORTAL_DASHBOARD_ROUTE } from '@constants/routes.const';
import { AuthService } from '../services/auth-service';

interface LoginData {
  username: string;
  password: string;
}

@Component({
  selector: 'app-login',
  imports: [
    FormField,
    Inputfield,
    MatButtonModule,
    ButtonThemeSwitchter,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly app = inject(AppService);
  private readonly INITIAL_DATA = <LoginData>({
    username: '',
    password: '',
  });

  protected readonly loginModel = signal<LoginData>(this.INITIAL_DATA);
  protected readonly loginForm = form(this.loginModel, (path) => {
    required(path.username, {
      message: 'Username is required',
    });

    required(path.password, {
      message: 'Password is required',
    });
  });

  protected readonly showPassword = signal(false);

  protected readonly version = this.app.version;

  /**
   * Submits validated credentials to the authentication service.
   * On success, persists auth session via AuthService and redirects to the portal dashboard.
   */
  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loginForm().invalid()) {
      return;
    }

    const payload = this.loginForm().value() as LoginData;

    try {
      await this.authService.login(payload);
      this.toastService.success({ message: 'Login successful. Welcome back!' });
      await this.router.navigate([PORTAL_DASHBOARD_ROUTE]);
    } catch {
      this.toastService.error({ message: 'Invalid username or password. Please try again.' });
    }
  }
}

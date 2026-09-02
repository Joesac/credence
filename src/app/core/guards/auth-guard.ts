import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../pages/auth/services/auth-service';
import { AUTH_STORAGE_KEYS } from '../../constants/auth.const';
import { USER_ROLES } from '@constants/roles.const';

function isAuthenticated(): boolean {
  return AUTH_STORAGE_KEYS.some((key) => Boolean(localStorage.getItem(key)));
}

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return isAuthenticated() ? router.createUrlTree(['/portal/dashboard']) : true;
};

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.getActiveUser()
    .then((user) => (user.role === USER_ROLES.Admin ? true : router.createUrlTree(['/portal/dashboard'])))
    .catch(() => router.createUrlTree(['/login']));
};

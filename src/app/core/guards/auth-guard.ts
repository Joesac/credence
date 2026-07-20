import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AUTH_STORAGE_KEYS } from '../../constants/auth.const';

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

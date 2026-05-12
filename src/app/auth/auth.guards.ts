import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AuthStateService } from './auth-state.service';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export const authGuard: CanActivateFn = () => {
  if (!isBrowser()) {
    return true;
  }

  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/login');
};

export const authChildGuard: CanActivateChildFn = () => {
  if (!isBrowser()) {
    return true;
  }

  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/login');
};

export const guestGuard: CanActivateFn = () => {
  if (!isBrowser()) {
    return true;
  }

  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (!authState.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/dashboard');
};

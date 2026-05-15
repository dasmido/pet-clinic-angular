import { Injectable, signal } from '@angular/core';

import { AuthSessionData } from './auth-api.service';

const AUTH_STORAGE_KEY = 'animal-clinic-angular.auth.session';
const LEGACY_AUTH_STORAGE_KEY = 'animal-clinic-angular.authenticated';

export interface AuthSession {
  token: string;
  refreshToken: string;
  roles: AuthSessionData['roles'];
}

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly session = signal<AuthSession | null>(this.readInitialSession());

  isAuthenticated(): boolean {
    return this.session() !== null;
  }

  getSession(): AuthSession | null {
    return this.session();
  }

  getRole(): AuthSession['roles'] | null {
    return this.session()?.roles ?? null;
  }

  setSession(session: AuthSession | null): void {
    this.session.set(session);

    if (typeof window === 'undefined') {
      return;
    }

    if (session) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  }

  clearSession(): void {
    this.setSession(null);
  }

  private readInitialSession(): AuthSession | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession) as Partial<AuthSession>;

        if (
          typeof parsedSession.token === 'string' &&
          typeof parsedSession.refreshToken === 'string' &&
          parsedSession.roles != null
        ) {
          const roles = (Array.isArray(parsedSession.roles)
            ? parsedSession.roles[0]
            : parsedSession.roles) as AuthSession['roles'];
          return {
            token: parsedSession.token,
            refreshToken: parsedSession.refreshToken,
            roles,
          };
        }
      } catch {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }

    if (window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEY) === 'true') {
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    }

    return null;
  }
}

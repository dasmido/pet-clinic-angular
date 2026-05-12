import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type AuthRole = 'SUPERADMIN' | 'ADMIN' | 'DOCTOR' | 'LAB' | 'NURSE' | 'PATIENT' | 'RECIPIENT';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullname: string;
  phone: string;
  role: AuthRole;
}

export interface AuthSessionData {
  token: string;
  refreshToken: string;
  roles: AuthRole;
}

export interface AuthResponse {
  data: AuthSessionData;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = 'http://localhost:4010/api/v1/auth';

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload);
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload);
  }
}

export function extractAuthErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallbackMessage;
  }

  const maybeError = error as {
    error?: { message?: string; detail?: string; error?: string } | string;
    message?: string;
    status?: number;
  };

  if (typeof maybeError.error === 'string' && maybeError.error.trim().length > 0) {
    return maybeError.error;
  }

  if (maybeError.error && typeof maybeError.error === 'object') {
    const nestedMessage = maybeError.error.message ?? maybeError.error.detail ?? maybeError.error.error;
    if (nestedMessage && nestedMessage.trim().length > 0) {
      return nestedMessage;
    }
  }

  if (typeof maybeError.message === 'string' && maybeError.message.trim().length > 0) {
    return maybeError.message;
  }

  if (maybeError.status === 0) {
    return 'Unable to reach the auth service. Check that the backend is running on localhost:4010 and allows CORS.';
  }

  return fallbackMessage;
}

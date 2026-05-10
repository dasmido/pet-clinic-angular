import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthStateService } from '../auth/auth-state.service';

export interface UserProfile {
  id: string;
  username: string;
  fullname: string;
  phone: string;
  isActive: boolean;
  roles: string;
  createdAt: string;
}

export interface UserProfileResponse {
  data: UserProfile;
}

@Injectable({ providedIn: 'root' })
export class UserProfileApiService {
  private readonly baseUrl = 'http://localhost:4010/api/v1/users';

  constructor(
    private readonly http: HttpClient,
    private readonly authStateService: AuthStateService
  ) {}

  private getAuthHeaders(): { [key: string]: string } {
    const session = this.authStateService.getSession();
    const headers: { [key: string]: string } = {};
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }
    return headers;
  }

  getProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.baseUrl}/profile`, {
      headers: this.getAuthHeaders(),
    });
  }
}

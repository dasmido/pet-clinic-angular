import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthStateService } from '../auth/auth-state.service';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  role: string;
  username: string;
  phone: string;
  fullname: string;
  isActive: boolean;
  fcmToken: string | null;
  createdAt?: string;
}

export interface UsersListResponse {
  data: {
    data: User[];
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    };
  };
}

export interface DeleteUserPayload {
  id: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  private readonly API_BASE = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private authStateService: AuthStateService
  ) {}

  private getAuthHeaders() {
    const session = this.authStateService.getSession();
    const headers: { [key: string]: string } = {};
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }
    return headers;
  }

  getUsersList(page: number = 1, perPage: number = 100): Observable<UsersListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<UsersListResponse>(
      `${this.API_BASE}/users/list`,
      {
        params,
        headers: this.getAuthHeaders(),
      }
    );
  }

  deleteUser(id: string): Observable<unknown> {
    const payload: DeleteUserPayload = { id };

    return this.http.delete(`${this.API_BASE}/users/delete`, {
      headers: this.getAuthHeaders(),
      body: payload,
    });
  }
}

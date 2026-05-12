import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthStateService } from '../auth/auth-state.service';

export interface User {
  id: string;
  fullname: string;
  email: string;
  roles: string;
  createdAt?: string;
  updatedAt?: string;
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

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  private readonly API_BASE = 'http://localhost:4010/api/v1';

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
}

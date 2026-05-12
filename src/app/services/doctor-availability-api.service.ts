import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthStateService } from '../auth/auth-state.service';

export type ReservationDay =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

export interface DoctorAvailabilityRecord {
  id: string;
  userId: string;
  reservationDays: ReservationDay[];
  startTime: string;
  endTime: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListDoctorAvailabilityResponse {
  data: {
    data: DoctorAvailabilityRecord[];
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    };
  };
}

export interface CreateDoctorAvailabilityPayload {
  userId: string;
  reservationDays: ReservationDay[];
  startTime: string;
  endTime: string;
}

export interface UpdateDoctorAvailabilityPayload {
  id: string;
  userId: string;
  reservationDays: ReservationDay[];
  startTime: string;
  endTime: string;
}

@Injectable({
  providedIn: 'root',
})
export class DoctorAvailabilityApiService {
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

  getAvailabilityList(page: number = 1, perPage: number = 10): Observable<ListDoctorAvailabilityResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<ListDoctorAvailabilityResponse>(
      `${this.API_BASE}/doctors-time-reservation/list`,
      {
        params,
        headers: this.getAuthHeaders(),
      }
    );
  }

  createAvailability(payload: CreateDoctorAvailabilityPayload): Observable<{ data: DoctorAvailabilityRecord }> {
    return this.http.post<{ data: DoctorAvailabilityRecord }>(
      `${this.API_BASE}/doctors-time-reservation/create`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  updateAvailability(payload: UpdateDoctorAvailabilityPayload): Observable<{ data: DoctorAvailabilityRecord }> {
    return this.http.patch<{ data: DoctorAvailabilityRecord }>(
      `${this.API_BASE}/doctors-time-reservation/update`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteAvailability(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.API_BASE}/doctors-time-reservation/delete`,
      {
        body: { id },
        headers: this.getAuthHeaders(),
      }
    );
  }
}

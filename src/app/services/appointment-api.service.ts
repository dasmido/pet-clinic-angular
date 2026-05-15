import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthStateService } from '../auth/auth-state.service';

export type AppointmentStage = 'DOCTOR_STAGE' | 'RECEPTION_STAGE' | 'LAB_STAGE';
export type AppointmentPaymentType = 'CASH' | 'CARD' | 'BANK_TRANSFER';
export type AppointmentCurrency = 'USD' | 'EUR' | 'SYP' | 'AED';

export interface AppointmentPatientSummary {
  id: string;
  fullname: string;
  cardNo?: string;
  gender?: string;
  birthDate?: string;
}

export interface AppointmentDoctorSummary {
  id: string;
  fullname: string;
  phone?: string;
  role?: string;
}

export interface AppointmentDoctorTimeReservationSummary {
  id: string;
  startTime: string;
  endTime: string;
  reservationDays: string[];
  user?: AppointmentDoctorSummary;
}

export interface Appointment {
  id: string;
  patientId?: string;
  doctorId?: string;
  doctorsTimeReservationId?: string;
  appointmentDate: string;
  stage: string | string[];
  payment?: number;
  paymentType?: string;
  currency?: string;
  doctorTreatment?: string | null;
  receptionNote?: string | null;
  patient?: AppointmentPatientSummary | null;
  doctor?: AppointmentDoctorSummary | null;
  doctorsTimeReservation?: AppointmentDoctorTimeReservationSummary | null;
  createdAt?: string;
  updatedAt?: string;
  bp?: string | null;
  chiefComplaint?: string | null;
  ecg?: string | null;
  endTime?: string | null;
  labResult?: string | null;
  others?: string | null;
  pulse?: string | null;
  rr?: string | null;
  temperature?: string | null;
}

export interface AppointmentsListResponse {
  data: {
    data: Appointment[];
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    };
  };
}

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  doctorsTimeReservationId: string;
  appointmentDate: string;
  stage: AppointmentStage;
  payment: number;
  paymentType: AppointmentPaymentType;
  currency: AppointmentCurrency;
}

export interface UpdateAppointmentPayload {
  id: string;
  doctorTreatment?: string;
  stage?: AppointmentStage;
  receptionNote?: string;
}

export interface DeleteAppointmentPayload {
  id: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentApiService {
  private readonly API_BASE = 'http://localhost:4010/api/v1';

  constructor(
    private readonly http: HttpClient,
    private readonly authStateService: AuthStateService
  ) {}

  private getAuthHeaders() {
    const session = this.authStateService.getSession();
    const headers: { [key: string]: string } = {};
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }
    return headers;
  }

  getAppointmentsList(page: number = 1, perPage: number = 10): Observable<AppointmentsListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<AppointmentsListResponse>(
      `${this.API_BASE}/appointments/list`,
      {
        params,
        headers: this.getAuthHeaders(),
      }
    );
  }

  createAppointment(payload: CreateAppointmentPayload): Observable<unknown> {
    return this.http.post(
      `${this.API_BASE}/appointments/create`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  updateAppointment(payload: UpdateAppointmentPayload): Observable<unknown> {
    return this.http.patch(
      `${this.API_BASE}/appointments/update`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteAppointment(id: string): Observable<unknown> {
    const payload: DeleteAppointmentPayload = { id };

    return this.http.delete(
      `${this.API_BASE}/appointments/delete`,
      {
        headers: this.getAuthHeaders(),
        body: payload,
      }
    );
  }
}

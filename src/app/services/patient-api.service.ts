import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthStateService } from '../auth/auth-state.service';

export interface Patient {
  id: string;
  cardNo: string;
  fullname: string;
  birthDate: string;
  maritalStatus: string;
  gender: string;
  emergencyContact: string;
  emergencyPhone: string;
  emergencyRelation: string;
  allergies: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChronicDisease {
  diseaseName: string;
  diseaseDescription: string;
}

export interface CreatePatientPayload {
  cardNo: string;
  fullname: string;
  birthDate: string;
  maritalStatus: string;
  gender: string;
  emergencyContact: string;
  emergencyPhone: string;
  emergencyRelation: string;
  allergies: string;
  chronicDiseases?: ChronicDisease[];
}

export interface PatientsListResponse {
  data: {
    data: Patient[];
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    };
  };
}

export interface CreatePatientResponse {
  data: Patient;
}

@Injectable({
  providedIn: 'root'
})
export class PatientApiService {
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

  getPatientsList(page: number = 1, perPage: number = 10): Observable<PatientsListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<PatientsListResponse>(
      `${this.API_BASE}/patients/list`,
      {
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  createPatient(payload: CreatePatientPayload): Observable<CreatePatientResponse> {
    return this.http.post<CreatePatientResponse>(
      `${this.API_BASE}/patients/create`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthStateService } from '../auth/auth-state.service';

export interface ChronicDiseaseRecord {
  id: string;
  patientId: string;
  diseaseName: string;
  diseaseDescription: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateChronicDiseasePayload {
  patientId: string;
  diseaseName: string;
  diseaseDescription: string;
}

export interface DeleteChronicDiseasePayload {
  id: string;
}

export interface ChronicDiseasesListResponse {
  data: {
    data: ChronicDiseaseRecord[];
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    };
  };
}

export interface ChronicDiseaseFindResponse {
  data: ChronicDiseaseRecord[];
}

export interface CreateChronicDiseaseResponse {
  data: ChronicDiseaseRecord;
}

@Injectable({
  providedIn: 'root'
})
export class ChronicDiseaseApiService {
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

  getChronicDiseasesList(page: number = 1, perPage: number = 10): Observable<ChronicDiseasesListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<ChronicDiseasesListResponse>(
      `${this.API_BASE}/patients/chronic-diseases/list`,
      {
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  findByPatientId(patientId: string): Observable<ChronicDiseaseFindResponse> {
    const params = new HttpParams().set('patientId', patientId);

    return this.http.get<ChronicDiseaseFindResponse>(
      `${this.API_BASE}/patients/chronic-diseases/find`,
      {
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  createChronicDisease(payload: CreateChronicDiseasePayload): Observable<CreateChronicDiseaseResponse> {
    return this.http.post<CreateChronicDiseaseResponse>(
      `${this.API_BASE}/patients/chronic-diseases/create`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteChronicDisease(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.API_BASE}/patients/chronic-diseases/delete`,
      {
        body: { id },
        headers: this.getAuthHeaders()
      }
    );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthStateService } from '../auth/auth-state.service';

export type CashBoxType = 'CASH_IN' | 'CASH_OUT';
export type CashBoxPaymentType = 'CASH' | 'TRANSFER' | 'CARD';

export interface CashBoxCreator {
  id: string;
  fullname: string;
  username: string;
  role: string;
}

export interface CashBoxRecord {
  cashBoxId: string;
  cashBoxType: CashBoxType;
  cashBoxEntryDate: string;
  cashBoxCategory: string;
  cashBoxDescription: string;
  cashBoxPayment: string;
  cashBoxPaymentType: CashBoxPaymentType | string;
  cashBoxCurrency: string;
  cashBoxCreatedBy: string;
  cashBoxCreatedAt: string;
  cashBoxUpdatedAt: string;
  creator?: CashBoxCreator;
}

export interface CashBoxListResponse {
  data: {
    data: CashBoxRecord[];
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    };
  };
}

export interface CreateCashBoxPayload {
  type: CashBoxType;
  date: string;
  category: string;
  description: string;
  payment: number;
  paymentType: CashBoxPaymentType | string;
  currency: string;
  createdBy: string;
}

export interface UpdateCashBoxPayload {
  id: string;
  type: CashBoxType;
  date: string;
  category: string;
  description: string;
  payment: number;
  paymentType: CashBoxPaymentType | string;
  currency: string;
}

@Injectable({
  providedIn: 'root',
})
export class CashboxApiService {
  private readonly API_BASE = 'http://localhost:4010/api/v1/cash-box';

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

  getCashBoxList(page: number = 1, perPage: number = 10): Observable<CashBoxListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<CashBoxListResponse>(`${this.API_BASE}/list`, {
      params,
      headers: this.getAuthHeaders(),
    });
  }

  createCashBox(payload: CreateCashBoxPayload): Observable<unknown> {
    return this.http.post(`${this.API_BASE}/create`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  updateCashBox(payload: UpdateCashBoxPayload): Observable<unknown> {
    return this.http.patch(`${this.API_BASE}/update`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  deleteCashBox(id: string): Observable<unknown> {
    return this.http.delete(`${this.API_BASE}/delete`, {
      headers: this.getAuthHeaders(),
      body: { id },
    });
  }
}

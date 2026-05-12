import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CashboxApiService,
  CashBoxPaymentType,
  CashBoxRecord,
  CashBoxType,
  CreateCashBoxPayload,
  UpdateCashBoxPayload,
} from '../../services/cashbox-api.service';
import { AuthStateService } from '../../auth/auth-state.service';

interface PaymentForm {
  type: CashBoxType;
  date: string;
  category: string;
  description: string;
  payment: number | null;
  paymentType: CashBoxPaymentType;
  currency: string;
}

@Component({
  selector: 'app-cashbox-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cashbox-page.component.html',
  styleUrls: ['./dashboard-feature-page.css', './cashbox-page.component.css'],
})
export class CashboxPageComponent implements OnInit {
  constructor(
    private readonly cashboxApiService: CashboxApiService,
    private readonly authStateService: AuthStateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {}

  cashBoxes: CashBoxRecord[] = [];
  currentPage = 1;
  perPage = 10;
  totalCashBoxes = 0;

  quickSearch = '';
  isLoading = false;
  isSubmitting = false;
  isUpdating = false;
  isDeleting = false;

  errorMessage = '';
  formErrorMessage = '';

  isAddDialogOpen = false;
  isDetailsDialogOpen = false;
  isDeleteDialogOpen = false;
  isEditingDetails = false;

  selectedCashBox: CashBoxRecord | null = null;
  pendingDeleteCashBox: CashBoxRecord | null = null;

  newPaymentForm: PaymentForm = this.getDefaultPaymentForm();
  editPaymentForm: PaymentForm = this.getDefaultPaymentForm();

  readonly cashBoxTypes: CashBoxType[] = ['CASH_IN', 'CASH_OUT'];
  readonly paymentTypes: CashBoxPaymentType[] = ['CASH', 'TRANSFER', 'CARD'];

  ngOnInit(): void {
    this.loadCashBoxes();
  }

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    if (this.isDeleteDialogOpen) {
      this.closeDeleteDialog();
      return;
    }

    if (this.isAddDialogOpen) {
      this.closeAddDialog();
      return;
    }

    if (this.isDetailsDialogOpen) {
      this.closeDetailsDialog();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalCashBoxes / this.perPage);
  }

  get filteredCashBoxes(): CashBoxRecord[] {
    const query = this.quickSearch.trim().toLowerCase();

    if (!query) {
      return this.cashBoxes;
    }

    return this.cashBoxes.filter((item) => {
      const creatorName = item.creator?.fullname ?? '';
      return (
        item.cashBoxType.toLowerCase().includes(query)
        || item.cashBoxCategory.toLowerCase().includes(query)
        || item.cashBoxDescription.toLowerCase().includes(query)
        || item.cashBoxPaymentType.toLowerCase().includes(query)
        || item.cashBoxCurrency.toLowerCase().includes(query)
        || creatorName.toLowerCase().includes(query)
      );
    });
  }

  get cashInCount(): number {
    return this.filteredCashBoxes.filter((item) => item.cashBoxType === 'CASH_IN').length;
  }

  get cashOutCount(): number {
    return this.filteredCashBoxes.filter((item) => item.cashBoxType === 'CASH_OUT').length;
  }

  get cashFlowDifferenceCount(): number {
    return this.cashInCount - this.cashOutCount;
  }

  get totalCashInPayment(): number {
    return this.filteredCashBoxes
      .filter((item) => item.cashBoxType === 'CASH_IN')
      .reduce((sum, item) => sum + this.toPaymentNumber(item.cashBoxPayment), 0);
  }

  get totalCashOutPayment(): number {
    return this.filteredCashBoxes
      .filter((item) => item.cashBoxType === 'CASH_OUT')
      .reduce((sum, item) => sum + this.toPaymentNumber(item.cashBoxPayment), 0);
  }

  get totalPaymentDifference(): number {
    return this.totalCashInPayment - this.totalCashOutPayment;
  }

  get deleteDialogMessage(): string {
    if (!this.pendingDeleteCashBox) {
      return 'Are you sure you want to delete this payment entry? This cannot be undone.';
    }

    return `Delete payment ${this.pendingDeleteCashBox.cashBoxCategory}? This cannot be undone.`;
  }

  loadCashBoxes(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.cashboxApiService.getCashBoxList(this.currentPage, this.perPage).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          this.cashBoxes = response.data.data;
          this.totalCashBoxes = response.data.pagination.total;
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          console.error('Error loading cashbox records:', error);
          this.errorMessage = 'Failed to load cashbox records. Please try again.';
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadCashBoxes();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  openAddDialog(): void {
    this.newPaymentForm = this.getDefaultPaymentForm();
    this.formErrorMessage = '';
    this.isAddDialogOpen = true;
  }

  closeAddDialog(): void {
    if (this.isSubmitting) {
      return;
    }
    this.isAddDialogOpen = false;
  }

  createPayment(): void {
    if (this.isSubmitting) {
      return;
    }

    const validationError = this.validatePaymentForm(this.newPaymentForm);
    if (validationError) {
      this.formErrorMessage = validationError;
      return;
    }

    const createdBy = this.getCurrentUserId();
    if (!createdBy) {
      this.formErrorMessage = 'Unable to detect current user id from session token. Please log in again.';
      return;
    }

    const payload: CreateCashBoxPayload = {
      type: this.newPaymentForm.type,
      date: this.newPaymentForm.date,
      category: this.newPaymentForm.category.trim(),
      description: this.newPaymentForm.description.trim(),
      payment: Number(this.newPaymentForm.payment),
      paymentType: this.newPaymentForm.paymentType,
      currency: this.newPaymentForm.currency.trim().toLowerCase(),
      createdBy,
    };

    this.isSubmitting = true;
    this.formErrorMessage = '';

    this.cashboxApiService.createCashBox(payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.isAddDialogOpen = false;
          this.cdr.markForCheck();
          this.loadCashBoxes();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          console.error('Error creating cashbox payment:', error);
          this.formErrorMessage = 'Failed to create payment. Please try again.';
          this.isSubmitting = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  openDetailsDialog(cashbox: CashBoxRecord): void {
    this.selectedCashBox = cashbox;
    this.editPaymentForm = this.mapCashBoxToForm(cashbox);
    this.isEditingDetails = false;
    this.formErrorMessage = '';
    this.isDetailsDialogOpen = true;
  }

  closeDetailsDialog(): void {
    if (this.isUpdating || this.isDeleting) {
      return;
    }

    this.isDetailsDialogOpen = false;
    this.isEditingDetails = false;
    this.selectedCashBox = null;
    this.formErrorMessage = '';
  }

  startEditDetails(): void {
    if (!this.selectedCashBox) {
      return;
    }

    this.editPaymentForm = this.mapCashBoxToForm(this.selectedCashBox);
    this.formErrorMessage = '';
    this.isEditingDetails = true;
  }

  cancelEditDetails(): void {
    this.isEditingDetails = false;
    this.formErrorMessage = '';
  }

  updatePayment(): void {
    if (!this.selectedCashBox || this.isUpdating) {
      return;
    }

    const validationError = this.validatePaymentForm(this.editPaymentForm);
    if (validationError) {
      this.formErrorMessage = validationError;
      return;
    }

    const payload: UpdateCashBoxPayload = {
      id: this.selectedCashBox.cashBoxId,
      type: this.editPaymentForm.type,
      date: this.editPaymentForm.date,
      category: this.editPaymentForm.category.trim(),
      description: this.editPaymentForm.description.trim(),
      payment: Number(this.editPaymentForm.payment),
      paymentType: this.editPaymentForm.paymentType,
      currency: this.editPaymentForm.currency.trim().toLowerCase(),
    };

    this.isUpdating = true;
    this.formErrorMessage = '';

    this.cashboxApiService.updateCashBox(payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isUpdating = false;
          this.isEditingDetails = false;
          this.cdr.markForCheck();
          this.loadCashBoxes();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          console.error('Error updating cashbox payment:', error);
          this.formErrorMessage = 'Failed to update payment. Please try again.';
          this.isUpdating = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  openDeleteDialogFromDetails(): void {
    if (!this.selectedCashBox || this.isDeleting) {
      return;
    }

    this.pendingDeleteCashBox = this.selectedCashBox;
    this.isDeleteDialogOpen = true;
  }

  closeDeleteDialog(): void {
    if (this.isDeleting) {
      return;
    }

    this.isDeleteDialogOpen = false;
    this.pendingDeleteCashBox = null;
  }

  confirmDeletePayment(): void {
    const target = this.pendingDeleteCashBox;
    if (!target || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';

    this.cashboxApiService.deleteCashBox(target.cashBoxId).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isDeleting = false;
          this.isDeleteDialogOpen = false;
          this.pendingDeleteCashBox = null;
          this.isDetailsDialogOpen = false;
          this.selectedCashBox = null;

          const remainingInPage = this.cashBoxes.length - 1;
          if (remainingInPage <= 0 && this.currentPage > 1) {
            this.currentPage -= 1;
          }

          this.cdr.markForCheck();
          this.loadCashBoxes();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          console.error('Error deleting payment:', error);
          this.errorMessage = 'Failed to delete payment. Please try again.';
          this.isDeleting = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  getTypeClass(type: CashBoxType): string {
    return type === 'CASH_IN' ? 'type-chip type-chip--in' : 'type-chip type-chip--out';
  }

  private validatePaymentForm(form: PaymentForm): string {
    if (!form.date) {
      return 'Date is required.';
    }

    if (!form.category.trim()) {
      return 'Category is required.';
    }

    if (!form.description.trim()) {
      return 'Description is required.';
    }

    if (form.payment === null || Number.isNaN(Number(form.payment)) || Number(form.payment) <= 0) {
      return 'Payment must be greater than 0.';
    }

    if (!form.currency.trim()) {
      return 'Currency is required.';
    }

    return '';
  }

  private mapCashBoxToForm(cashbox: CashBoxRecord): PaymentForm {
    return {
      type: cashbox.cashBoxType,
      date: this.toDateInputValue(cashbox.cashBoxEntryDate),
      category: cashbox.cashBoxCategory,
      description: cashbox.cashBoxDescription,
      payment: Number(cashbox.cashBoxPayment),
      paymentType: (cashbox.cashBoxPaymentType as CashBoxPaymentType) || 'CASH',
      currency: cashbox.cashBoxCurrency.toLowerCase(),
    };
  }

  private getDefaultPaymentForm(): PaymentForm {
    const today = new Date().toISOString().slice(0, 10);

    return {
      type: 'CASH_IN',
      date: today,
      category: '',
      description: '',
      payment: null,
      paymentType: 'CASH',
      currency: 'usd',
    };
  }

  private toDateInputValue(dateValue: string): string {
    if (!dateValue) {
      return '';
    }

    return dateValue.slice(0, 10);
  }

  private toPaymentNumber(value: string | number): number {
    const normalized = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(normalized) ? normalized : 0;
  }

  private getCurrentUserId(): string | null {
    const token = this.authStateService.getSession()?.token;
    if (!token) {
      return null;
    }

    const payload = this.decodeJwtPayload(token);
    if (!payload) {
      return null;
    }

    const candidateKeys = ['userId', 'id', 'sub', 'uid'];
    for (const key of candidateKeys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return null;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    if (typeof atob !== 'function') {
      return null;
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return null;
    }

    try {
      const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(paddedBase64);
      const parsed = JSON.parse(json) as Record<string, unknown>;
      return parsed;
    } catch {
      return null;
    }
  }
}

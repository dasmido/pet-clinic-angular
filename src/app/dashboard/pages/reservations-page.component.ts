import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Appointment,
  AppointmentApiService,
  AppointmentCurrency,
  AppointmentPaymentType,
  AppointmentStage,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from '../../services/appointment-api.service';
import { DoctorAvailabilityApiService, DoctorAvailabilityRecord } from '../../services/doctor-availability-api.service';
import { Patient, PatientApiService } from '../../services/patient-api.service';
import { User, UserApiService } from '../../services/user-api.service';

interface ReservationSearchCriteria {
  patientId: string;
  doctorId: string;
  stage: '' | AppointmentStage;
  paymentType: '' | AppointmentPaymentType;
  currency: '' | AppointmentCurrency;
}

interface NewReservationForm {
  patientId: string;
  doctorId: string;
  doctorsTimeReservationId: string;
  appointmentDate: string;
  stage: AppointmentStage;
  payment: number;
  paymentType: AppointmentPaymentType;
  currency: AppointmentCurrency;
}

interface EditReservationForm {
  id: string;
  stage: AppointmentStage;
  doctorTreatment: string;
  receptionNote: string;
}

@Component({
  selector: 'app-reservations-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservations-page.component.html',
  styleUrls: ['./reservations-page.component.css'],
})
export class ReservationsPageComponent implements OnInit {
  constructor(
    private readonly appointmentApiService: AppointmentApiService,
    private readonly patientApiService: PatientApiService,
    private readonly userApiService: UserApiService,
    private readonly doctorAvailabilityApiService: DoctorAvailabilityApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {}

  readonly availableStages: AppointmentStage[] = ['DOCTOR_STAGE', 'RECEPTION_STAGE', 'LAB_STAGE'];
  readonly availablePaymentTypes: AppointmentPaymentType[] = ['CASH', 'CARD', 'BANK_TRANSFER'];
  readonly availableCurrencies: AppointmentCurrency[] = ['USD', 'EUR', 'SYP', 'AED'];

  appointments: Appointment[] = [];
  patients: Patient[] = [];
  doctors: User[] = [];
  doctorAvailabilities: DoctorAvailabilityRecord[] = [];
  currentPage = 1;
  perPage = 5;
  totalAppointments = 0;

  isLoading = false;
  isCreating = false;
  isUpdating = false;
  isDeleting = false;
  isLoadingPatients = false;
  isLoadingDoctors = false;
  isLoadingDoctorAvailabilities = false;

  errorMessage = '';
  createErrorMessage = '';
  updateErrorMessage = '';

  quickSearch = '';

  searchCriteria: ReservationSearchCriteria = {
    patientId: '',
    doctorId: '',
    stage: '',
    paymentType: '',
    currency: '',
  };

  isAdvancedSearchOpen = false;
  isAddDialogOpen = false;
  isEditDialogOpen = false;
  isDeleteDialogOpen = false;
  isDetailsDialogOpen = false;

  selectedAppointment: Appointment | null = null;
  pendingDeleteAppointment: Appointment | null = null;

  newReservationForm: NewReservationForm = this.getDefaultNewReservationForm();
  editReservationForm: EditReservationForm = this.getDefaultEditReservationForm();

  ngOnInit(): void {
    this.loadPatients();
    this.loadDoctors();
    this.loadDoctorAvailabilities();
    this.loadAppointments();
  }

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    if (this.isAddDialogOpen) {
      this.closeAddDialog();
      return;
    }

    if (this.isEditDialogOpen) {
      this.closeEditDialog();
      return;
    }

    if (this.isAdvancedSearchOpen) {
      this.closeAdvancedSearchDialog();
      return;
    }

    if (this.isDeleteDialogOpen) {
      this.closeDeleteDialog();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalAppointments / this.perPage);
  }

  get filteredAppointments(): Appointment[] {
    return this.appointments.filter((appointment) => {
      const matchesQuickSearch = this.matchesValue(this.getAppointmentPatientLabel(appointment), this.quickSearch)
        || this.matchesValue(this.getAppointmentDoctorLabel(appointment), this.quickSearch)
        || this.matchesValue(this.getAppointmentAvailabilityLabel(appointment), this.quickSearch)
        || this.matchesValue(this.getAppointmentStageLabel(appointment), this.quickSearch)
        || this.matchesValue(appointment.paymentType, this.quickSearch)
        || this.matchesValue(appointment.currency, this.quickSearch);

      const matchesPatientId = this.matchesValue(appointment.patient?.id ?? appointment.patientId, this.searchCriteria.patientId);
      const matchesDoctorId = this.matchesValue(appointment.doctor?.id ?? appointment.doctorId, this.searchCriteria.doctorId);
      const matchesStage = this.searchCriteria.stage === '' || this.matchesAppointmentStage(appointment.stage, this.searchCriteria.stage);
      const matchesPaymentType = this.searchCriteria.paymentType === '' || appointment.paymentType === this.searchCriteria.paymentType;
      const matchesCurrency = this.searchCriteria.currency === '' || appointment.currency === this.searchCriteria.currency;

      return matchesQuickSearch
        && matchesPatientId
        && matchesDoctorId
        && matchesStage
        && matchesPaymentType
        && matchesCurrency;
    });
  }

  get filteredDoctorAvailabilitiesForSelectedDoctor(): DoctorAvailabilityRecord[] {
    const doctorId = this.newReservationForm.doctorId;
    if (!doctorId) {
      return this.doctorAvailabilities;
    }

    return this.doctorAvailabilities.filter((availability) => availability.userId === doctorId);
  }

  get isLookupLoading(): boolean {
    return this.isLoadingPatients || this.isLoadingDoctors || this.isLoadingDoctorAvailabilities;
  }

  loadPatients(): void {
    this.isLoadingPatients = true;

    this.patientApiService.getPatientsList(1, 200).subscribe({
      next: (response) => {
        this.patients = response.data.data;
        this.isLoadingPatients = false;
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        console.error('Error loading patients lookup:', error);
        this.isLoadingPatients = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadDoctors(): void {
    this.isLoadingDoctors = true;

    this.userApiService.getUsersList(1, 200).subscribe({
      next: (response) => {
        this.doctors = response.data.data.filter((user) => user.role === 'DOCTOR');
        this.isLoadingDoctors = false;
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        console.error('Error loading doctors lookup:', error);
        this.isLoadingDoctors = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadDoctorAvailabilities(): void {
    this.isLoadingDoctorAvailabilities = true;

    this.doctorAvailabilityApiService.getAvailabilityList(1, 200).subscribe({
      next: (response) => {
        this.doctorAvailabilities = response.data.data;
        this.isLoadingDoctorAvailabilities = false;
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        console.error('Error loading doctor availability lookup:', error);
        this.isLoadingDoctorAvailabilities = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadAppointments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.appointmentApiService.getAppointmentsList(this.currentPage, this.perPage).subscribe({
      next: (response) => {
        const pagination = response.data.pagination;
        this.appointments = response.data.data;
        this.totalAppointments = pagination.total;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        console.error('Error loading appointments:', error);
        this.errorMessage = 'Failed to load appointments. Please try again.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadAppointments();
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

  openAdvancedSearchDialog(): void {
    this.isAdvancedSearchOpen = true;
  }

  closeAdvancedSearchDialog(): void {
    this.isAdvancedSearchOpen = false;
  }

  applyAdvancedSearch(): void {
    this.isAdvancedSearchOpen = false;
  }

  clearAdvancedSearch(): void {
    this.searchCriteria = {
      patientId: '',
      doctorId: '',
      stage: '',
      paymentType: '',
      currency: '',
    };
  }

  openAddDialog(): void {
    this.newReservationForm = this.getDefaultNewReservationForm();
    this.createErrorMessage = '';
    this.isAddDialogOpen = true;
  }

  onDoctorSelectionChange(): void {
    const selectedDoctorId = this.newReservationForm.doctorId;
    const selectedAvailabilityId = this.newReservationForm.doctorsTimeReservationId;

    if (!selectedAvailabilityId) {
      return;
    }

    const availability = this.doctorAvailabilities.find((item) => item.id === selectedAvailabilityId);
    if (!availability || availability.userId !== selectedDoctorId) {
      this.newReservationForm = {
        ...this.newReservationForm,
        doctorsTimeReservationId: '',
      };
    }
  }

  closeAddDialog(): void {
    if (this.isCreating) {
      return;
    }

    this.isAddDialogOpen = false;
  }

  createReservation(): void {
    if (this.isCreating) {
      return;
    }

    const payload: CreateAppointmentPayload = {
      patientId: this.newReservationForm.patientId.trim(),
      doctorId: this.newReservationForm.doctorId.trim(),
      doctorsTimeReservationId: this.newReservationForm.doctorsTimeReservationId.trim(),
      appointmentDate: this.newReservationForm.appointmentDate,
      stage: this.newReservationForm.stage,
      payment: Number(this.newReservationForm.payment),
      paymentType: this.newReservationForm.paymentType,
      currency: this.newReservationForm.currency,
    };

    if (!payload.patientId || !payload.doctorId || !payload.doctorsTimeReservationId || !payload.appointmentDate) {
      this.createErrorMessage = 'Patient, doctor, time reservation, and appointment date are required.';
      return;
    }

    if (Number.isNaN(payload.payment) || payload.payment < 0) {
      this.createErrorMessage = 'Payment must be a valid non-negative number.';
      return;
    }

    this.isCreating = true;
    this.createErrorMessage = '';

    this.appointmentApiService.createAppointment(payload).subscribe({
      next: () => {
        this.isCreating = false;
        this.isAddDialogOpen = false;
        this.loadAppointments();
      },
      error: (error: unknown) => {
        console.error('Error creating appointment:', error);
        this.isCreating = false;
        this.createErrorMessage = this.extractErrorMessage(error, 'Failed to create reservation. Please try again.');
      },
    });
  }

  openEditDialog(appointment: Appointment): void {
    this.isDetailsDialogOpen = false; // Hide details without clearing selectedAppointment
    this.selectedAppointment = appointment;
    this.editReservationForm = {
      id: appointment.id,
      stage: this.normalizeStage(appointment.stage),
      doctorTreatment: appointment.doctorTreatment ?? '',
      receptionNote: appointment.receptionNote ?? '',
    };
    this.updateErrorMessage = '';
    this.isEditDialogOpen = true;
  }

  closeEditDialog(): void {
    if (this.isUpdating) {
      return;
    }

    this.isEditDialogOpen = false;

    // Return to details dialog if we came from there
    if (this.selectedAppointment) {
      this.isDetailsDialogOpen = true;
    }
  }

  updateReservation(): void {
    if (this.isUpdating) {
      return;
    }

    const payload: UpdateAppointmentPayload = {
      id: this.editReservationForm.id,
      stage: this.editReservationForm.stage,
      doctorTreatment: this.editReservationForm.doctorTreatment.trim(),
      receptionNote: this.editReservationForm.receptionNote.trim(),
    };

    if (!payload.id) {
      this.updateErrorMessage = 'Appointment id is required for update.';
      return;
    }

    this.isUpdating = true;
    this.updateErrorMessage = '';

    this.appointmentApiService.updateAppointment(payload).subscribe({
      next: () => {
        this.isUpdating = false;
        this.isEditDialogOpen = false;
        this.selectedAppointment = null;
        this.loadAppointments();
      },
      error: (error: unknown) => {
        console.error('Error updating appointment:', error);
        this.isUpdating = false;
        this.updateErrorMessage = this.extractErrorMessage(error, 'Failed to update reservation. Please try again.');
      },
    });
  }

  openDeleteDialog(appointment: Appointment): void {
    this.isDetailsDialogOpen = false; // Hide details without clearing selectedAppointment
    if (this.isDeleting || this.isLoading) {
      return;
    }

    this.pendingDeleteAppointment = appointment;
    this.isDeleteDialogOpen = true;
  }

  closeDeleteDialog(): void {
    if (this.isDeleting) {
      return;
    }

    this.isDeleteDialogOpen = false;
    this.pendingDeleteAppointment = null;

    // Return to details dialog if we came from there
    if (this.selectedAppointment) {
      this.isDetailsDialogOpen = true;
    }
  }

  confirmDeleteReservation(): void {
    const appointment = this.pendingDeleteAppointment;

    if (!appointment || this.isDeleting || this.isLoading) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';

    this.appointmentApiService.deleteAppointment(appointment.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.isDeleteDialogOpen = false;
        this.pendingDeleteAppointment = null;

        const remainingInPage = this.appointments.length - 1;
        if (remainingInPage <= 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }

        this.loadAppointments();
      },
      error: (error: unknown) => {
        console.error('Error deleting appointment:', error);
        this.isDeleting = false;
        this.errorMessage = this.extractErrorMessage(error, 'Failed to delete reservation. Please try again.');
      },
    });
  }

  get deleteDialogMessage(): string {
    if (!this.pendingDeleteAppointment) {
      return 'Are you sure you want to delete this reservation? This action cannot be undone.';
    }

    return `Delete reservation ${this.pendingDeleteAppointment.id}? This action cannot be undone.`;
  }

  getPatientDisplayName(patientId: string): string {
    const patient = this.patients.find((item) => item.id === patientId);
    if (!patient) {
      return patientId;
    }

    return `${patient.fullname} (${patient.cardNo})`;
  }

  getDoctorDisplayName(doctorId: string): string {
    const doctor = this.doctors.find((item) => item.id === doctorId);
    if (!doctor) {
      return doctorId;
    }

    return `${doctor.fullname} (${doctor.username})`;
  }

  getAvailabilityDisplayText(availabilityId: string): string {
    const availability = this.doctorAvailabilities.find((item) => item.id === availabilityId);
    if (!availability) {
      return availabilityId;
    }

    const doctorName = this.getDoctorDisplayName(availability.userId);
    const days = availability.reservationDays.join(', ');
    const timeWindow = `${availability.startTime.slice(0, 5)} - ${availability.endTime.slice(0, 5)}`;

    return `${doctorName} | ${days} | ${timeWindow}`;
  }

  getAppointmentPatientLabel(appointment: Appointment): string {
    if (appointment.patient?.fullname) {
      const cardSuffix = appointment.patient.cardNo ? ` (${appointment.patient.cardNo})` : '';
      return `${appointment.patient.fullname}${cardSuffix}`;
    }

    if (appointment.patientId) {
      return this.getPatientDisplayName(appointment.patientId);
    }

    return '-';
  }

  getAppointmentDoctorLabel(appointment: Appointment): string {
    if (appointment.doctor?.fullname) {
      const phoneSuffix = appointment.doctor.phone ? ` (${appointment.doctor.phone})` : '';
      return `${appointment.doctor.fullname}${phoneSuffix}`;
    }

    if (appointment.doctorId) {
      return this.getDoctorDisplayName(appointment.doctorId);
    }

    return '-';
  }

  getAppointmentAvailabilityLabel(appointment: Appointment): string {
    const reservation = appointment.doctorsTimeReservation;

    if (reservation) {
      const days = reservation.reservationDays.join(', ');
      const timeWindow = `${reservation.startTime.slice(0, 5)} - ${reservation.endTime.slice(0, 5)}`;
      return `${days} | ${timeWindow}`;
    }

    if (appointment.doctorsTimeReservationId) {
      return this.getAvailabilityDisplayText(appointment.doctorsTimeReservationId);
    }

    return '-';
  }

  getAppointmentStageLabel(appointment: Appointment): string {
    if (Array.isArray(appointment.stage)) {
      return appointment.stage.length > 0 ? appointment.stage.join(', ') : '-';
    }

    return appointment.stage || '-';
  }

  private getDefaultNewReservationForm(): NewReservationForm {
    return {
      patientId: '',
      doctorId: '',
      doctorsTimeReservationId: '',
      appointmentDate: '',
      stage: 'DOCTOR_STAGE',
      payment: 0,
      paymentType: 'CASH',
      currency: 'USD',
    };
  }

  private getDefaultEditReservationForm(): EditReservationForm {
    return {
      id: '',
      stage: 'DOCTOR_STAGE',
      doctorTreatment: '',
      receptionNote: '',
    };
  }

  private normalizeStage(stage: string | string[]): AppointmentStage {
    const resolvedStage = Array.isArray(stage) ? stage[0] : stage;

    if (resolvedStage === 'RECEPTION_STAGE' || resolvedStage === 'LAB_STAGE') {
      return resolvedStage;
    }

    return 'DOCTOR_STAGE';
  }

  private matchesAppointmentStage(stage: string | string[], target: AppointmentStage): boolean {
    if (Array.isArray(stage)) {
      return stage.includes(target);
    }

    return stage === target;
  }

  private matchesValue(value: unknown, query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    if (value === null || value === undefined) {
      return false;
    }

    return String(value).toLowerCase().includes(normalizedQuery);
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (typeof error !== 'object' || error === null) {
      return fallback;
    }

    const maybeError = error as {
      error?: { message?: string; meta?: string };
      message?: string;
    };

    if (maybeError.error?.message) {
      return maybeError.error.message;
    }

    if (maybeError.error?.meta) {
      return maybeError.error.meta;
    }

    if (maybeError.message) {
      return maybeError.message;
    }

    return fallback;
  }

  openDetailsDialog(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.isDetailsDialogOpen = true;
  }

  closeDetailsDialog(): void {
    this.isDetailsDialogOpen = false;
    this.selectedAppointment = null;
  }

  trackById(index: number, item: Appointment): string {
    return item.id;
  }

  getStageClass(stage: string | string[]): string {
    const s = Array.isArray(stage) ? stage[0] : stage;
    if (s === 'RECEPTION_STAGE') return 'appt-stage-badge--reception';
    if (s === 'LAB_STAGE') return 'appt-stage-badge--lab';
    return 'appt-stage-badge--doctor';
  }

  getStageDisplay(stage: string | string[] | undefined): string {
    if (!stage) return 'N/A';
    return Array.isArray(stage) ? stage.join(', ') : stage;
  }
}

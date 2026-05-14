import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faCircleInfo,
  faPenToSquare,
  faPlus,
  faRotateRight,
  faTrashCan,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import {
  DoctorAvailabilityApiService,
  DoctorAvailabilityRecord,
  ReservationDay,
} from '../../services/doctor-availability-api.service';
import { UserApiService, User } from '../../services/user-api.service';

interface AvailabilityForm {
  id?: string;
  userId: string;
  reservationDays: ReservationDay[];
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-doctor-availability-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './doctor-availability-page.component.html',
  styleUrls: ['./doctor-availability-page.component.css'],
})
export class DoctorAvailabilityPageComponent implements OnInit {
  readonly faPlus = faPlus;
  readonly faRotateRight = faRotateRight;
  readonly faCircleInfo = faCircleInfo;
  readonly faPenToSquare = faPenToSquare;
  readonly faTrashCan = faTrashCan;
  readonly faXmark = faXmark;
  readonly faChevronLeft = faChevronLeft;
  readonly faChevronRight = faChevronRight;

  constructor(
    private availabilityApi: DoctorAvailabilityApiService,
    private userApi: UserApiService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  readonly metrics = [
    { label: 'On duty', value: '8', delta: '+1' },
    { label: 'Busy slots', value: '5', delta: '+2' },
    { label: 'Open hours', value: '12', delta: 'stable' },
  ];

  readonly dayOptions: ReservationDay[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];

  users: User[] = [];
  availabilities: DoctorAvailabilityRecord[] = [];
  currentPage = 1;
  perPage = 10;
  totalAvailability = 0;
  isLoading = false;
  isCreating = false;
  isUpdating = false;
  isDeleting = false;
  errorMessage = '';
  quickSearch = '';

  isAddDialogOpen = false;
  isDetailsDialogOpen = false;
  isEditDialogOpen = false;
  deleteConfirmationId: string | null = null;
  selectedAvailability: DoctorAvailabilityRecord | null = null;

  createForm: AvailabilityForm = this.getDefaultForm();
  editForm: AvailabilityForm = this.getDefaultForm();

  ngOnInit(): void {
    this.loadUsers();
    this.loadAvailability();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
      return;
    }

    if (this.isEditDialogOpen) {
      this.closeEditDialog();
      return;
    }

    if (this.isDetailsDialogOpen) {
      this.closeDetailsDialog();
      return;
    }

    if (this.isAddDialogOpen) {
      this.closeAddDialog();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalAvailability / this.perPage);
  }

  get filteredAvailabilities(): DoctorAvailabilityRecord[] {
    if (!this.quickSearch.trim()) {
      return this.availabilities;
    }

    const search = this.quickSearch.trim().toLowerCase();
    return this.availabilities.filter((item) => {
      const userName = this.getUserName(item.userId).toLowerCase();
      const days = item.reservationDays.join(' ').toLowerCase();
      return (
        userName.includes(search)
        || item.userId.toLowerCase().includes(search)
        || days.includes(search)
        || item.startTime.toLowerCase().includes(search)
        || item.endTime.toLowerCase().includes(search)
      );
    });
  }

  getUserName(userId: string): string {
    const user = this.users.find((u) => u.id === userId);
    return user ? user.fullname : 'Unknown';
  }

  loadUsers(): void {
    this.userApi.getUsersList(1, 100).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          this.users = response.data.data;
          this.cdr.markForCheck();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading users:', error);
          this.cdr.markForCheck();
        });
      },
    });
  }

  loadAvailability(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.availabilityApi.getAvailabilityList(this.currentPage, this.perPage).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          this.availabilities = response.data.data;
          this.totalAvailability = response.data.pagination.total;
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading doctor availability:', error);
          this.errorMessage = 'Failed to load doctor availability records.';
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  openAddDialog(): void {
    this.createForm = this.getDefaultForm();
    this.isAddDialogOpen = true;
    this.errorMessage = '';
  }

  closeAddDialog(): void {
    this.isAddDialogOpen = false;
  }

  openDetailsDialog(record: DoctorAvailabilityRecord): void {
    this.selectedAvailability = record;
    this.deleteConfirmationId = null;
    this.isDetailsDialogOpen = true;
    this.errorMessage = '';
  }

  closeDetailsDialog(): void {
    this.isDetailsDialogOpen = false;
    this.deleteConfirmationId = null;
    this.selectedAvailability = null;
  }

  openEditDialogFromDetails(): void {
    if (!this.selectedAvailability) {
      return;
    }
    const record = this.selectedAvailability;
    this.closeDetailsDialog();
    this.openEditDialog(record);
  }

  openEditDialog(record: DoctorAvailabilityRecord): void {
    this.editForm = {
      id: record.id,
      userId: record.userId,
      reservationDays: [...record.reservationDays],
      startTime: this.toInputTime(record.startTime),
      endTime: this.toInputTime(record.endTime),
    };
    this.isEditDialogOpen = true;
    this.errorMessage = '';
  }

  closeEditDialog(): void {
    this.isEditDialogOpen = false;
  }

  createAvailability(): void {
    const userId = this.createForm.userId.trim();
    if (!userId) {
      this.errorMessage = 'Please select a doctor.';
      return;
    }
    if (this.createForm.reservationDays.length === 0) {
      this.errorMessage = 'Please choose at least one reservation day.';
      return;
    }
    if (!this.createForm.startTime || !this.createForm.endTime) {
      this.errorMessage = 'Start and end time are required.';
      return;
    }

    this.isCreating = true;
    this.errorMessage = '';

    this.availabilityApi.createAvailability({
      userId,
      reservationDays: this.createForm.reservationDays,
      startTime: this.normalizeTime(this.createForm.startTime),
      endTime: this.normalizeTime(this.createForm.endTime),
    }).subscribe({
      next: () => {
        this.isAddDialogOpen = false;
        this.isCreating = false;
        this.loadAvailability();
      },
      error: (error) => {
        console.error('Error creating doctor availability:', error);
        this.errorMessage = this.extractApiError(error, 'Failed to create doctor availability.');
        this.isCreating = false;
      },
    });
  }

  updateAvailability(): void {
    const id = this.editForm.id;
    const userId = this.editForm.userId.trim();

    if (!id) {
      this.errorMessage = 'Invalid availability record.';
      return;
    }
    if (!userId) {
      this.errorMessage = 'Please select a doctor.';
      return;
    }
    if (this.editForm.reservationDays.length === 0) {
      this.errorMessage = 'Please choose at least one reservation day.';
      return;
    }
    if (!this.editForm.startTime || !this.editForm.endTime) {
      this.errorMessage = 'Start and end time are required.';
      return;
    }

    this.isUpdating = true;
    this.errorMessage = '';

    this.availabilityApi.updateAvailability({
      id,
      userId,
      reservationDays: this.editForm.reservationDays,
      startTime: this.normalizeTime(this.editForm.startTime),
      endTime: this.normalizeTime(this.editForm.endTime),
    }).subscribe({
      next: () => {
        this.isEditDialogOpen = false;
        this.isUpdating = false;
        this.loadAvailability();
      },
      error: (error) => {
        console.error('Error updating doctor availability:', error);
        this.errorMessage = this.extractApiError(error, 'Failed to update doctor availability.');
        this.isUpdating = false;
      },
    });
  }

  showDeleteConfirmation(id: string): void {
    this.deleteConfirmationId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmationId = null;
  }

  deleteAvailability(id: string): void {
    this.isDeleting = true;
    this.errorMessage = '';

    this.availabilityApi.deleteAvailability(id).subscribe({
      next: () => {
        this.deleteConfirmationId = null;
        this.isDetailsDialogOpen = false;
        this.selectedAvailability = null;
        this.isDeleting = false;
        this.loadAvailability();
      },
      error: (error) => {
        console.error('Error deleting doctor availability:', error);
        this.errorMessage = this.extractApiError(error, 'Failed to delete doctor availability.');
        this.isDeleting = false;
      },
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadAvailability();
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

  toggleCreateDay(day: ReservationDay): void {
    this.createForm = {
      ...this.createForm,
      reservationDays: this.toggleDaySelection(this.createForm.reservationDays, day),
    };
  }

  toggleEditDay(day: ReservationDay): void {
    this.editForm = {
      ...this.editForm,
      reservationDays: this.toggleDaySelection(this.editForm.reservationDays, day),
    };
  }

  isCreateDaySelected(day: ReservationDay): boolean {
    return this.createForm.reservationDays.includes(day);
  }

  isEditDaySelected(day: ReservationDay): boolean {
    return this.editForm.reservationDays.includes(day);
  }

  trackByAvailabilityId(_: number, record: DoctorAvailabilityRecord): string {
    return record.id;
  }

  private toggleDaySelection(days: ReservationDay[], day: ReservationDay): ReservationDay[] {
    return days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day];
  }

  private normalizeTime(value: string): string {
    return value.length === 5 ? `${value}:00` : value;
  }

  private toInputTime(value: string): string {
    return value?.slice(0, 5) ?? '';
  }

  private extractApiError(error: unknown, fallback: string): string {
    const apiError = error as { error?: { message?: string; meta?: string }; message?: string };
    if (apiError?.error?.meta) {
      return `Error: ${apiError.error.meta}`;
    }
    if (apiError?.error?.message) {
      return apiError.error.message;
    }
    if (apiError?.message) {
      return apiError.message;
    }
    return fallback;
  }

  private getDefaultForm(): AvailabilityForm {
    return {
      userId: '',
      reservationDays: [],
      startTime: '',
      endTime: '',
    };
  }
}

import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PatientApiService, Patient, CreatePatientPayload } from '../../services/patient-api.service';
import { ChronicDiseaseApiService, ChronicDiseaseRecord } from '../../services/chronic-disease-api.service';

type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
type Gender = 'MALE' | 'FEMALE';

type PatientRecord = Patient;

interface SearchCriteria {
  fullname: string;
  cardNo: string;
  gender: '' | Gender;
  maritalStatus: '' | MaritalStatus;
}

interface NewPatientForm {
  cardNo: string;
  fullname: string;
  birthDate: string;
  maritalStatus: MaritalStatus;
  gender: Gender;
  emergencyContact: string;
  emergencyPhone: string;
  emergencyRelation: string;
  allergies: string;
}

interface NewPatientChronicDiseaseForm {
  diseaseName: string;
  diseaseDescription: string;
}

@Component({
  selector: 'app-patients-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients-page.component.html',
  styleUrl: './patients-page.component.css',
})
export class PatientsPageComponent implements OnInit {
  constructor(
    private patientApiService: PatientApiService,
    private chronicDiseaseApiService: ChronicDiseaseApiService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  readonly metrics = [
    { label: 'Active patients', value: '128', delta: '+14%' },
    { label: 'Waiting now', value: '19', delta: '-3' },
    { label: 'Follow-ups', value: '42', delta: '+6' },
  ];

  // Pagination state
  patients: PatientRecord[] = [];
  currentPage = 1;
  perPage = 7;
  totalPatients = 0;
  isLoading = false;
  isCreating = false;
  errorMessage = '';

  quickSearch = '';

  searchCriteria: SearchCriteria = {
    fullname: '',
    cardNo: '',
    gender: '',
    maritalStatus: '',
  };

  newPatientForm: NewPatientForm = this.getDefaultNewPatientForm();
  newPatientChronicDiseases: NewPatientChronicDiseaseForm[] = [];

  isAdvancedSearchOpen = false;
  isDetailsDialogOpen = false;
  isAddDialogOpen = false;

  selectedPatient: PatientRecord | null = null;
  selectedPatientChronicDiseases: ChronicDiseaseRecord[] = [];
  isDetailsChronicLoading = false;
  detailsChronicError = '';

  ngOnInit(): void {
    this.loadPatients();
  }

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    if (this.isAddDialogOpen) {
      this.closeAddDialog();
      return;
    }

    if (this.isDetailsDialogOpen) {
      this.closeDetailsDialog();
      return;
    }

    if (this.isAdvancedSearchOpen) {
      this.closeAdvancedSearchDialog();
    }
  }

  loadPatients(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.patientApiService.getPatientsList(this.currentPage, this.perPage).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          this.patients = response.data.data;
          this.totalPatients = response.data.pagination.total;
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading patients:', error);
          this.errorMessage = 'Failed to load patients. Please try again.';
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      }
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= Math.ceil(this.totalPatients / this.perPage)) {
      this.currentPage = page;
      this.loadPatients();
    }
  }

  nextPage(): void {
    const maxPage = Math.ceil(this.totalPatients / this.perPage);
    if (this.currentPage < maxPage) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalPatients / this.perPage);
  }

  get filteredPatients(): PatientRecord[] {
    return this.patients.filter((patient) => {
      const matchesQuickSearch = this.matchesValue(patient.fullname, this.quickSearch)
        || this.matchesValue(patient.cardNo, this.quickSearch)
        || this.matchesValue(patient.emergencyPhone, this.quickSearch);

      const matchesFullname = this.matchesValue(patient.fullname, this.searchCriteria.fullname);
      const matchesCardNo = this.matchesValue(patient.cardNo, this.searchCriteria.cardNo);
      const matchesGender = this.searchCriteria.gender === '' || patient.gender === this.searchCriteria.gender;
      const matchesMaritalStatus = this.searchCriteria.maritalStatus === '' || patient.maritalStatus === this.searchCriteria.maritalStatus;

      return matchesQuickSearch && matchesFullname && matchesCardNo && matchesGender && matchesMaritalStatus;
    });
  }

  openAdvancedSearchDialog(): void {
    this.isAdvancedSearchOpen = true;
  }

  closeAdvancedSearchDialog(): void {
    this.isAdvancedSearchOpen = false;
  }

  openDetailsDialog(patient: PatientRecord): void {
    this.selectedPatient = patient;
    this.isDetailsDialogOpen = true;
    this.loadPatientChronicDiseases(patient.id);
  }

  closeDetailsDialog(): void {
    this.isDetailsDialogOpen = false;
    this.selectedPatient = null;
    this.selectedPatientChronicDiseases = [];
    this.isDetailsChronicLoading = false;
    this.detailsChronicError = '';
  }

  private loadPatientChronicDiseases(patientId: string): void {
    this.isDetailsChronicLoading = true;
    this.detailsChronicError = '';
    this.selectedPatientChronicDiseases = [];

    this.chronicDiseaseApiService.findByPatientId(patientId).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          this.selectedPatientChronicDiseases = response.data ?? [];
          this.isDetailsChronicLoading = false;
          this.cdr.markForCheck();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading patient chronic diseases:', error);
          this.detailsChronicError = 'Failed to load chronic diseases for this patient.';
          this.isDetailsChronicLoading = false;
          this.cdr.markForCheck();
        });
      }
    });
  }

  openAddDialog(): void {
    this.newPatientForm = this.getDefaultNewPatientForm();
    this.newPatientChronicDiseases = [this.getDefaultNewPatientChronicDiseaseForm()];
    this.isAddDialogOpen = true;
    this.errorMessage = '';
  }

  closeAddDialog(): void {
    this.isAddDialogOpen = false;
  }

  applyAdvancedSearch(): void {
    this.isAdvancedSearchOpen = false;
  }

  clearAdvancedSearch(): void {
    this.searchCriteria = {
      fullname: '',
      cardNo: '',
      gender: '',
      maritalStatus: '',
    };
  }

  createPatient(): void {
    const trimmedName = this.newPatientForm.fullname.trim();
    const trimmedCardNo = this.newPatientForm.cardNo.trim();

    if (!trimmedName || !trimmedCardNo) {
      this.errorMessage = 'Full name and card number are required.';
      return;
    }

    const chronicDiseases = this.newPatientChronicDiseases
      .map((disease) => ({
        diseaseName: disease.diseaseName.trim(),
        diseaseDescription: disease.diseaseDescription.trim(),
      }))
      .filter((disease) => disease.diseaseName);

    const payload: CreatePatientPayload = {
      cardNo: trimmedCardNo,
      fullname: trimmedName,
      birthDate: this.newPatientForm.birthDate,
      maritalStatus: this.newPatientForm.maritalStatus,
      gender: this.newPatientForm.gender,
      emergencyContact: this.newPatientForm.emergencyContact.trim(),
      emergencyPhone: this.newPatientForm.emergencyPhone.trim(),
      emergencyRelation: this.newPatientForm.emergencyRelation.trim(),
      allergies: this.newPatientForm.allergies.trim(),
      chronicDiseases: chronicDiseases.length > 0 ? chronicDiseases : undefined,
    };

    this.isCreating = true;
    this.errorMessage = '';

    this.patientApiService.createPatient(payload).subscribe({
      next: (response) => {
        this.isAddDialogOpen = false;
        this.isCreating = false;
        // Reload to get updated totals and keep pagination in sync
        this.loadPatients();
      },
      error: (error) => {
        console.error('Error creating patient:', error);

        // Extract specific error message from API response
        let errorMsg = 'Failed to create patient. Please try again.';

        if (error?.error?.meta) {
          if (error.error.meta.includes('unique_card_no_idx')) {
            errorMsg = `Card number "${trimmedCardNo}" already exists. Please use a different card number.`;
          } else {
            errorMsg = `Error: ${error.error.meta}`;
          }
        } else if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }

        this.errorMessage = errorMsg;
        this.isCreating = false;
      }
    });
  }

  addChronicDiseaseRow(): void {
    this.newPatientChronicDiseases = [
      ...this.newPatientChronicDiseases,
      this.getDefaultNewPatientChronicDiseaseForm(),
    ];
  }

  removeChronicDiseaseRow(index: number): void {
    this.newPatientChronicDiseases = this.newPatientChronicDiseases.filter((_, rowIndex) => rowIndex !== index);
  }

  private matchesValue(value: string, query: string): boolean {
    if (!query.trim()) {
      return true;
    }

    return value.toLowerCase().includes(query.trim().toLowerCase());
  }

  private getDefaultNewPatientForm(): NewPatientForm {
    return {
      cardNo: '',
      fullname: '',
      birthDate: '',
      maritalStatus: 'SINGLE',
      gender: 'MALE',
      emergencyContact: '',
      emergencyPhone: '',
      emergencyRelation: '',
      allergies: '',
    };
  }

  private getDefaultNewPatientChronicDiseaseForm(): NewPatientChronicDiseaseForm {
    return {
      diseaseName: '',
      diseaseDescription: '',
    };
  }
}

import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, OnInit, ChangeDetectorRef, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PatientApiService, Patient, CreatePatientPayload, UpdatePatientPayload } from '../../services/patient-api.service';
import { ChronicDiseaseApiService, ChronicDiseaseRecord, UpdateChronicDiseasePayload } from '../../services/chronic-disease-api.service';

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

interface EditPatientForm {
  id: string;
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

interface EditChronicDiseaseForm {
  id: string;
  diseaseName: string;
  diseaseDescription: string;
}

interface AddChronicDiseaseForm {
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
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: object
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
  isEditPatientDialogOpen = false;

  selectedPatient: PatientRecord | null = null;
  selectedPatientChronicDiseases: ChronicDiseaseRecord[] = [];
  isDetailsChronicLoading = false;
  detailsChronicError = '';

  // Patient delete
  showDeletePatientConfirm = false;
  isDeletingPatient = false;
  deletePatientError = '';

  // Patient edit
  editPatientForm: EditPatientForm = this.getDefaultEditPatientForm();
  isUpdatingPatient = false;
  editPatientError = '';

  // Chronic disease inline edit
  editingChronicDiseaseId: string | null = null;
  editChronicDiseaseForm: EditChronicDiseaseForm = { id: '', diseaseName: '', diseaseDescription: '' };
  isUpdatingChronicDisease = false;
  chronicDiseaseEditError = '';

  // Chronic disease delete
  deletingChronicDiseaseId: string | null = null;

  // Add chronic disease
  isAddingChronicDisease = false;
  addChronicDiseaseForm: AddChronicDiseaseForm = { diseaseName: '', diseaseDescription: '' };
  isCreatingChronicDisease = false;
  addChronicDiseaseError = '';

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadPatients();
    }
  }

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    if (this.isEditPatientDialogOpen) {
      this.closeEditPatientDialog();
      return;
    }

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
    this.showDeletePatientConfirm = false;
    this.deletePatientError = '';
    this.editingChronicDiseaseId = null;
    this.deletingChronicDiseaseId = null;
    this.isAddingChronicDisease = false;
  }

  openEditPatientDialog(): void {
    if (!this.selectedPatient) return;
    this.editPatientForm = {
      id: this.selectedPatient.id,
      cardNo: this.selectedPatient.cardNo,
      fullname: this.selectedPatient.fullname,
      birthDate: this.selectedPatient.birthDate,
      maritalStatus: this.selectedPatient.maritalStatus as MaritalStatus,
      gender: this.selectedPatient.gender as Gender,
      emergencyContact: this.selectedPatient.emergencyContact,
      emergencyPhone: this.selectedPatient.emergencyPhone,
      emergencyRelation: this.selectedPatient.emergencyRelation,
      allergies: this.selectedPatient.allergies,
    };
    this.editPatientError = '';
    this.isDetailsDialogOpen = false;
    this.isEditPatientDialogOpen = true;
  }

  closeEditPatientDialog(): void {
    if (this.isUpdatingPatient) return;
    this.isEditPatientDialogOpen = false;
    if (this.selectedPatient) {
      this.isDetailsDialogOpen = true;
    }
  }

  updatePatient(): void {
    if (this.isUpdatingPatient || !this.selectedPatient) return;
    const payload: UpdatePatientPayload = {
      id: this.editPatientForm.id,
      cardNo: this.editPatientForm.cardNo.trim(),
      fullname: this.editPatientForm.fullname.trim(),
      birthDate: this.editPatientForm.birthDate,
      maritalStatus: this.editPatientForm.maritalStatus,
      gender: this.editPatientForm.gender,
      emergencyContact: this.editPatientForm.emergencyContact.trim(),
      emergencyPhone: this.editPatientForm.emergencyPhone.trim(),
      emergencyRelation: this.editPatientForm.emergencyRelation.trim(),
      allergies: this.editPatientForm.allergies.trim(),
    };
    if (!payload.cardNo || !payload.fullname) {
      this.editPatientError = 'Full name and card number are required.';
      return;
    }
    this.isUpdatingPatient = true;
    this.editPatientError = '';
    this.patientApiService.updatePatient(payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isUpdatingPatient = false;
          this.isEditPatientDialogOpen = false;
          this.loadPatients();
          if (this.selectedPatient) {
            this.isDetailsDialogOpen = true;
          }
          this.cdr.markForCheck();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          console.error('Error updating patient:', error);
          this.isUpdatingPatient = false;
          this.editPatientError = 'Failed to update patient. Please try again.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  showDeletePatient(): void {
    this.showDeletePatientConfirm = true;
    this.deletePatientError = '';
  }

  cancelDeletePatient(): void {
    this.showDeletePatientConfirm = false;
    this.deletePatientError = '';
  }

  confirmDeletePatient(): void {
    if (!this.selectedPatient || this.isDeletingPatient) return;
    this.isDeletingPatient = true;
    this.deletePatientError = '';
    this.patientApiService.deletePatient(this.selectedPatient.id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isDeletingPatient = false;
          this.closeDetailsDialog();
          this.loadPatients();
          this.cdr.markForCheck();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          console.error('Error deleting patient:', error);
          this.isDeletingPatient = false;
          this.deletePatientError = 'Failed to delete patient. Please try again.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  openEditChronicDisease(disease: ChronicDiseaseRecord): void {
    this.editingChronicDiseaseId = disease.id;
    this.editChronicDiseaseForm = {
      id: disease.id,
      diseaseName: disease.diseaseName,
      diseaseDescription: disease.diseaseDescription,
    };
    this.chronicDiseaseEditError = '';
  }

  cancelEditChronicDisease(): void {
    this.editingChronicDiseaseId = null;
    this.chronicDiseaseEditError = '';
  }

  saveEditChronicDisease(): void {
    if (!this.editingChronicDiseaseId || this.isUpdatingChronicDisease) return;
    const payload: UpdateChronicDiseasePayload = {
      id: this.editChronicDiseaseForm.id,
      diseaseName: this.editChronicDiseaseForm.diseaseName.trim(),
      diseaseDescription: this.editChronicDiseaseForm.diseaseDescription.trim(),
    };
    if (!payload.diseaseName) {
      this.chronicDiseaseEditError = 'Disease name is required.';
      return;
    }
    this.isUpdatingChronicDisease = true;
    this.chronicDiseaseApiService.updateChronicDisease(payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isUpdatingChronicDisease = false;
          this.editingChronicDiseaseId = null;
          if (this.selectedPatient) this.loadPatientChronicDiseases(this.selectedPatient.id);
          this.cdr.markForCheck();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          console.error('Error updating chronic disease:', error);
          this.isUpdatingChronicDisease = false;
          this.chronicDiseaseEditError = 'Failed to update. Please try again.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  confirmDeleteChronicDisease(id: string): void {
    this.deletingChronicDiseaseId = id;
  }

  cancelDeleteChronicDisease(): void {
    this.deletingChronicDiseaseId = null;
  }

  deleteChronicDisease(id: string): void {
    this.chronicDiseaseApiService.deleteChronicDisease(id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.deletingChronicDiseaseId = null;
          if (this.selectedPatient) this.loadPatientChronicDiseases(this.selectedPatient.id);
          this.cdr.markForCheck();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          console.error('Error deleting chronic disease:', error);
          this.cdr.markForCheck();
        });
      },
    });
  }

  toggleAddChronicDisease(): void {
    this.isAddingChronicDisease = !this.isAddingChronicDisease;
    this.addChronicDiseaseForm = { diseaseName: '', diseaseDescription: '' };
    this.addChronicDiseaseError = '';
  }

  submitAddChronicDisease(): void {
    if (!this.selectedPatient || this.isCreatingChronicDisease) return;
    const name = this.addChronicDiseaseForm.diseaseName.trim();
    if (!name) {
      this.addChronicDiseaseError = 'Disease name is required.';
      return;
    }
    this.isCreatingChronicDisease = true;
    this.addChronicDiseaseError = '';
    this.chronicDiseaseApiService.createChronicDisease({
      patientId: this.selectedPatient.id,
      diseaseName: name,
      diseaseDescription: this.addChronicDiseaseForm.diseaseDescription.trim(),
    }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isCreatingChronicDisease = false;
          this.isAddingChronicDisease = false;
          this.addChronicDiseaseForm = { diseaseName: '', diseaseDescription: '' };
          if (this.selectedPatient) this.loadPatientChronicDiseases(this.selectedPatient.id);
          this.cdr.markForCheck();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          console.error('Error adding chronic disease:', error);
          this.isCreatingChronicDisease = false;
          this.addChronicDiseaseError = 'Failed to add disease. Please try again.';
          this.cdr.markForCheck();
        });
      },
    });
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

  private getDefaultEditPatientForm(): EditPatientForm {
    return {
      id: '',
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

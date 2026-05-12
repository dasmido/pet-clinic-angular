import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChronicDiseaseApiService, ChronicDiseaseRecord } from '../../services/chronic-disease-api.service';
import { PatientApiService, Patient } from '../../services/patient-api.service';

interface NewChronicDiseaseForm {
  patientId: string;
  diseaseName: string;
  diseaseDescription: string;
}

interface FilterState {
  patientId: string;
  searchTerm: string;
}

@Component({
  selector: 'app-chronic-diseases-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chronic-diseases-page.component.html',
  styleUrl: './chronic-diseases-page.component.css',
})
export class ChronicDiseasesPageComponent implements OnInit {
  constructor(
    private chronicDiseaseApiService: ChronicDiseaseApiService,
    private patientApiService: PatientApiService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  readonly metrics = [
    { label: 'Total diseases', value: '342', delta: '+8%' },
    { label: 'Common cases', value: '89', delta: '+12' },
    { label: 'Monitoring', value: '156', delta: '-2' },
  ];

  // Pagination state
  chronicDiseases: ChronicDiseaseRecord[] = [];
  patients: Patient[] = [];
  currentPage = 1;
  perPage = 10;
  totalDiseases = 0;
  isLoading = false;
  isCreating = false;
  isDeleting = false;
  errorMessage = '';

  filter: FilterState = {
    patientId: '',
    searchTerm: '',
  };

  newDiseaseForm: NewChronicDiseaseForm = this.getDefaultNewDiseaseForm();

  isAddDialogOpen = false;
  isFilterDialogOpen = false;
  deleteConfirmationId: string | null = null;

  ngOnInit(): void {
    this.loadPatients();
    this.loadChronicDiseases();
  }

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    if (this.isAddDialogOpen) {
      this.closeAddDialog();
      return;
    }

    if (this.isFilterDialogOpen) {
      this.closeFilterDialog();
    }
  }

  loadPatients(): void {
    this.patientApiService.getPatientsList(1, 100).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          this.patients = response.data.data;
          this.cdr.markForCheck();
        });

      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading patients:', error);
          this.cdr.markForCheck();
        });
      }
    });
  }

  loadChronicDiseases(): void {
    this.isLoading = true;
    this.errorMessage = '';

    if (this.filter.patientId) {
      // Load diseases for a specific patient
      this.chronicDiseaseApiService.findByPatientId(this.filter.patientId).subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            this.chronicDiseases = response.data;
            this.totalDiseases = response.data.length;
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            console.error('Error loading patient diseases:', error);
            this.errorMessage = 'Failed to load patient diseases.';
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        }
      });
    } else {
      // Load all chronic diseases
      this.chronicDiseaseApiService.getChronicDiseasesList(this.currentPage, this.perPage).subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            this.chronicDiseases = response.data.data;
            this.totalDiseases = response.data.pagination.total;
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            console.error('Error loading chronic diseases:', error);
            this.errorMessage = 'Failed to load chronic diseases.';
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        }
      });
    }
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.id === patientId);
    return patient ? patient.fullname : 'Unknown Patient';
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= Math.ceil(this.totalDiseases / this.perPage)) {
      this.currentPage = page;
      this.loadChronicDiseases();
    }
  }

  nextPage(): void {
    const maxPage = Math.ceil(this.totalDiseases / this.perPage);
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
    return Math.ceil(this.totalDiseases / this.perPage);
  }

  get filteredDiseases(): ChronicDiseaseRecord[] {
    if (!this.filter.searchTerm.trim()) {
      return this.chronicDiseases;
    }

    const term = this.filter.searchTerm.toLowerCase();
    return this.chronicDiseases.filter(disease =>
      disease.diseaseName.toLowerCase().includes(term) ||
      disease.diseaseDescription.toLowerCase().includes(term)
    );
  }

  openAddDialog(): void {
    this.newDiseaseForm = this.getDefaultNewDiseaseForm();
    this.isAddDialogOpen = true;
    this.errorMessage = '';
  }

  closeAddDialog(): void {
    this.isAddDialogOpen = false;
  }

  openFilterDialog(): void {
    this.isFilterDialogOpen = true;
  }

  closeFilterDialog(): void {
    this.isFilterDialogOpen = false;
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.isFilterDialogOpen = false;
    this.loadChronicDiseases();
  }

  clearFilter(): void {
    this.filter = {
      patientId: '',
      searchTerm: '',
    };
    this.currentPage = 1;
    this.loadChronicDiseases();
  }

  createChronicDisease(): void {
    if (!this.newDiseaseForm.patientId) {
      this.errorMessage = 'Please select a patient.';
      return;
    }

    const diseaseName = this.newDiseaseForm.diseaseName.trim();
    const diseaseDescription = this.newDiseaseForm.diseaseDescription.trim();

    if (!diseaseName) {
      this.errorMessage = 'Disease name is required.';
      return;
    }

    this.isCreating = true;
    this.errorMessage = '';

    this.chronicDiseaseApiService.createChronicDisease({
      patientId: this.newDiseaseForm.patientId,
      diseaseName,
      diseaseDescription,
    }).subscribe({
      next: (response) => {
        this.isAddDialogOpen = false;
        this.isCreating = false;
        this.loadChronicDiseases(); // Reload to get updated totals
      },
      error: (error) => {
        console.error('Error creating chronic disease:', error);

        // Extract specific error message from API response
        let errorMsg = 'Failed to create chronic disease.';

        if (error?.error?.meta) {
          errorMsg = `Error: ${error.error.meta}`;
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

  deleteChronicDisease(id: string): void {
    this.isDeleting = true;
    this.errorMessage = '';

    this.chronicDiseaseApiService.deleteChronicDisease(id).subscribe({
      next: () => {
        this.chronicDiseases = this.chronicDiseases.filter(d => d.id !== id);
        this.deleteConfirmationId = null;
        this.isDeleting = false;
        this.loadChronicDiseases(); // Reload to get updated totals
      },
      error: (error) => {
        console.error('Error deleting chronic disease:', error);
        this.errorMessage = 'Failed to delete chronic disease.';
        this.isDeleting = false;
      }
    });
  }

  showDeleteConfirmation(id: string): void {
    this.deleteConfirmationId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmationId = null;
  }

  private getDefaultNewDiseaseForm(): NewChronicDiseaseForm {
    return {
      patientId: '',
      diseaseName: '',
      diseaseDescription: '',
    };
  }
}

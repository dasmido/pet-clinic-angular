import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

import { AuthApiService, AuthRole, extractAuthErrorMessage } from '../../auth/auth-api.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { User, UserApiService } from '../../services/user-api.service';
import { ConfirmDeleteDialogComponent } from '../../shared/components/confirm-delete-dialog.component';

interface NewUserForm {
  username: string;
  password: string;
  fullname: string;
  phone: string;
  role: AuthRole;
}

interface UserSearchCriteria {
  fullname: string;
  username: string;
  phone: string;
  role: '' | AuthRole;
  status: '' | 'ACTIVE' | 'INACTIVE';
}

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDeleteDialogComponent],
  templateUrl: './users-page.component.html',
  styleUrls: ['./users-page.component.css'],
})
export class UsersPageComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authStateService = inject(AuthStateService);
  @ViewChild('quickSearchInput') private quickSearchInput?: ElementRef<HTMLInputElement>;

  constructor(
    private readonly userApiService: UserApiService,
    private readonly authApiService: AuthApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {}

  readonly availableRoles: AuthRole[] = ['SUPERADMIN', 'ADMIN', 'DOCTOR', 'LAB', 'NURSE', 'PATIENT', 'RECIPIENT'];

  users: User[] = [];
  currentPage = 1;
  perPage = 10;
  totalUsers = 0;

  isLoading = false;
  isDeleting = false;
  isCreating = false;

  errorMessage = '';
  addErrorMessage = '';

  quickSearch = '';
  isQuickSearchOpen = false;
  isDeleteDialogOpen = false;
  isAdvancedSearchOpen = false;

  searchCriteria: UserSearchCriteria = {
    fullname: '',
    username: '',
    phone: '',
    role: '',
    status: '',
  };

  isAddDialogOpen = false;
  pendingDeleteUser: User | null = null;

  newUserForm: NewUserForm = this.getDefaultNewUserForm();

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadUsers();
  }

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    if (this.isAddDialogOpen) {
      this.closeAddDialog();
      return;
    }

    if (this.isAdvancedSearchOpen) {
      this.closeAdvancedSearchDialog();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalUsers / this.perPage);
  }

  get filteredUsers(): User[] {
    const query = this.quickSearch.trim().toLowerCase();

    return this.users.filter((user) => {
      const fullName = this.normalizeSearchValue(user.fullname);
      const username = this.normalizeSearchValue(user.username);
      const phone = this.normalizeSearchValue(user.phone);
      const role = this.normalizeSearchValue(user.role);
      const status = user.isActive ? 'active' : 'inactive';

      const matchesQuickSearch = !query
        || fullName.includes(query)
        || username.includes(query)
        || phone.includes(query)
        || role.includes(query)
        || status.includes(query);

      const matchesFullname = this.matchesValue(user.fullname, this.searchCriteria.fullname);
      const matchesUsername = this.matchesValue(user.username, this.searchCriteria.username);
      const matchesPhone = this.matchesValue(user.phone, this.searchCriteria.phone);
      const matchesRole = this.searchCriteria.role === '' || user.role === this.searchCriteria.role;
      const matchesStatus = this.searchCriteria.status === ''
        || (this.searchCriteria.status === 'ACTIVE' && user.isActive)
        || (this.searchCriteria.status === 'INACTIVE' && !user.isActive);

      return (
        matchesQuickSearch
        && matchesFullname
        && matchesUsername
        && matchesPhone
        && matchesRole
        && matchesStatus
      );
    });
  }

  loadUsers(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const session = this.authStateService.getSession();
    if (!session?.token) {
      this.errorMessage = 'Missing authentication token. Please log in again.';
      this.users = [];
      this.totalUsers = 0;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.userApiService.getUsersList(this.currentPage, this.perPage).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          this.users = response.data.data;
          this.totalUsers = response.data.pagination.total;
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          console.error('Error loading users:', error);
          this.errorMessage = 'Failed to load users. Please try again.';
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
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

  toggleQuickSearch(): void {
    this.isQuickSearchOpen = !this.isQuickSearchOpen;

    if (!this.isQuickSearchOpen) {
      return;
    }

    window.setTimeout(() => {
      this.quickSearchInput?.nativeElement.focus();
    }, 180);
  }

  clearQuickSearch(): void {
    this.quickSearch = '';
    this.quickSearchInput?.nativeElement.focus();
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
      fullname: '',
      username: '',
      phone: '',
      role: '',
      status: '',
    };
  }

  openAddDialog(): void {
    this.newUserForm = this.getDefaultNewUserForm();
    this.addErrorMessage = '';
    this.isAddDialogOpen = true;
  }

  closeAddDialog(): void {
    this.isAddDialogOpen = false;
  }

  createUser(): void {
    if (this.isCreating) {
      return;
    }

    const payload = {
      username: this.newUserForm.username.trim(),
      password: this.newUserForm.password,
      fullname: this.newUserForm.fullname.trim(),
      phone: this.newUserForm.phone.trim(),
      role: this.newUserForm.role,
    };

    if (!payload.username || !payload.password || !payload.fullname || !payload.phone) {
      this.addErrorMessage = 'Username, password, full name, and phone are required.';
      return;
    }

    this.isCreating = true;
    this.addErrorMessage = '';

    this.authApiService.register(payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isCreating = false;
          this.isAddDialogOpen = false;
          this.cdr.markForCheck();
          this.loadUsers();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          this.isCreating = false;
          this.addErrorMessage = extractAuthErrorMessage(error, 'Failed to create user. Please try again.');
          this.cdr.markForCheck();
        });
      },
    });
  }

  openDeleteDialog(user: User): void {
    if (this.isDeleting || this.isLoading) {
      return;
    }

    this.pendingDeleteUser = user;
    this.isDeleteDialogOpen = true;
  }

  closeDeleteDialog(): void {
    if (this.isDeleting) {
      return;
    }

    this.isDeleteDialogOpen = false;
    this.pendingDeleteUser = null;
  }

  confirmDeleteUser(): void {
    const user = this.pendingDeleteUser;
    if (!user || this.isDeleting || this.isLoading) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';

    this.userApiService.deleteUser(user.id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isDeleting = false;
          this.isDeleteDialogOpen = false;
          this.pendingDeleteUser = null;

          const remainingInPage = this.users.length - 1;
          if (remainingInPage <= 0 && this.currentPage > 1) {
            this.currentPage -= 1;
          }

          this.cdr.markForCheck();
          this.loadUsers();
        });
      },
      error: (error: unknown) => {
        this.ngZone.run(() => {
          console.error('Error deleting user:', error);
          this.isDeleting = false;
          this.errorMessage = 'Failed to delete user. Please try again.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  private getDefaultNewUserForm(): NewUserForm {
    return {
      username: '',
      password: '',
      fullname: '',
      phone: '',
      role: 'ADMIN',
    };
  }

  private normalizeSearchValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(' ').toLowerCase();
    }

    if (value === null || value === undefined) {
      return '';
    }

    return String(value).toLowerCase();
  }

  private matchesValue(value: unknown, query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return this.normalizeSearchValue(value).includes(normalizedQuery);
  }

  get deleteDialogMessage(): string {
    if (!this.pendingDeleteUser) {
      return 'Are you sure you want to delete this item? This cannot be undone.';
    }

    return `Delete user ${this.pendingDeleteUser.fullname}? This cannot be undone.`;
  }
}

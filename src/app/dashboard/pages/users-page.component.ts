import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

import { AuthApiService, AuthRole, extractAuthErrorMessage } from '../../auth/auth-api.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { User, UserApiService } from '../../services/user-api.service';

interface NewUserForm {
  username: string;
  password: string;
  fullname: string;
  phone: string;
  role: AuthRole;
}

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-page.component.html',
  styleUrls: ['./users-page.component.css'],
})
export class UsersPageComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authStateService = inject(AuthStateService);

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

  isAddDialogOpen = false;

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
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalUsers / this.perPage);
  }

  get filteredUsers(): User[] {
    const query = this.quickSearch.trim().toLowerCase();

    if (!query) {
      return this.users;
    }

    return this.users.filter((user) => {
      return (
        user.fullname.toLowerCase().includes(query)
        || user.email.toLowerCase().includes(query)
        || user.roles.toLowerCase().includes(query)
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

  deleteUser(user: User): void {
    if (this.isDeleting || this.isLoading) {
      return;
    }

    const confirmed = window.confirm(`Delete user ${user.fullname}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';

    this.userApiService.deleteUser(user.id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isDeleting = false;

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
}

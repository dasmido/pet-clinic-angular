import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { AuthStateService } from '../../auth/auth-state.service';
import { UserProfileApiService, UserProfile } from '../../services/user-profile-api.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.css',
})
export class ProfilePageComponent implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly userProfileApi = inject(UserProfileApiService);

  readonly userProfile = signal<UserProfile | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    this.userProfileApi.getProfile().subscribe({
      next: (response) => {
        this.userProfile.set(response.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load user profile:', err);
        this.error.set('Failed to load profile. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  get role(): string {
    return this.userProfile()?.roles ?? this.authState.getRole() ?? 'SUPERADMIN';
  }

  get initials(): string {
    const profile = this.userProfile();
    if (!profile) return 'U';
    const names = profile.fullname.split(' ');
    return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(date: string): string {
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  }

  formatDateTime(date: string): string {
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  }
}

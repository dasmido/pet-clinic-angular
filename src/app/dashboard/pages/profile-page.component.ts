import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthStateService } from '../../auth/auth-state.service';
import { UserProfileApiService, UserProfile } from '../../services/user-profile-api.service';

const WHATSAPP_INTEGRATION_STORAGE_KEY = 'animal-clinic-angular.whatsapp.integration';

interface WhatsappIntegrationForm {
  url: string;
  instanceId: string;
  token: string;
}

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.css',
})
export class ProfilePageComponent implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly userProfileApi = inject(UserProfileApiService);

  readonly userProfile = signal<UserProfile | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly integrationSaved = signal(false);

  readonly whatsappIntegrationForm: WhatsappIntegrationForm = {
    url: '',
    instanceId: '',
    token: '',
  };

  ngOnInit(): void {
    this.loadWhatsappIntegration();
    this.loadUserProfile();
  }

  saveWhatsappIntegration(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const payload: WhatsappIntegrationForm = {
      url: this.whatsappIntegrationForm.url.trim(),
      instanceId: this.whatsappIntegrationForm.instanceId.trim(),
      token: this.whatsappIntegrationForm.token.trim(),
    };

    window.localStorage.setItem(WHATSAPP_INTEGRATION_STORAGE_KEY, JSON.stringify(payload));
    this.integrationSaved.set(true);

    window.setTimeout(() => {
      this.integrationSaved.set(false);
    }, 1800);
  }

  private loadWhatsappIntegration(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(WHATSAPP_INTEGRATION_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<WhatsappIntegrationForm>;
      this.whatsappIntegrationForm.url = typeof parsed.url === 'string' ? parsed.url : '';
      this.whatsappIntegrationForm.instanceId = typeof parsed.instanceId === 'string' ? parsed.instanceId : '';
      this.whatsappIntegrationForm.token = typeof parsed.token === 'string' ? parsed.token : '';
    } catch {
      window.localStorage.removeItem(WHATSAPP_INTEGRATION_STORAGE_KEY);
    }
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

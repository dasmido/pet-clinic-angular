import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthApiService, extractAuthErrorMessage } from './auth-api.service';
import { AuthStateService } from './auth-state.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = false;
  successMessage = '';
  errorMessage = '';
  responseText = '';

  readonly form = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    const registeredUsername = this.route.snapshot.queryParamMap.get('registered');

    if (registeredUsername) {
      this.form.patchValue({ username: registeredUsername });
      this.successMessage = `Account created for ${registeredUsername}. Sign in below.`;
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.responseText = '';

    try {
      const response = await firstValueFrom(this.authApi.login(this.form.getRawValue()));
      this.authState.setSession(response.data);
      this.successMessage = 'Login successful. Redirecting to dashboard.';
      this.responseText = JSON.stringify(response, null, 2);
      this.form.controls.password.setValue('');
      await this.router.navigate(['/dashboard/patients']);
    } catch (error) {
      this.errorMessage = extractAuthErrorMessage(error, 'Unable to sign in.');
    } finally {
      this.loading = false;
    }
  }

  get usernameControl() {
    return this.form.controls.username;
  }

  get passwordControl() {
    return this.form.controls.password;
  }
}

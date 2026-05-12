import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthApiService, AuthRole, extractAuthErrorMessage } from './auth-api.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.css',
})
export class RegisterPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  loading = false;
  successMessage = '';
  errorMessage = '';
  responseText = '';

  readonly roles: AuthRole[] = ['SUPERADMIN', 'ADMIN', 'DOCTOR', 'LAB', 'NURSE', 'PATIENT', 'RECIPIENT'];

  readonly form = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    fullname: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\s()-]{7,}$/)]],
    role: ['SUPERADMIN' as AuthRole, [Validators.required]],
  });

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
      const payload = this.form.getRawValue();
      const response = await firstValueFrom(this.authApi.register(payload));
      this.responseText = JSON.stringify(response, null, 2);
      this.successMessage = 'Account created. Redirecting to login.';
      await this.router.navigate(['/login'], {
        queryParams: { registered: payload.username },
      });
    } catch (error) {
      this.errorMessage = extractAuthErrorMessage(error, 'Unable to create the account.');
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

  get fullnameControl() {
    return this.form.controls.fullname;
  }

  get phoneControl() {
    return this.form.controls.phone;
  }

  get roleControl() {
    return this.form.controls.role;
  }
}

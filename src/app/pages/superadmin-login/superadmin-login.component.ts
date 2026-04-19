import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SuperAdminAuthService } from '../../core/services/superadmin-auth.service';
import { apiBaseUrl } from '../../core/config';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './superadmin-login.component.html',
})
export class SuperAdminLoginComponent {
  submitting = signal(false);
  error = signal<string | null>(null);

  baseUrl = () => apiBaseUrl();

  form = new FormGroup({
    email: new FormControl('admin@local', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('admin12345', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(private auth: SuperAdminAuthService, private router: Router, private toast: ToastService) {}

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Validation required', 'Please enter email and password.');
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    const raw = this.form.getRawValue();
    this.auth.login(raw.email.trim(), raw.password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success('Login successful', 'Super admin access granted.');
        this.router.navigateByUrl('/superadmin/organizers');
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.detail || err?.message || 'Login failed');
        this.toast.error('Login failed', this.error() || undefined);
      },
    });
  }
}





import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrganizerAuthService } from '../organizer-auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-lg-6">
          <div class="mb-4">
            <a routerLink="/" class="link-secondary text-decoration-none">← Back</a>
            <h1 class="h3 fw-bold mt-2 mb-1">Organizer Login</h1>
            <div class="text-secondary">Enter your API base URL and Admin API Key to access organizer tools.</div>
          </div>

          <div class="card">
            <div class="card-body">
              <form [formGroup]="form" (ngSubmit)="submit()">
                <div class="mb-3">
                  <label class="form-label">API Base URL</label>
                  <input class="form-control" formControlName="apiBaseUrl" placeholder="http://127.0.0.1:8000" />
                  <div class="form-text">Example: http://127.0.0.1:8000</div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Username</label>
                  <input class="form-control" formControlName="username" placeholder="organizer" />
                </div>
                <div class="mb-3">
                  <label class="form-label">Password</label>
                  <input class="form-control" type="password" formControlName="password" placeholder="organizer" />
                  <div class="form-text">Defaults are set in backend env: ORGANIZER_USERNAME / ORGANIZER_PASSWORD</div>
                </div>
                <div class="d-flex align-items-center gap-3">
                  <button class="btn btn-primary" type="submit" [disabled]="form.invalid || submitting()">
                    <span *ngIf="!submitting()">Login</span>
                    <span *ngIf="submitting()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span *ngIf="submitting()" class="ms-2">Signing in…</span>
                  </button>
                  <div class="text-danger small" *ngIf="error()">{{ error() }}</div>
                </div>
              </form>
            </div>
          </div>

          <div class="alert alert-light border mt-3 mb-0 small">
            Default credentials (dev): <code>organizer</code> / <code>organizer</code>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class OrganizerLoginComponent {
  submitting = signal(false);
  error = signal<string | null>(null);

  form = new FormGroup({
    apiBaseUrl: new FormControl('http://127.0.0.1:8000', { nonNullable: true, validators: [Validators.required] }),
    username: new FormControl('organizer', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('organizer', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(private auth: OrganizerAuthService, private router: Router) {
    const savedBase = localStorage.getItem('apiBaseUrl');
    this.form.reset({
      apiBaseUrl: savedBase || 'http://127.0.0.1:8000',
      username: 'organizer',
      password: 'organizer',
    });
  }

  submit() {
    this.error.set(null);
    this.submitting.set(true);
    const raw = this.form.getRawValue();
    this.auth.login(raw.apiBaseUrl, raw.username, raw.password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/organizer/events');
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.detail || err?.message || 'Login failed');
      },
    });
  }
}

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrganizerAuthService } from '../organizer-auth.service';
import { apiBaseUrl } from '../config';

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
            <div class="text-secondary">
              Enter your email to receive an OTP and access organizer tools.
              <span class="d-block small mt-1">Backend: <code>{{ baseUrl() }}</code></span>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <form [formGroup]="form" (ngSubmit)="submit()">
                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input class="form-control" formControlName="email" placeholder="organizer@example.com" />
                </div>
                <div class="mb-3" *ngIf="step() === 'verify'">
                  <label class="form-label">OTP</label>
                  <input class="form-control" formControlName="otp" placeholder="6-digit OTP" />
                  <div class="form-text" *ngIf="devOtp()">
                    Dev OTP (SMTP not configured): <code>{{ devOtp() }}</code>
                  </div>
                </div>
                <div class="d-flex align-items-center gap-3">
                  <button class="btn btn-primary" type="submit" [disabled]="submitting() || (step()==='request' ? form.controls.email.invalid : form.controls.otp.invalid)">
                    <span *ngIf="!submitting()">{{ step()==='request' ? 'Send OTP' : 'Verify & Login' }}</span>
                    <span *ngIf="submitting()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span *ngIf="submitting()" class="ms-2">{{ step()==='request' ? 'Sending…' : 'Signing in…' }}</span>
                  </button>
                  <button class="btn btn-outline-secondary" type="button" *ngIf="step()==='verify' && !submitting()" (click)="reset()">
                    Change email
                  </button>
                  <div class="text-danger small" *ngIf="error()">{{ error() }}</div>
                </div>
              </form>
            </div>
          </div>

          <div class="alert alert-light border mt-3 mb-0 small">
            OTP expires in ~10 minutes. If SMTP is not set and backend is in <code>dev</code>, OTP will show here as “Dev OTP”.
          </div>
        </div>
      </div>
    </div>
  `,
})
export class OrganizerLoginComponent {
  submitting = signal(false);
  error = signal<string | null>(null);
  step = signal<'request' | 'verify'>('request');
  devOtp = signal<string | null>(null);

  baseUrl = () => apiBaseUrl();

  form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    otp: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(4)] }),
  });

  constructor(private auth: OrganizerAuthService, private router: Router) {
    this.form.controls.otp.disable();
  }

  submit() {
    this.error.set(null);
    this.submitting.set(true);
    const email = this.form.controls.email.getRawValue().trim();

    if (this.step() === 'request') {
      this.auth.requestOtp(email).subscribe({
        next: (res) => {
          this.submitting.set(false);
          if (res.status !== 'ok') {
            this.error.set(res.reason || 'Unable to send OTP');
            return;
          }
          this.devOtp.set((res as any)?.dev_otp || null);
          this.step.set('verify');
          this.form.controls.email.disable();
          this.form.controls.otp.enable();
          this.form.controls.otp.setValue('');
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.detail || err?.message || 'Failed to send OTP');
        },
      });
      return;
    }

    const otp = this.form.controls.otp.getRawValue().trim();
    this.auth.verifyOtp(email, otp).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/organizer/events');
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.detail || err?.message || 'Invalid OTP');
      },
    });
  }

  reset() {
    this.error.set(null);
    this.devOtp.set(null);
    this.step.set('request');
    this.form.controls.email.enable();
    this.form.controls.otp.disable();
    this.form.controls.otp.setValue('');
  }
}

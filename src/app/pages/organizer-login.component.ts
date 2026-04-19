import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrganizerAuthService } from '../organizer-auth.service';
import { apiBaseUrl } from '../config';

type Step = 'password-login' | 'otp-email' | 'otp-verify' | 'set-password';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-lg-5">
          <div class="mb-4">
            <a routerLink="/" class="link-secondary text-decoration-none">← Back</a>
            <h1 class="h3 fw-bold mt-2 mb-1">Organizer Login</h1>
          </div>

          <div class="card shadow-sm">
            <div class="card-body p-4">

              <!-- Normal password login -->
              <ng-container *ngIf="step() === 'password-login'">
                <form [formGroup]="pwForm" (ngSubmit)="submitPassword()">
                  <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input class="form-control" formControlName="email" placeholder="organizer@example.com" />
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input class="form-control" type="password" formControlName="password" placeholder="Your password" />
                  </div>
                  <button class="btn btn-primary w-100" type="submit" [disabled]="submitting() || pwForm.invalid">
                    <span *ngIf="!submitting()">Login</span>
                    <span *ngIf="submitting()" class="spinner-border spinner-border-sm me-2"></span>
                    <span *ngIf="submitting()">Logging in…</span>
                  </button>
                  <div class="text-center mt-3">
                    <a href="#" class="small link-secondary" (click)="$event.preventDefault(); goToForgot()">
                      Forgot password? Reset via OTP
                    </a>
                  </div>
                </form>
              </ng-container>

              <!-- OTP email entry (first login or forgot password) -->
              <ng-container *ngIf="step() === 'otp-email'">
                <p class="text-secondary small mb-3">
                  {{ otpReason() === 'first' ? 'Enter your email to receive a one-time password.' : 'Enter your email to reset your password.' }}
                </p>
                <form [formGroup]="otpEmailForm" (ngSubmit)="requestOtp()">
                  <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input class="form-control" formControlName="email" placeholder="organizer@example.com" />
                  </div>
                  <button class="btn btn-primary w-100" type="submit" [disabled]="submitting() || otpEmailForm.invalid">
                    <span *ngIf="!submitting()">Send OTP</span>
                    <span *ngIf="submitting()" class="spinner-border spinner-border-sm me-2"></span>
                    <span *ngIf="submitting()">Sending…</span>
                  </button>
                  <div class="text-center mt-3" *ngIf="otpReason() === 'forgot'">
                    <a href="#" class="small link-secondary" (click)="$event.preventDefault(); step.set('password-login')">
                      Back to login
                    </a>
                  </div>
                </form>
              </ng-container>

              <!-- OTP verify -->
              <ng-container *ngIf="step() === 'otp-verify'">
                <p class="text-secondary small mb-3">OTP sent to <strong>{{ otpEmailForm.controls.email.value }}</strong></p>
                <form [formGroup]="otpVerifyForm" (ngSubmit)="verifyOtp()">
                  <div class="mb-3">
                    <label class="form-label">OTP</label>
                    <input class="form-control" formControlName="otp" placeholder="6-digit OTP" />
                    <div class="form-text text-success" *ngIf="devOtp()">
                      Dev OTP: <code>{{ devOtp() }}</code>
                    </div>
                  </div>
                  <button class="btn btn-primary w-100" type="submit" [disabled]="submitting() || otpVerifyForm.invalid">
                    <span *ngIf="!submitting()">Verify OTP</span>
                    <span *ngIf="submitting()" class="spinner-border spinner-border-sm me-2"></span>
                    <span *ngIf="submitting()">Verifying…</span>
                  </button>
                  <div class="text-center mt-3">
                    <a href="#" class="small link-secondary" (click)="$event.preventDefault(); step.set('otp-email')">
                      Resend OTP
                    </a>
                  </div>
                </form>
              </ng-container>

              <!-- Set / Reset password -->
              <ng-container *ngIf="step() === 'set-password'">
                <p class="text-secondary small mb-3">
                  {{ otpReason() === 'first' ? 'Welcome! Set a password for future logins.' : 'Set your new password.' }}
                </p>
                <form [formGroup]="setPasswordForm" (ngSubmit)="submitSetPassword()">
                  <div class="mb-3">
                    <label class="form-label">New Password</label>
                    <input class="form-control" type="password" formControlName="password" placeholder="Min 8 characters" />
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Confirm Password</label>
                    <input class="form-control" type="password" formControlName="confirm" placeholder="Repeat password" />
                    <div class="text-danger small mt-1"
                      *ngIf="setPasswordForm.errors?.['mismatch'] && setPasswordForm.controls.confirm.dirty">
                      Passwords do not match
                    </div>
                  </div>
                  <button class="btn btn-primary w-100" type="submit" [disabled]="submitting() || setPasswordForm.invalid">
                    <span *ngIf="!submitting()">Set Password & Continue</span>
                    <span *ngIf="submitting()" class="spinner-border spinner-border-sm me-2"></span>
                    <span *ngIf="submitting()">Saving…</span>
                  </button>
                </form>
              </ng-container>

              <div class="text-danger small mt-3" *ngIf="error()">{{ error() }}</div>
            </div>
          </div>

          <!-- First time? hint -->
          <div class="text-center mt-3" *ngIf="step() === 'password-login'">
            <a href="#" class="small link-secondary" (click)="$event.preventDefault(); goToFirstLogin()">
              First time login? Use OTP
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class OrganizerLoginComponent {
  step = signal<Step>('password-login');
  otpReason = signal<'first' | 'forgot'>('first');
  submitting = signal(false);
  error = signal<string | null>(null);
  devOtp = signal<string | null>(null);

  baseUrl = () => apiBaseUrl();

  pwForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  otpEmailForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  otpVerifyForm = new FormGroup({
    otp: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(4)] }),
  });

  setPasswordForm = new FormGroup(
    {
      password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
      confirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: (g) => g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true } }
  );

  constructor(private auth: OrganizerAuthService, private router: Router) {}

  goToFirstLogin() {
    this.otpReason.set('first');
    this.error.set(null);
    this.step.set('otp-email');
  }

  goToForgot() {
    this.otpReason.set('forgot');
    this.error.set(null);
    this.step.set('otp-email');
  }

  submitPassword() {
    this.error.set(null);
    this.submitting.set(true);
    const { email, password } = this.pwForm.getRawValue();
    this.auth.loginWithPassword(email.trim(), password).subscribe({
      next: () => { this.submitting.set(false); this.router.navigateByUrl('/organizer/events'); },
      error: (err) => { this.submitting.set(false); this.error.set(err?.error?.detail || 'Invalid credentials'); },
    });
  }

  requestOtp() {
    this.error.set(null);
    this.submitting.set(true);
    const email = this.otpEmailForm.controls.email.getRawValue().trim();
    this.auth.requestOtp(email).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.status !== 'ok') { this.error.set(res.reason || 'Unable to send OTP'); return; }
        this.devOtp.set(res.dev_otp || null);
        this.otpVerifyForm.reset();
        this.step.set('otp-verify');
      },
      error: (err) => { this.submitting.set(false); this.error.set(err?.error?.detail || 'Failed to send OTP'); },
    });
  }

  verifyOtp() {
    this.error.set(null);
    this.submitting.set(true);
    const email = this.otpEmailForm.controls.email.getRawValue().trim();
    const otp = this.otpVerifyForm.controls.otp.getRawValue().trim();
    this.auth.verifyOtp(email, otp).subscribe({
      next: () => { this.submitting.set(false); this.step.set('set-password'); },
      error: (err) => { this.submitting.set(false); this.error.set(err?.error?.detail || 'Invalid OTP'); },
    });
  }

  submitSetPassword() {
    this.error.set(null);
    this.submitting.set(true);
    const pw = this.setPasswordForm.controls.password.getRawValue();
    this.auth.setPassword(pw).subscribe({
      next: () => { this.submitting.set(false); this.router.navigateByUrl('/organizer/events'); },
      error: (err) => { this.submitting.set(false); this.error.set(err?.error?.detail || 'Failed to set password'); },
    });
  }
}

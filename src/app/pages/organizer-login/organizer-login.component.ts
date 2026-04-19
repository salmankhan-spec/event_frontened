import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrganizerAuthService } from '../../core/services/organizer-auth.service';
import { apiBaseUrl } from '../../core/config';
import { ToastService } from '../../core/services/toast.service';

type Step = 'password-login' | 'otp-email' | 'otp-verify' | 'set-password';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './organizer-login.component.html',
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

  constructor(private auth: OrganizerAuthService, private router: Router, private toast: ToastService) {}

  private validationToast(message = 'Please fill all required fields.') {
    this.toast.error('Validation required', message);
  }

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
    if (this.pwForm.invalid) {
      this.pwForm.markAllAsTouched();
      this.validationToast();
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    const { email, password } = this.pwForm.getRawValue();
    this.auth.loginWithPassword(email.trim(), password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success('Login successful', 'Welcome back.');
        this.router.navigateByUrl('/organizer/events');
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.detail || 'Invalid credentials');
        this.toast.error('Login failed', this.error() || undefined);
      },
    });
  }

  requestOtp() {
    if (this.otpEmailForm.invalid) {
      this.otpEmailForm.markAllAsTouched();
      this.validationToast();
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    const email = this.otpEmailForm.controls.email.getRawValue().trim();
    this.auth.requestOtp(email).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.status !== 'ok') { this.error.set(res.reason || 'Unable to send OTP'); return; }
        this.devOtp.set(res.dev_otp || null);
        this.otpVerifyForm.reset();
        this.toast.success('OTP sent', 'Check your email for the code.');
        this.step.set('otp-verify');
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.detail || 'Failed to send OTP');
        this.toast.error('OTP send failed', this.error() || undefined);
      },
    });
  }

  verifyOtp() {
    if (this.otpVerifyForm.invalid) {
      this.otpVerifyForm.markAllAsTouched();
      this.validationToast('Please enter the OTP sent to your email.');
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    const email = this.otpEmailForm.controls.email.getRawValue().trim();
    const otp = this.otpVerifyForm.controls.otp.getRawValue().trim();
    this.auth.verifyOtp(email, otp).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success('OTP verified');
        this.step.set('set-password');
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.detail || 'Invalid OTP');
        this.toast.error('OTP verification failed', this.error() || undefined);
      },
    });
  }

  submitSetPassword() {
    if (this.setPasswordForm.invalid) {
      this.setPasswordForm.markAllAsTouched();
      this.validationToast('Please enter a valid password and confirm it.');
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    const pw = this.setPasswordForm.controls.password.getRawValue();
    this.auth.setPassword(pw).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success('Password set', 'You are now logged in.');
        this.router.navigateByUrl('/organizer/events');
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.detail || 'Failed to set password');
        this.toast.error('Password update failed', this.error() || undefined);
      },
    });
  }
}





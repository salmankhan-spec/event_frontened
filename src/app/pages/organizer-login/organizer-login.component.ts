import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrganizerAuthService } from '../../core/services/organizer-auth.service';
import { apiBaseUrl } from '../../core/config';
import { ToastService } from '../../core/services/toast.service';
import { OtpInputComponent } from '../../shared/components/otp-input/otp-input.component';

type Step = 'password-login' | 'otp-email' | 'otp-verify' | 'set-password';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, OtpInputComponent],
  templateUrl: './organizer-login.component.html',
})
export class OrganizerLoginComponent {
  private readonly destroyRef = inject(DestroyRef);

  step = signal<Step>('password-login');
  otpReason = signal<'first' | 'forgot'>('first');
  submitting = signal(false);
  error = signal<string | null>(null);
  devOtp = signal<string | null>(null);

  readonly otpLength = 6;
  private otpTimerSub: Subscription | null = null;
  otpExpiresInSeconds = signal(0);
  otpExpired = computed(() => this.step() === 'otp-verify' && this.otpExpiresInSeconds() <= 0);
  canResendOtp = computed(() => this.step() === 'otp-verify' && this.otpExpiresInSeconds() <= 0 && !this.submitting());

  baseUrl = () => apiBaseUrl();

  pwForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  otpEmailForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  otpVerifyForm = new FormGroup({
    otp: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(this.otpLength),
        Validators.maxLength(this.otpLength),
        Validators.pattern(new RegExp(`^\\d{${this.otpLength}}$`)),
      ],
    }),
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

  private stopOtpTimer() {
    this.otpTimerSub?.unsubscribe();
    this.otpTimerSub = null;
    this.otpExpiresInSeconds.set(0);
  }

  private startOtpTimer(seconds: number) {
    this.otpTimerSub?.unsubscribe();
    this.otpTimerSub = null;
    this.otpExpiresInSeconds.set(Math.max(0, Math.floor(seconds)));

    this.otpTimerSub = interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const next = this.otpExpiresInSeconds() - 1;
        this.otpExpiresInSeconds.set(Math.max(0, next));
        if (next <= 0) {
          this.otpTimerSub?.unsubscribe();
          this.otpTimerSub = null;
        }
      });
  }

  formatOtpExpiry(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds || 0));
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, '0');
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, '0');
    return `${mm}:${ss}`;
  }

  goToFirstLogin() {
    this.otpReason.set('first');
    this.error.set(null);
    this.stopOtpTimer();
    this.step.set('otp-email');
  }

  goToForgot() {
    this.otpReason.set('forgot');
    this.error.set(null);
    this.stopOtpTimer();
    this.step.set('otp-email');
  }

  goToPasswordLogin() {
    this.error.set(null);
    this.stopOtpTimer();
    this.step.set('password-login');
  }

  goToOtpEmail() {
    this.error.set(null);
    this.stopOtpTimer();
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
        if (res.status !== 'ok' || !res.otp_sent) {
          const reason = res.reason || 'Unable to send OTP';
          this.error.set(reason);

          if (res.status === 'not_registered') {
            this.toast.error('Not registered', reason);
          } else if (res.status === 'inactive') {
            this.toast.error('Account inactive', reason);
          } else if (res.status === 'smtp_error') {
            this.toast.error('OTP send failed', reason);
          } else {
            this.toast.error('OTP request failed', reason);
          }
          return;
        }
        this.devOtp.set(res.dev_otp || null);
        this.otpVerifyForm.reset();
        this.startOtpTimer(10 * 60);
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

  resendOtp() {
    if (!this.canResendOtp()) return;
    this.requestOtp();
  }

  verifyOtp() {
    if (this.otpExpired()) {
      this.toast.error('OTP expired', 'Please resend OTP and try again.');
      return;
    }
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
        this.stopOtpTimer();
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
        this.stopOtpTimer();
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



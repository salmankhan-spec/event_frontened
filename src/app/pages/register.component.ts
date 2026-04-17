import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, EventOut, RegisterResponse } from '../api.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="container py-4">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <a routerLink="/" class="link-secondary text-decoration-none">← Home</a>
          <h1 class="h4 mb-1 mt-2 fw-bold">Event Registration</h1>
          <div class="text-secondary small">Event ID: {{ eventId }}</div>
          <div class="text-secondary" *ngIf="event()">{{ event()?.title }}</div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-7">
          <div class="card">
            <div class="card-body">
              <h2 class="h6 fw-semibold mb-3">Your Details</h2>
              <form [formGroup]="form" (ngSubmit)="submit()">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Name</label>
                    <input class="form-control" formControlName="name" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Email</label>
                    <input class="form-control" formControlName="email" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Phone (optional)</label>
                    <input class="form-control" formControlName="phone" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Organization (optional)</label>
                    <input class="form-control" formControlName="organization" />
                  </div>
                </div>
                <div class="d-flex align-items-center gap-3 mt-3">
                  <button class="btn btn-primary" type="submit" [disabled]="form.invalid || submitting()">
                    <span *ngIf="!submitting()">Register</span>
                    <span *ngIf="submitting()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span *ngIf="submitting()" class="ms-2">Submitting…</span>
                  </button>
                  <div class="text-danger small" *ngIf="error()">{{ error() }}</div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="card">
            <div class="card-body">
              <h2 class="h6 fw-semibold mb-2">After registration</h2>
              <ul class="small text-secondary mb-0">
                <li>You'll get a QR payload immediately.</li>
                <li>Show it at check-in (organizer scans it).</li>
                <li>If SMTP is configured, you’ll receive QR + certificate via email.</li>
              </ul>
            </div>
          </div>

          <div class="card mt-3" *ngIf="result()">
            <div class="card-body">
              <div class="alert alert-success mb-3">
                <div class="fw-semibold">Registered successfully</div>
                <div class="small">Keep this QR payload safe.</div>
              </div>
              <div class="small text-secondary mb-2">QR payload (encode this into a QR code):</div>
              <div class="code-block">{{ result()?.qr_payload }}</div>
              <div class="d-flex gap-2 mt-3">
                <button class="btn btn-outline-secondary btn-sm" type="button" (click)="copy(result()?.qr_payload || '')">
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  eventId: string;
  submitting = signal(false);
  error = signal<string | null>(null);
  result = signal<RegisterResponse | null>(null);
  event = signal<EventOut | null>(null);

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl<string | null>(null),
    organization: new FormControl<string | null>(null),
  });

  constructor(route: ActivatedRoute, private api: ApiService) {
    this.eventId = route.snapshot.paramMap.get('eventId') || '';
    this.api.getEvent(this.eventId).subscribe({
      next: (e) => this.event.set(e),
      error: () => this.event.set(null),
    });
  }

  submit() {
    this.error.set(null);
    this.result.set(null);
    this.submitting.set(true);
    this.api.register(this.eventId, this.form.getRawValue()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.result.set(res);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.detail || err?.message || 'Registration failed');
      },
    });
  }

  async copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  }
}

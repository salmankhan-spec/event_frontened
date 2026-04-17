import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, AttendanceResponse } from '../api.service';
import { ToastService } from '../toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container py-4">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <a routerLink="/" class="link-secondary text-decoration-none">← Home</a>
          <h1 class="h4 mb-1 mt-2 fw-bold">Attendance</h1>
          <div class="text-secondary">Check-in / Check-out using your Event ID and email.</div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <ul class="nav nav-pills mb-3">
            <li class="nav-item">
              <button class="nav-link" [class.active]="action() === 'checkin'" type="button" (click)="setAction('checkin')">
                Check-in
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link" [class.active]="action() === 'checkout'" type="button" (click)="setAction('checkout')">
                Check-out
              </button>
            </li>
          </ul>

          <div class="row g-3">
            <div class="col-lg-8">
              <div class="border rounded-3 p-3">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <div class="fw-semibold">{{ action() === 'checkin' ? 'Check-in' : 'Check-out' }}</div>
                    <div class="text-secondary small">
                      {{ action() === 'checkin' ? 'Fill your details to mark entry.' : 'Use the same email to mark exit.' }}
                    </div>
                  </div>
                  <span class="badge" [class.text-bg-primary]="action() === 'checkin'" [class.text-bg-success]="action() === 'checkout'">
                    {{ action() === 'checkin' ? 'IN' : 'OUT' }}
                  </span>
                </div>

                <form class="mt-3" [formGroup]="form" (ngSubmit)="submit()">
                  <div class="row g-3">
                    <div class="col-12">
                      <label class="form-label">Event ID</label>
                      <input class="form-control" formControlName="event_id" placeholder="Paste event UUID" />
                      <div class="form-text">Ask organizer for the Event ID.</div>
                    </div>

                    <div class="col-md-6" *ngIf="action() === 'checkin'">
                      <label class="form-label">Name</label>
                      <input class="form-control" formControlName="name" placeholder="Full name" />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Email</label>
                      <input class="form-control" formControlName="email" placeholder="you@example.com" />
                    </div>

                    <div class="col-md-6" *ngIf="action() === 'checkin'">
                      <label class="form-label">Phone (optional)</label>
                      <input class="form-control" formControlName="phone" />
                    </div>
                    <div class="col-md-6" *ngIf="action() === 'checkin'">
                      <label class="form-label">Organization (optional)</label>
                      <input class="form-control" formControlName="organization" />
                    </div>
                  </div>

                  <div class="d-flex align-items-center gap-3 mt-3">
                    <button class="btn btn-dark" type="submit" [disabled]="submitting() || form.invalid">
                      <span *ngIf="!submitting()">Confirm</span>
                      <span *ngIf="submitting()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      <span *ngIf="submitting()" class="ms-2">Saving…</span>
                    </button>
                    <div class="text-danger small" *ngIf="error()">{{ error() }}</div>
                  </div>
                </form>
              </div>
            </div>

            <div class="col-lg-4">
              <div class="border rounded-3 p-3 h-100">
                <div class="fw-semibold mb-2">Status</div>
                <div class="text-secondary small" *ngIf="!result()">No action yet.</div>
                <div *ngIf="result()">
                  <div class="alert alert-success mb-3">
                    <div class="fw-semibold text-capitalize">{{ result()?.status }}</div>
                    <div class="small text-secondary">
                      Check-in: {{ result()?.attendee?.checked_in_at || '—' }}<br />
                      Check-out: {{ result()?.attendee?.checked_out_at || '—' }}
                    </div>
                  </div>
                  <div class="small text-secondary">If you made a mistake, contact the organizer.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AttendanceComponent {
  action = signal<'checkin' | 'checkout'>('checkin');
  submitting = signal(false);
  error = signal<string | null>(null);
  result = signal<AttendanceResponse | null>(null);

  form = new FormGroup({
    event_id: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl<string | null>(null, { validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl<string | null>(null),
    organization: new FormControl<string | null>(null),
  });

  constructor(private api: ApiService, private toast: ToastService) {}

  setAction(a: 'checkin' | 'checkout') {
    this.action.set(a);
    const name = this.form.controls.name;
    if (a === 'checkin') {
      name.setValidators([Validators.required]);
    } else {
      name.clearValidators();
      name.setValue(null);
    }
    name.updateValueAndValidity();
  }

  submit() {
    this.error.set(null);
    this.result.set(null);
    this.submitting.set(true);

    const raw = this.form.getRawValue();
    this.api
      .markAttendance({
        event_id: raw.event_id.trim(),
        action: this.action(),
        name: raw.name,
        email: raw.email.trim(),
        phone: raw.phone,
        organization: raw.organization,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.result.set(res);
          this.toast.success('Attendance saved', res.status === 'checked_in' ? 'Checked-in successfully.' : 'Checked-out successfully.');
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.detail || err?.message || 'Failed to submit');
          this.toast.error('Save failed', this.error() || undefined);
        },
      });
  }

  // Certificate management is handled in organizer dashboard.
}

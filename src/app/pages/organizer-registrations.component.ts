import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, AttendeeOut, EventOut } from '../api.service';
import { ToastService } from '../toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="card">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <div>
            <h1 class="h5 mb-1 fw-bold">Registrations</h1>
            <div class="text-secondary small">View check-in/out, generate and download certificates.</div>
          </div>
          <button class="btn btn-outline-secondary btn-sm" (click)="loadEvents()">Refresh</button>
        </div>

        <form class="row g-2 align-items-end mt-2" [formGroup]="form" (ngSubmit)="loadRegistrations()">
          <div class="col-md-8">
            <label class="form-label">Event</label>
            <select class="form-select" formControlName="eventId">
              <option value="" disabled>Select event</option>
              <option *ngFor="let e of events()" [value]="e.id">{{ e.title }} ({{ e.id }})</option>
            </select>
          </div>
          <div class="col-md-4 d-flex gap-2">
            <button class="btn btn-primary w-100" type="submit" [disabled]="form.invalid || loading()">
              <span *ngIf="!loading()">Load</span>
              <span *ngIf="loading()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
              <span *ngIf="loading()" class="ms-2">Loading…</span>
            </button>
          </div>
        </form>

        <div class="mt-2" *ngIf="form.getRawValue().eventId">
          <a class="link-primary small" [routerLink]="['/organizer/certificates']" [queryParams]="{ eventId: form.getRawValue().eventId }">
            Edit certificate template for this event
          </a>
        </div>

        <div class="alert alert-danger mt-3 mb-0" *ngIf="error()">{{ error() }}</div>
      </div>
    </div>

    <div class="card mt-3" *ngIf="attendees().length > 0">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h2 class="h6 mb-0 fw-semibold">Attendees</h2>
          <div class="text-secondary small">{{ attendees().length }} total</div>
        </div>

        <div class="table-responsive mt-3">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Certificate</th>
                <th style="width: 260px;" class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let a of attendees()">
                <td class="fw-semibold">{{ a.name }}</td>
                <td class="text-secondary">{{ a.email }}</td>
                <td><span class="small">{{ a.checked_in_at || '—' }}</span></td>
                <td><span class="small">{{ a.checked_out_at || '—' }}</span></td>
                <td>
                  <span class="badge text-bg-light border" *ngIf="!a.certificate_sent_at">Not generated</span>
                  <span class="badge text-bg-success" *ngIf="a.certificate_sent_at">Generated</span>
                </td>
                <td class="text-end">
                  <div class="d-inline-flex gap-2 flex-wrap justify-content-end">
                    <button
                      class="btn btn-outline-success btn-sm"
                      [disabled]="!a.checked_in_at || busyId() === a.id"
                      (click)="dispatch(a.id)"
                      title="Generate/dispatch certificate"
                    >
                      <span *ngIf="busyId() !== a.id">Generate</span>
                      <span *ngIf="busyId() === a.id" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      <span *ngIf="busyId() === a.id" class="ms-2">Working…</span>
                    </button>
                    <button
                      class="btn btn-outline-primary btn-sm"
                      [disabled]="!a.checked_in_at || busyId() === a.id"
                      (click)="download(a.id, a.name)"
                    >
                      Download PDF
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card mt-3" *ngIf="attendees().length === 0 && loadedOnce()">
      <div class="card-body text-secondary">No registrations for this event yet.</div>
    </div>
  `,
})
export class OrganizerRegistrationsComponent {
  events = signal<EventOut[]>([]);
  attendees = signal<AttendeeOut[]>([]);
  error = signal<string | null>(null);
  loading = signal(false);
  loadedOnce = signal(false);
  busyId = signal<string | null>(null);

  form = new FormGroup({
    eventId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(private api: ApiService, private router: Router, private toast: ToastService) {
    this.loadEvents();
  }

  loadEvents() {
    this.api.listEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        if (!this.form.getRawValue().eventId && events.length > 0) {
          this.form.patchValue({ eventId: events[0].id });
        }
      },
      error: () => {},
    });
  }

  loadRegistrations() {
    this.error.set(null);
    this.loading.set(true);
    this.loadedOnce.set(true);
    const eventId = this.form.getRawValue().eventId;
    this.api.listAttendees(eventId).subscribe({
      next: (rows) => {
        this.loading.set(false);
        this.attendees.set(rows);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail || err?.message || 'Failed to load registrations');
      },
    });
  }

  dispatch(attendeeId: string) {
    this.busyId.set(attendeeId);
    this.api.dispatchCertificate(attendeeId).subscribe({
      next: () => {
        this.busyId.set(null);
        this.loadRegistrations();
        this.toast.success('Certificate generated');
      },
      error: () => {
        this.busyId.set(null);
        this.toast.error('Generate failed');
      },
    });
  }

  download(attendeeId: string, name: string) {
    this.busyId.set(attendeeId);
    this.api.downloadCertificatePdf(attendeeId).subscribe({
      next: (blob) => {
        this.busyId.set(null);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${(name || 'attendee').replaceAll(' ', '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.toast.success('Certificate downloaded');
      },
      error: () => {
        this.busyId.set(null);
        this.toast.error('Download failed');
      },
    });
  }
}

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, EventOut } from '../api.service';
import { ToastService } from '../toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="card">
      <div class="card-body">
      <div class="d-flex align-items-end justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h1 class="h5 mb-1 fw-bold">Create Event</h1>
          <div class="text-secondary small">Create events and share registration links.</div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary" (click)="load()" [disabled]="loading()">Refresh</button>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-12">
              <h2 class="h5 fw-semibold mb-3">Create Event</h2>
              <form [formGroup]="form" (ngSubmit)="create()">
                <div class="row g-3">
                  <div class="col-md-7">
                    <label class="form-label">Title</label>
                    <input class="form-control" formControlName="title" placeholder="Workshop / Seminar name" />
                  </div>
                  <div class="col-md-5">
                    <label class="form-label">Location</label>
                    <input class="form-control" formControlName="location" placeholder="Optional" />
                  </div>
                  <div class="col-12">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" formControlName="description" rows="4" placeholder="Optional"></textarea>
                  </div>
                </div>
                <div class="d-flex align-items-center gap-3 mt-3">
                  <button class="btn btn-primary" type="submit" [disabled]="form.invalid || creating()">
                    <span *ngIf="!creating()">Create</span>
                    <span *ngIf="creating()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span *ngIf="creating()" class="ms-2">Creating…</span>
                  </button>
                  <div class="text-danger small" *ngIf="error()">{{ error() }}</div>
                </div>
              </form>
        </div>
      </div>

      <hr class="my-4" />
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h2 class="h5 mb-0 fw-semibold">Events</h2>
            <div *ngIf="loading()" class="text-secondary small">
              <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading…
            </div>
          </div>

          <div class="alert alert-danger mt-3 mb-0" *ngIf="listError()">{{ listError() }}</div>

          <div *ngIf="events().length === 0 && !listError()" class="text-secondary mt-3">
            No events yet. Create your first event to generate a registration link.
          </div>

          <div class="table-responsive mt-3" *ngIf="events().length > 0">
            <table class="table align-middle">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Location</th>
                  <th>State</th>
                  <th style="width: 290px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let e of events()">
                  <td>
                    <div class="fw-semibold">{{ e.title }}</div>
                    <div class="text-secondary small">ID: {{ e.id }}</div>
                  </td>
                  <td class="text-secondary">{{ e.location || '—' }}</td>
                  <td>
                    <span class="badge" [class.text-bg-success]="!e.is_closed" [class.text-bg-secondary]="e.is_closed">
                      {{ e.is_closed ? 'Closed' : 'Open' }}
                    </span>
                  </td>
                  <td>
                    <div class="d-flex gap-2 flex-wrap justify-content-end">
                      <a class="btn btn-outline-primary btn-sm" [routerLink]="['/events', e.id, 'register']"
                        >Registration</a
                      >
                      <a class="btn btn-primary btn-sm" [routerLink]="['/organizer/events', e.id]">Open</a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
      </div>
    </div>
  `,
})
export class AdminEventsComponent {
  events = signal<EventOut[]>([]);
  listError = signal<string | null>(null);
  error = signal<string | null>(null);
  creating = signal(false);
  loading = signal(false);

  form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    location: new FormControl<string | null>(null),
    description: new FormControl<string | null>(null),
  });

  constructor(private api: ApiService, private toast: ToastService) {
    this.load();
  }

  load() {
    this.listError.set(null);
    this.loading.set(true);
    this.api.listEvents().subscribe({
      next: (events) => {
        this.loading.set(false);
        this.events.set(events);
      },
      error: (err) => {
        this.loading.set(false);
        this.listError.set(err?.error?.detail || err?.message || 'Failed to load events');
      },
    });
  }

  create() {
    this.error.set(null);
    this.creating.set(true);
    this.api.createEvent(this.form.getRawValue()).subscribe({
      next: () => {
        this.creating.set(false);
        this.form.reset({ title: '', location: null, description: null });
        this.load();
        this.toast.success('Event created');
      },
      error: (err) => {
        this.creating.set(false);
        this.error.set(err?.error?.detail || err?.message || 'Failed to create event');
        this.toast.error('Create failed', this.error() || undefined);
      },
    });
  }

}

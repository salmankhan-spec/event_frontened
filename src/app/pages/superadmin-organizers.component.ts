import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SuperAdminAuthService } from '../superadmin-auth.service';
import { SuperAdminService, OrganizerOut } from '../superadmin.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="card">
      <div class="card-body">
        <div class="d-flex align-items-end justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h1 class="h5 mb-1 fw-bold">Organizers</h1>
            <div class="text-secondary small">Create organizer accounts (OTP login).</div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary" (click)="load()" [disabled]="loading()">Refresh</button>
          </div>
        </div>

        <div class="alert alert-warning" *ngIf="auth.firstLogin()">
          First login detected. Change your password in Settings.
        </div>

        <h2 class="h6 fw-semibold mb-3">Create Organizer</h2>
        <form [formGroup]="form" (ngSubmit)="create()">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Email</label>
              <input class="form-control" formControlName="email" placeholder="org1@example.com" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Name (optional)</label>
              <input class="form-control" formControlName="name" placeholder="Org 1" />
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

        <hr class="my-4" />

        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h2 class="h6 mb-0 fw-semibold">Existing Organizers</h2>
          <div *ngIf="loading()" class="text-secondary small">
            <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading…
          </div>
        </div>

        <div class="alert alert-danger mt-3 mb-0" *ngIf="listError()">{{ listError() }}</div>
        <div *ngIf="organizers().length === 0 && !listError()" class="text-secondary mt-3">No organizers yet.</div>

        <div class="table-responsive mt-3" *ngIf="organizers().length > 0">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Active</th>
                <th>Created</th>
                <th style="width: 160px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of organizers()">
                <td>
                  <div class="fw-semibold">{{ o.email }}</div>
                  <div class="text-secondary small">ID: {{ o.id }}</div>
                </td>
                <td class="text-secondary">{{ o.name || '—' }}</td>
                <td>
                  <span class="badge" [class.text-bg-success]="o.is_active" [class.text-bg-secondary]="!o.is_active">
                    {{ o.is_active ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td class="text-secondary small">{{ o.created_at }}</td>
                <td class="text-end">
                  <button
                    class="btn btn-sm"
                    [class.btn-outline-danger]="o.is_active"
                    [class.btn-outline-success]="!o.is_active"
                    (click)="toggleActive(o)"
                  >
                    {{ o.is_active ? 'Deactivate' : 'Activate' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class SuperAdminOrganizersComponent {
  organizers = signal<OrganizerOut[]>([]);
  listError = signal<string | null>(null);
  error = signal<string | null>(null);
  creating = signal(false);
  loading = signal(false);

  form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    name: new FormControl<string | null>(null),
  });

  constructor(public auth: SuperAdminAuthService, private api: SuperAdminService) {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.listError.set(null);
    this.api.listOrganizers().subscribe({
      next: (rows) => {
        this.loading.set(false);
        this.organizers.set(rows);
      },
      error: (err) => {
        this.loading.set(false);
        this.listError.set(err?.error?.detail || err?.message || 'Failed to load organizers');
      },
    });
  }


  create() {
    this.error.set(null);
    this.creating.set(true);
    const raw = this.form.getRawValue();
    this.api.createOrganizer({ email: raw.email.trim(), name: raw.name || null }).subscribe({
      next: (created) => {
        this.creating.set(false);
        this.organizers.set([created, ...this.organizers()]);
        this.form.reset({ email: '', name: null });
      },
      error: (err) => {
        this.creating.set(false);
        this.error.set(err?.error?.detail || err?.message || 'Create failed');
      },
    });
  }

  toggleActive(o: OrganizerOut) {
    const next = !o.is_active;
    this.api.setOrganizerActive(o.id, next).subscribe({
      next: (updated) => {
        this.organizers.set(this.organizers().map((x) => (x.id === updated.id ? updated : x)));
      },
      error: (err) => {
        this.listError.set(err?.error?.detail || err?.message || 'Update failed');
      },
    });
  }

}

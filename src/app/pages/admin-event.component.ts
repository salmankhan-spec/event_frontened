import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, AttendeeOut, EventOut, TemplateOut } from '../api.service';
import { ToastService } from '../toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="container py-4">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <a routerLink="/organizer/events" class="link-secondary text-decoration-none">← Back to events</a>
          <h1 class="h4 mb-1 mt-2 fw-bold">{{ event()?.title || 'Event' }}</h1>
          <div class="text-secondary small">Event ID: {{ eventId }}</div>
        </div>
        <div class="d-flex gap-2">
          <a class="btn btn-outline-primary btn-sm" [routerLink]="['/events', eventId, 'register']">Open registration</a>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-5">
          <div class="card">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between">
                <h2 class="h6 mb-0 fw-semibold">QR Scanner</h2>
                <span class="badge" [class.text-bg-primary]="scanAction() === 'checkin'" [class.text-bg-success]="scanAction() === 'checkout'">
                  {{ scanAction() === 'checkin' ? 'Check-in' : 'Check-out' }}
                </span>
              </div>

              <form class="mt-3" [formGroup]="scanForm" (ngSubmit)="scan()">
                <label class="form-label">Scanned QR payload (or token)</label>
                <input class="form-control" formControlName="payload" placeholder="ev:...;tok:... or token" />

                <div class="d-flex gap-2 mt-3 flex-wrap">
                  <button type="button" class="btn btn-outline-primary btn-sm" (click)="setAction('checkin')">
                    Use Check-in
                  </button>
                  <button type="button" class="btn btn-outline-success btn-sm" (click)="setAction('checkout')">
                    Use Check-out
                  </button>
                </div>

                <div class="d-flex align-items-center gap-3 mt-3">
                  <button class="btn btn-dark" type="submit" [disabled]="scanForm.invalid || scanning()">
                    <span *ngIf="!scanning()">Submit</span>
                    <span *ngIf="scanning()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span *ngIf="scanning()" class="ms-2">Scanning…</span>
                  </button>
                  <div class="text-danger small" *ngIf="scanError()">{{ scanError() }}</div>
                </div>
              </form>

              <div *ngIf="scanResult()" class="alert alert-light border mt-3 mb-0">
                <div class="fw-semibold">Status: {{ scanResult()?.status }}</div>
                <div class="text-secondary small">
                  {{ scanResult()?.attendee?.name }} • {{ scanResult()?.attendee?.email }}
                </div>
              </div>
            </div>
          </div>

          <div class="card mt-3">
            <div class="card-body">
              <h2 class="h6 fw-semibold mb-2">Registration Link</h2>
              <div class="input-group">
                <input class="form-control" [value]="registrationUrl()" readonly />
                <button class="btn btn-outline-secondary" type="button" (click)="copy(registrationUrl())">Copy</button>
              </div>
              <div class="form-text">Share this link to attendees.</div>
            </div>
          </div>
        </div>

        <div class="col-lg-7">
          <div class="card">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <h2 class="h6 mb-0 fw-semibold">Certificate Template</h2>
                <div class="text-secondary small" *ngIf="tpl()?.updated_at">Updated: {{ tpl()?.updated_at }}</div>
              </div>

              <form class="mt-3" [formGroup]="tplForm" (ngSubmit)="saveTemplate()">
                <div class="row g-3">
                  <div class="col-md-7">
                    <label class="form-label">Title</label>
                    <input class="form-control" formControlName="title" />
                  </div>
                  <div class="col-md-5">
                    <label class="form-label">Background</label>
                    <input class="form-control" formControlName="background_hex" placeholder="#FFFFFF" />
                    <div class="form-text">Hex color like #FFFFFF</div>
                  </div>
                  <div class="col-12">
                    <label class="form-label">Body (supports &#123;name&#125;, &#123;event_title&#125;, &#123;date&#125;)</label>
                    <textarea class="form-control" formControlName="body" rows="6"></textarea>
                  </div>
                  <div class="col-12">
                    <label class="form-label">Issuer name</label>
                    <input class="form-control" formControlName="issuer_name" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Logo URL (optional)</label>
                    <input class="form-control" formControlName="logo_url" placeholder="https://..." />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Signature URL (optional)</label>
                    <input class="form-control" formControlName="signature_url" placeholder="https://..." />
                  </div>
                </div>
                <div class="d-flex align-items-center gap-3 mt-3">
                  <button class="btn btn-primary" type="submit" [disabled]="tplSaving()">
                    <span *ngIf="!tplSaving()">Save</span>
                    <span *ngIf="tplSaving()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span *ngIf="tplSaving()" class="ms-2">Saving…</span>
                  </button>
                  <div class="text-danger small" *ngIf="tplError()">{{ tplError() }}</div>
                </div>
              </form>
            </div>
          </div>

          <div class="card mt-3">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <h2 class="h6 mb-0 fw-semibold">Attendees</h2>
                <div class="d-flex gap-2">
                  <button class="btn btn-outline-secondary btn-sm" (click)="loadAttendees()">Refresh</button>
                  <button class="btn btn-dark btn-sm" (click)="closeEvent()" [disabled]="closing()">
                    <span *ngIf="!closing()">Close event & dispatch</span>
                    <span *ngIf="closing()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span *ngIf="closing()" class="ms-2">Closing…</span>
                  </button>
                </div>
              </div>

              <div class="alert alert-danger mt-3 mb-0" *ngIf="attError()">{{ attError() }}</div>
              <div class="text-secondary mt-3" *ngIf="attendees().length === 0 && !attError()">No registrations yet.</div>

              <div class="table-responsive mt-3" *ngIf="attendees().length > 0">
                <table class="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th style="width: 180px;">Certificate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let a of attendees()">
                      <td class="fw-semibold">{{ a.name }}</td>
                      <td class="text-secondary">{{ a.email }}</td>
                      <td>
                        <span class="badge text-bg-light border" *ngIf="!a.checked_in_at">—</span>
                        <span class="small" *ngIf="a.checked_in_at">{{ a.checked_in_at }}</span>
                      </td>
                      <td>
                        <span class="badge text-bg-light border" *ngIf="!a.checked_out_at">—</span>
                        <span class="small" *ngIf="a.checked_out_at">{{ a.checked_out_at }}</span>
                      </td>
                      <td class="text-end">
                        <button
                          class="btn btn-outline-primary btn-sm"
                          *ngIf="a.checked_in_at"
                          (click)="downloadCertificate(a.id, a.name)"
                          [disabled]="downloadingId() === a.id"
                        >
                          <span *ngIf="downloadingId() !== a.id">Download PDF</span>
                          <span *ngIf="downloadingId() === a.id" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                          <span *ngIf="downloadingId() === a.id" class="ms-2">Downloading…</span>
                        </button>
                        <span class="text-secondary small" *ngIf="!a.checked_in_at">Not eligible</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminEventComponent {
  eventId: string;
  event = signal<EventOut | null>(null);

  attendees = signal<AttendeeOut[]>([]);
  attError = signal<string | null>(null);

  scanAction = signal<'checkin' | 'checkout'>('checkin');
  scanning = signal(false);
  scanError = signal<string | null>(null);
  scanResult = signal<any | null>(null);

  tpl = signal<TemplateOut | null>(null);
  tplSaving = signal(false);
  tplError = signal<string | null>(null);

  closing = signal(false);
  downloadingId = signal<string | null>(null);

  scanForm = new FormGroup({
    payload: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  tplForm = new FormGroup({
    title: new FormControl<string | null>(null),
    body: new FormControl<string | null>(null),
    issuer_name: new FormControl<string | null>(null),
    background_hex: new FormControl<string | null>('#FFFFFF', { validators: [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)] }),
    logo_url: new FormControl<string | null>(null),
    signature_url: new FormControl<string | null>(null),
  });

  constructor(route: ActivatedRoute, private api: ApiService, private toast: ToastService) {
    this.eventId = route.snapshot.paramMap.get('eventId') || '';
    this.loadEvent();
    this.loadAttendees();
    this.loadTemplate();
  }

  setAction(action: 'checkin' | 'checkout') {
    this.scanAction.set(action);
  }

  scan() {
    this.scanError.set(null);
    this.scanResult.set(null);
    this.scanning.set(true);
    this.api.scan(this.eventId, { payload: this.scanForm.getRawValue().payload, action: this.scanAction() }).subscribe({
      next: (res) => {
        this.scanning.set(false);
        this.scanResult.set(res);
        this.scanForm.reset({ payload: '' });
        this.loadAttendees();
      },
      error: (err) => {
        this.scanning.set(false);
        this.scanError.set(err?.error?.detail || err?.message || 'Scan failed');
      },
    });
  }

  loadEvent() {
    this.api.getEvent(this.eventId).subscribe({
      next: (e) => this.event.set(e),
      error: () => this.event.set(null),
    });
  }

  loadAttendees() {
    this.attError.set(null);
    this.api.listAttendees(this.eventId).subscribe({
      next: (a) => this.attendees.set(a),
      error: (err) => this.attError.set(err?.error?.detail || err?.message || 'Failed to load attendees'),
    });
  }

  loadTemplate() {
    this.tplError.set(null);
    this.api.getTemplate(this.eventId).subscribe({
      next: (t) => {
        this.tpl.set(t);
        this.tplForm.reset({
          title: t.title,
          body: t.body,
          issuer_name: t.issuer_name,
          background_hex: t.background_hex,
          logo_url: t.logo_url,
          signature_url: t.signature_url,
        });
      },
      error: () => {
        this.tpl.set(null);
      },
    });
  }

  saveTemplate() {
    this.tplError.set(null);
    this.tplSaving.set(true);
    this.api.upsertTemplate(this.eventId, this.tplForm.getRawValue()).subscribe({
      next: (t) => {
        this.tplSaving.set(false);
        this.tpl.set(t);
        this.toast.success('Template saved');
      },
      error: (err) => {
        this.tplSaving.set(false);
        this.tplError.set(err?.error?.detail || err?.message || 'Failed to save template');
        this.toast.error('Save failed', this.tplError() || undefined);
      },
    });
  }

  closeEvent() {
    this.closing.set(true);
    this.api.closeEvent(this.eventId).subscribe({
      next: () => {
        this.closing.set(false);
        this.loadEvent();
        this.toast.success('Event closed', 'Certificate dispatch queued (if enabled).');
      },
      error: () => {
        this.closing.set(false);
        this.toast.error('Close failed');
      },
    });
  }

  registrationUrl(): string {
    return `${window.location.origin}/events/${this.eventId}/register`;
  }

  async copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  }

  downloadCertificate(attendeeId: string, name: string) {
    this.downloadingId.set(attendeeId);
    this.api.downloadCertificatePdf(attendeeId).subscribe({
      next: (blob) => {
        this.downloadingId.set(null);
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
        this.downloadingId.set(null);
        this.toast.error('Download failed');
      },
    });
  }
}

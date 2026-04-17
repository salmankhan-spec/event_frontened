import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService, EventOut, TemplateOut } from '../api.service';
import { ToastService } from '../toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="card">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <div>
            <h1 class="h5 mb-1 fw-bold">Certificate Template</h1>
            <div class="text-secondary small">
              Per-event template. Dynamic placeholders: <code>&#123;name&#125;</code> <code>&#123;event_title&#125;</code>
              <code>&#123;date&#125;</code> <code>&#123;email&#125;</code> <code>&#123;organization&#125;</code>
            </div>
          </div>
          <button class="btn btn-outline-secondary btn-sm" (click)="loadEvents()">Refresh</button>
        </div>

        <form class="row g-2 align-items-end mt-2" [formGroup]="eventForm" (ngSubmit)="loadTemplate()">
          <div class="col-md-8">
            <label class="form-label">Event</label>
            <select class="form-select" formControlName="eventId">
              <option value="" disabled>Select event</option>
              <option *ngFor="let e of events()" [value]="e.id">{{ e.title }} ({{ e.id }})</option>
            </select>
          </div>
          <div class="col-md-4 d-flex gap-2">
            <button class="btn btn-primary w-100" type="submit" [disabled]="eventForm.invalid || loading()">
              <span *ngIf="!loading()">Load</span>
              <span *ngIf="loading()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
              <span *ngIf="loading()" class="ms-2">Loading…</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="card mt-3" *ngIf="selectedEventId()">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <div class="fw-semibold">Edit Template</div>
            <div class="text-secondary small" *ngIf="template()">Updated: {{ template()?.updated_at }}</div>
          </div>
          <div class="text-danger small" *ngIf="error()">{{ error() }}</div>
        </div>

        <form [formGroup]="tplForm" (ngSubmit)="saveTemplate()">
          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label">Title</label>
              <input class="form-control" formControlName="title" />
            </div>
            <div class="col-md-4">
              <label class="form-label">Background</label>
              <input class="form-control" formControlName="background_hex" placeholder="#FFFFFF" />
              <div class="form-text">Hex color like #FFFFFF</div>
            </div>

            <div class="col-12">
              <label class="form-label">Body</label>
              <textarea class="form-control" formControlName="body" rows="7"></textarea>
	              <div class="form-text">
	                Example: <code>This is to certify that &#123;name&#125; attended &#123;event_title&#125; on &#123;date&#125;.</code>
	              </div>
            </div>

            <div class="col-md-6">
              <label class="form-label">Issuer name</label>
              <input class="form-control" formControlName="issuer_name" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Logo URL (optional)</label>
              <input class="form-control" formControlName="logo_url" placeholder="https://..." />
              <div class="form-text">Use a direct PNG/JPG URL (SVG pages won’t render). You can also paste a data: URL.</div>
            </div>
            <div class="col-md-6">
              <label class="form-label">Signature URL (optional)</label>
              <input class="form-control" formControlName="signature_url" placeholder="https://..." />
              <div class="form-text">Use a direct PNG/JPG URL for best results.</div>
            </div>
          </div>

	          <div class="d-flex align-items-center gap-3 mt-3">
	            <button class="btn btn-primary" type="submit" [disabled]="saving()">
	              <span *ngIf="!saving()">Save Template</span>
	              <span *ngIf="saving()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
	              <span *ngIf="saving()" class="ms-2">Saving…</span>
	            </button>
	            <button class="btn btn-outline-secondary" type="button" (click)="preview()" [disabled]="previewing() || saving()">
	              <span *ngIf="!previewing()">Preview PDF</span>
	              <span *ngIf="previewing()" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
	              <span *ngIf="previewing()" class="ms-2">Generating…</span>
	            </button>
	            <div class="text-success small" *ngIf="saved()">Saved</div>
	          </div>
        </form>
      </div>
    </div>
  `,
})
export class OrganizerCertificatesComponent {
  events = signal<EventOut[]>([]);
  template = signal<TemplateOut | null>(null);
  selectedEventId = signal<string | null>(null);

  loading = signal(false);
  saving = signal(false);
  saved = signal(false);
  previewing = signal(false);
  error = signal<string | null>(null);

  eventForm = new FormGroup({
    eventId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  tplForm = new FormGroup({
    title: new FormControl<string | null>(null),
    body: new FormControl<string | null>(null),
    issuer_name: new FormControl<string | null>(null),
    background_hex: new FormControl<string | null>('#FFFFFF', { validators: [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)] }),
    logo_url: new FormControl<string | null>(null),
    signature_url: new FormControl<string | null>(null),
  });

  constructor(private api: ApiService, private toast: ToastService, route: ActivatedRoute) {
    const fromUrl = route.snapshot.queryParamMap.get('eventId');
    if (fromUrl) this.eventForm.patchValue({ eventId: fromUrl });
    this.loadEvents();
  }

  loadEvents() {
    this.api.listEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        if (!this.eventForm.getRawValue().eventId && events.length > 0) {
          this.eventForm.patchValue({ eventId: events[0].id });
          this.loadTemplate();
        } else if (this.eventForm.getRawValue().eventId) {
          this.loadTemplate();
        }
      },
      error: () => {},
    });
  }

  loadTemplate() {
    this.error.set(null);
    this.saved.set(false);
    const eventId = this.eventForm.getRawValue().eventId;
    this.selectedEventId.set(eventId);
    this.loading.set(true);
    this.api.getTemplate(eventId).subscribe({
      next: (t) => {
        this.loading.set(false);
        this.template.set(t);
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
        this.loading.set(false);
        // If template not found, allow saving to create it.
        this.template.set(null);
        this.tplForm.reset({
          title: 'Certificate of Participation',
          body: 'This is to certify that {name} attended {event_title} on {date}.',
          issuer_name: null,
          background_hex: '#FFFFFF',
          logo_url: null,
          signature_url: null,
        });
      },
    });
  }

  saveTemplate() {
    const eventId = this.selectedEventId();
    if (!eventId) return;
    this.error.set(null);
    this.saved.set(false);
    this.saving.set(true);
    this.api.upsertTemplate(eventId, this.tplForm.getRawValue()).subscribe({
      next: (t) => {
        this.saving.set(false);
        this.saved.set(true);
        this.template.set(t);
        this.toast.success('Template saved');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.detail || err?.message || 'Failed to save template');
        this.toast.error('Save failed', this.error() || undefined);
      },
    });
  }

  preview() {
    const eventId = this.selectedEventId();
    if (!eventId) return;
    this.error.set(null);
    this.previewing.set(true);
    this.api.previewCertificateTemplatePdf(eventId).subscribe({
      next: (blob) => {
        this.previewing.set(false);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
        this.toast.success('Preview opened');
      },
      error: (err) => {
        this.previewing.set(false);
        this.error.set(err?.error?.detail || err?.message || 'Failed to preview PDF');
        this.toast.error('Preview failed', this.error() || undefined);
      },
    });
  }
}

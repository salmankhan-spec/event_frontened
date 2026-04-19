import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService, EventOut, TemplateOut } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './organizer-certificates.component.html',
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
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      this.toast.error('Validation required', 'Please select an event first.');
      return;
    }
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
    if (this.tplForm.invalid) {
      this.tplForm.markAllAsTouched();
      this.toast.error('Validation required', 'Please fix the template fields first.');
      return;
    }
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





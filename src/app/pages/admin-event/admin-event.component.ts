import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, AttendeeOut, EventOut, TemplateOut } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './admin-event.component.html',
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
    if (this.scanForm.invalid) {
      this.scanForm.markAllAsTouched();
      this.toast.error('Validation required', 'Please paste the QR payload or token.');
      return;
    }
    this.scanError.set(null);
    this.scanResult.set(null);
    this.scanning.set(true);
    this.api.scan(this.eventId, { payload: this.scanForm.getRawValue().payload, action: this.scanAction() }).subscribe({
      next: (res) => {
        this.scanning.set(false);
        this.scanResult.set(res);
        this.scanForm.reset({ payload: '' });
        this.loadAttendees();
        this.toast.success('Scan complete', res.status === 'checked_in' ? 'Attendee checked in.' : 'Attendee checked out.');
      },
      error: (err) => {
        this.scanning.set(false);
        this.scanError.set(err?.error?.detail || err?.message || 'Scan failed');
        this.toast.error('Scan failed', this.scanError() || undefined);
      },
    });
  }

  loadEvent() {
    this.api.getEvent(this.eventId).subscribe({
      next: (e) => this.event.set(e),
      error: (err) => {
        this.event.set(null);
        this.toast.error('Load failed', err?.error?.detail || err?.message || 'Failed to load event');
      },
    });
  }

  loadAttendees() {
    this.attError.set(null);
    this.api.listAttendees(this.eventId).subscribe({
      next: (a) => this.attendees.set(a),
      error: (err) => {
        this.attError.set(err?.error?.detail || err?.message || 'Failed to load attendees');
        this.toast.error('Load failed', this.attError() || undefined);
      },
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
        this.toast.warning('Template not found', 'You can create a new template.');
      },
    });
  }

  saveTemplate() {
    this.tplError.set(null);
    if (this.tplForm.invalid) {
      this.tplForm.markAllAsTouched();
      this.toast.error('Validation required', 'Please fix the certificate template fields.');
      return;
    }
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





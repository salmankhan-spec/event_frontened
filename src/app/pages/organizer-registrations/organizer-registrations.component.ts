import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, AttendeeOut, EventOut } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './organizer-registrations.component.html',
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
      error: (err) => {
        this.toast.error('Load failed', err?.error?.detail || err?.message || 'Failed to load events');
      },
    });
  }

  loadRegistrations() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Validation required', 'Please select an event first.');
      return;
    }
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
        this.toast.error('Load failed', this.error() || undefined);
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





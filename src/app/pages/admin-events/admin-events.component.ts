import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, EventOut } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './admin-events.component.html',
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
        this.toast.error('Load failed', this.listError() || undefined);
      },
    });
  }

  create() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Validation required', 'Please enter the event title.');
      return;
    }
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





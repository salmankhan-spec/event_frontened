import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, EventOut, RegisterResponse } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  eventId: string;
  submitting = signal(false);
  error = signal<string | null>(null);
  result = signal<RegisterResponse | null>(null);
  event = signal<EventOut | null>(null);

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl<string | null>(null),
    organization: new FormControl<string | null>(null),
  });

  constructor(route: ActivatedRoute, private api: ApiService, private toast: ToastService) {
    this.eventId = route.snapshot.paramMap.get('eventId') || '';
    this.api.getEvent(this.eventId).subscribe({
      next: (e) => this.event.set(e),
      error: () => this.event.set(null),
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Validation required', 'Please fill name and email.');
      return;
    }
    this.error.set(null);
    this.result.set(null);
    this.submitting.set(true);
    this.api.register(this.eventId, this.form.getRawValue()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.result.set(res);
        this.toast.success('Registered successfully', 'Your QR payload is ready.');
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.detail || err?.message || 'Registration failed');
        this.toast.error('Registration failed', this.error() || undefined);
      },
    });
  }

  async copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  }
}





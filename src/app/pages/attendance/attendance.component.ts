import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, AttendanceResponse } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './attendance.component.html',
})
export class AttendanceComponent {
  action = signal<'checkin' | 'checkout'>('checkin');
  submitting = signal(false);
  error = signal<string | null>(null);
  result = signal<AttendanceResponse | null>(null);

  form = new FormGroup({
    event_id: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl<string | null>(null, { validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl<string | null>(null),
    organization: new FormControl<string | null>(null),
  });

  constructor(private api: ApiService, private toast: ToastService) {}

  setAction(a: 'checkin' | 'checkout') {
    this.action.set(a);
    const name = this.form.controls.name;
    if (a === 'checkin') {
      name.setValidators([Validators.required]);
    } else {
      name.clearValidators();
      name.setValue(null);
    }
    name.updateValueAndValidity();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Validation required', this.action() === 'checkin' ? 'Please fill the required check-in fields.' : 'Please enter event ID and email.');
      return;
    }
    this.error.set(null);
    this.result.set(null);
    this.submitting.set(true);

    const raw = this.form.getRawValue();
    this.api
      .markAttendance({
        event_id: raw.event_id.trim(),
        action: this.action(),
        name: raw.name,
        email: raw.email.trim(),
        phone: raw.phone,
        organization: raw.organization,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.result.set(res);
          this.toast.success('Attendance saved', res.status === 'checked_in' ? 'Checked-in successfully.' : 'Checked-out successfully.');
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.detail || err?.message || 'Failed to submit');
          this.toast.error('Save failed', this.error() || undefined);
        },
      });
  }

  // Certificate management is handled in organizer dashboard.
}





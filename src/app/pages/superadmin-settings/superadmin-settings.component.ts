import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SuperAdminAuthService } from '../../core/services/superadmin-auth.service';
import { SuperAdminOut, SuperAdminService } from '../../core/services/superadmin.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './superadmin-settings.component.html',
})
export class SuperAdminSettingsComponent {
  superAdmins = signal<SuperAdminOut[]>([]);

  pwSaving = signal(false);
  pwError = signal<string | null>(null);
  pwOk = signal(false);

  saError = signal<string | null>(null);
  saCreating = signal(false);

  pwForm = new FormGroup({
    old_password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    new_password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  saForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl<string | null>(null),
    temp_password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  constructor(public auth: SuperAdminAuthService, private api: SuperAdminService, private toast: ToastService) {
    this.loadSuperAdmins();
  }

  loadSuperAdmins() {
    this.api.listSuperAdmins().subscribe({
      next: (rows) => this.superAdmins.set(rows || []),
      error: () => {},
    });
  }

  changePassword() {
    if (this.pwForm.invalid) {
      this.pwForm.markAllAsTouched();
      this.toast.error('Validation required', 'Please enter your old and new password.');
      return;
    }
    this.pwError.set(null);
    this.pwOk.set(false);
    this.pwSaving.set(true);
    const raw = this.pwForm.getRawValue();
    this.auth.changePassword(raw.old_password, raw.new_password).subscribe({
      next: () => {
        this.pwSaving.set(false);
        this.pwOk.set(true);
        this.pwForm.reset({ old_password: '', new_password: '' });
        this.toast.success('Password updated');
      },
      error: (err) => {
        this.pwSaving.set(false);
        this.pwError.set(err?.error?.detail || err?.message || 'Password update failed');
        this.toast.error('Password update failed', this.pwError() || undefined);
      },
    });
  }

  createSuperAdmin() {
    if (this.saForm.invalid) {
      this.saForm.markAllAsTouched();
      this.toast.error('Validation required', 'Please fill the new super admin details.');
      return;
    }
    this.saError.set(null);
    this.saCreating.set(true);
    const raw = this.saForm.getRawValue();
    this.api.createSuperAdmin({ email: raw.email.trim(), name: raw.name || null, temp_password: raw.temp_password }).subscribe({
      next: (created) => {
        this.saCreating.set(false);
        this.superAdmins.set([created, ...this.superAdmins()]);
        this.saForm.reset({ email: '', name: null, temp_password: '' });
        this.toast.success('Super admin created');
      },
      error: (err) => {
        this.saCreating.set(false);
        this.saError.set(err?.error?.detail || err?.message || 'Create failed');
        this.toast.error('Create failed', this.saError() || undefined);
      },
    });
  }
}






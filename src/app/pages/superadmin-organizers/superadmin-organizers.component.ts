import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SuperAdminAuthService } from '../../core/services/superadmin-auth.service';
import { SuperAdminService, OrganizerOut } from '../../core/services/superadmin.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './superadmin-organizers.component.html',
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

  constructor(public auth: SuperAdminAuthService, private api: SuperAdminService, private toast: ToastService) {
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
        this.toast.error('Load failed', this.listError() || undefined);
      },
    });
  }


  create() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Validation required', 'Please enter a valid organizer email.');
      return;
    }
    this.error.set(null);
    this.creating.set(true);
    const raw = this.form.getRawValue();
    this.api.createOrganizer({ email: raw.email.trim(), name: raw.name || null }).subscribe({
      next: (created) => {
        this.creating.set(false);
        this.organizers.set([created, ...this.organizers()]);
        this.form.reset({ email: '', name: null });
        this.toast.success('Organizer created');
      },
      error: (err) => {
        this.creating.set(false);
        this.error.set(err?.error?.detail || err?.message || 'Create failed');
        this.toast.error('Create failed', this.error() || undefined);
      },
    });
  }

  toggleActive(o: OrganizerOut) {
    const next = !o.is_active;
    this.api.setOrganizerActive(o.id, next).subscribe({
      next: (updated) => {
        this.organizers.set(this.organizers().map((x) => (x.id === updated.id ? updated : x)));
        this.toast.success(updated.is_active ? 'Organizer activated' : 'Organizer deactivated');
      },
      error: (err) => {
        this.listError.set(err?.error?.detail || err?.message || 'Update failed');
        this.toast.error('Update failed', this.listError() || undefined);
      },
    });
  }

}





import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

export type ToastKind = 'success' | 'danger' | 'info' | 'warning';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private toastr: ToastrService) {}

  private text(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Error) return value.message || value.name || 'Error';
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  show(kind: ToastKind, title: unknown, message?: unknown) {
    const safeTitle = this.text(title);
    const safeMessage = this.text(message);
    const body = safeMessage || safeTitle;
    const heading = safeMessage ? safeTitle : '';

    if (kind === 'success') return this.toastr.success(body, heading);
    if (kind === 'danger') return this.toastr.error(body, heading);
    if (kind === 'warning') return this.toastr.warning(body, heading);
    return this.toastr.info(body, heading);
  }

  success(title: unknown, message?: unknown) {
    this.show('success', title, message);
  }

  error(title: unknown, message?: unknown) {
    this.show('danger', title, message);
  }

  warning(title: unknown, message?: unknown) {
    this.show('warning', title, message);
  }

  info(title: unknown, message?: unknown) {
    this.show('info', title, message);
  }
}

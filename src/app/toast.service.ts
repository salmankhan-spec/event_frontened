import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'danger' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<ToastItem[]>([]);

  show(kind: ToastKind, title: string, message?: string, timeoutMs = 2500) {
    const id = crypto.randomUUID();
    const item: ToastItem = { id, kind, title, message };
    this.toasts.update((t) => [item, ...t].slice(0, 4));

    window.setTimeout(() => this.dismiss(id), timeoutMs);
  }

  success(title: string, message?: string) {
    this.show('success', title, message);
  }

  error(title: string, message?: string) {
    this.show('danger', title, message, 3500);
  }

  dismiss(id: string) {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}


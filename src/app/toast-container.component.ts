import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack position-fixed top-0 end-0 p-3" style="z-index: 1080;">
      <div
        class="toast show shadow-sm mb-2"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        *ngFor="let t of toast.toasts()"
      >
        <div class="toast-header">
          <span class="me-2 rounded-circle toast-dot" [class]="dotClass(t.kind)"></span>
          <strong class="me-auto">{{ t.title }}</strong>
          <button type="button" class="btn-close" aria-label="Close" (click)="toast.dismiss(t.id)"></button>
        </div>
        <div class="toast-body" *ngIf="t.message">{{ t.message }}</div>
      </div>
    </div>
  `,
})
export class ToastContainerComponent {
  constructor(public toast: ToastService) {}

  dotClass(kind: string) {
    if (kind === 'success') return 'bg-success';
    if (kind === 'danger') return 'bg-danger';
    if (kind === 'warning') return 'bg-warning';
    return 'bg-primary';
  }
}


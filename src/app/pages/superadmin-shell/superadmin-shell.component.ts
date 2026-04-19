import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SuperAdminAuthService } from '../../core/services/superadmin-auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './superadmin-shell.component.html',
})
export class SuperAdminShellComponent {
  constructor(public auth: SuperAdminAuthService, private router: Router, private toast: ToastService) {}

  logout() {
    this.auth.logout();
    this.toast.success('Logged out');
    this.router.navigateByUrl('/superadmin/login');
  }
}





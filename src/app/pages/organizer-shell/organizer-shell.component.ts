import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { OrganizerAuthService } from '../../core/services/organizer-auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './organizer-shell.component.html',
})
export class OrganizerShellComponent {
  constructor(private auth: OrganizerAuthService, private router: Router, private toast: ToastService) {}

  logout() {
    this.auth.logout();
    this.toast.success('Logged out');
    this.router.navigateByUrl('/organizer/login');
  }
}





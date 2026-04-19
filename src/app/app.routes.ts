import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AttendanceComponent } from './pages/attendance/attendance.component';
import { OrganizerLoginComponent } from './pages/organizer-login/organizer-login.component';
import { OrganizerShellComponent } from './pages/organizer-shell/organizer-shell.component';
import { AdminEventsComponent } from './pages/admin-events/admin-events.component';
import { AdminEventComponent } from './pages/admin-event/admin-event.component';
import { RegisterComponent } from './pages/register/register.component';
import { organizerGuard } from './core/guards/organizer.guard';
import { OrganizerRegistrationsComponent } from './pages/organizer-registrations/organizer-registrations.component';
import { OrganizerCertificatesComponent } from './pages/organizer-certificates/organizer-certificates.component';
import { SuperAdminLoginComponent } from './pages/superadmin-login/superadmin-login.component';
import { SuperAdminShellComponent } from './pages/superadmin-shell/superadmin-shell.component';
import { SuperAdminOrganizersComponent } from './pages/superadmin-organizers/superadmin-organizers.component';
import { SuperAdminSettingsComponent } from './pages/superadmin-settings/superadmin-settings.component';
import { superAdminGuard } from './core/guards/superadmin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'attendance', component: AttendanceComponent },
  { path: 'organizer/login', component: OrganizerLoginComponent },
  { path: 'superadmin/login', component: SuperAdminLoginComponent },
  {
    path: 'organizer',
    component: OrganizerShellComponent,
    canActivate: [organizerGuard],
    children: [
      { path: 'events', component: AdminEventsComponent },
      { path: 'events/:eventId', component: AdminEventComponent },
      { path: 'registrations', component: OrganizerRegistrationsComponent },
      { path: 'certificates', component: OrganizerCertificatesComponent },
      { path: '', pathMatch: 'full', redirectTo: 'events' },
    ],
  },
  {
    path: 'superadmin',
    component: SuperAdminShellComponent,
    canActivate: [superAdminGuard],
    children: [
      { path: 'organizers', component: SuperAdminOrganizersComponent },
      { path: 'settings', component: SuperAdminSettingsComponent },
      { path: '', pathMatch: 'full', redirectTo: 'organizers' },
    ],
  },
  { path: 'events/:eventId/register', component: RegisterComponent },
  { path: '**', redirectTo: '' },
];





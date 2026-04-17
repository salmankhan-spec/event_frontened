import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { AttendanceComponent } from './pages/attendance.component';
import { OrganizerLoginComponent } from './pages/organizer-login.component';
import { OrganizerShellComponent } from './pages/organizer-shell.component';
import { AdminEventsComponent } from './pages/admin-events.component';
import { AdminEventComponent } from './pages/admin-event.component';
import { RegisterComponent } from './pages/register.component';
import { organizerGuard } from './organizer.guard';
import { OrganizerRegistrationsComponent } from './pages/organizer-registrations.component';
import { OrganizerCertificatesComponent } from './pages/organizer-certificates.component';
import { SuperAdminLoginComponent } from './pages/superadmin-login.component';
import { SuperAdminShellComponent } from './pages/superadmin-shell.component';
import { SuperAdminOrganizersComponent } from './pages/superadmin-organizers.component';
import { SuperAdminSettingsComponent } from './pages/superadmin-settings.component';
import { superAdminGuard } from './superadmin.guard';

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

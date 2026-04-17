import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OrganizerAuthService } from './organizer-auth.service';

export const organizerGuard: CanActivateFn = () => {
  const auth = inject(OrganizerAuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigateByUrl('/organizer/login');
  return false;
};


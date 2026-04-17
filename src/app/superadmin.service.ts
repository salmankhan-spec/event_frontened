import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiBaseUrl } from './config';
import { SuperAdminAuthService } from './superadmin-auth.service';

export type OrganizerOut = {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  created_by_id: string | null;
  created_at: string;
};

export type SuperAdminOut = {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  first_login: boolean;
  created_by_id: string | null;
  created_at: string;
};

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  constructor(private http: HttpClient, private auth: SuperAdminAuthService) {}

  private headers() {
    return { Authorization: `Bearer ${this.auth.token()}` };
  }

  listOrganizers(): Observable<OrganizerOut[]> {
    return this.http.get<OrganizerOut[]>(`${apiBaseUrl()}/admin/organizers`, { headers: this.headers() });
  }

  createOrganizer(payload: { email: string; name?: string | null }): Observable<OrganizerOut> {
    return this.http.post<OrganizerOut>(`${apiBaseUrl()}/admin/organizers`, payload, { headers: this.headers() });
  }

  setOrganizerActive(organizerId: string, is_active: boolean): Observable<OrganizerOut> {
    return this.http.patch<OrganizerOut>(
      `${apiBaseUrl()}/admin/organizers/${organizerId}`,
      { is_active },
      { headers: this.headers() }
    );
  }

  listSuperAdmins(): Observable<SuperAdminOut[]> {
    return this.http.get<SuperAdminOut[]>(`${apiBaseUrl()}/admin/superadmins`, { headers: this.headers() });
  }

  createSuperAdmin(payload: { email: string; name?: string | null; temp_password: string }): Observable<SuperAdminOut> {
    return this.http.post<SuperAdminOut>(`${apiBaseUrl()}/admin/superadmins`, payload, { headers: this.headers() });
  }
}

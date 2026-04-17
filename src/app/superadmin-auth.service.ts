import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiBaseUrl } from './config';

type SuperAdminLoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  role: string;
  first_login: boolean;
};

@Injectable({ providedIn: "root" })
export class SuperAdminAuthService {
  token(): string {
    return localStorage.getItem('superAdminToken') || '';
  }

  firstLogin(): boolean {
    return (localStorage.getItem('superAdminFirstLogin') || '') === 'true';
  }

  isLoggedIn(): boolean {
    return this.token().trim().length > 0;
  }

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<void> {
    return this.http
      .post<SuperAdminLoginResponse>(`${apiBaseUrl()}/auth/superadmin/login`, { email, password })
      .pipe(
        map((res) => {
          localStorage.setItem('superAdminToken', res.access_token);
          localStorage.setItem('superAdminFirstLogin', String(!!res.first_login));
        })
      );
  }

  changePassword(old_password: string, new_password: string): Observable<void> {
    return this.http
      .post(`${apiBaseUrl()}/auth/superadmin/change-password`, { old_password, new_password }, {
        headers: { Authorization: `Bearer ${this.token()}` },
      })
      .pipe(
        map(() => {
          localStorage.setItem('superAdminFirstLogin', 'false');
        })
      );
  }

  logout(): void {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminFirstLogin');
  }
}


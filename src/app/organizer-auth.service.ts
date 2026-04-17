import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrganizerAuthService {
  apiBaseUrl(): string {
    const raw = (localStorage.getItem('apiBaseUrl') || 'http://localhost:8000').trim();
    return raw.replace(/\/+$/, '');
  }

  apiKey(): string {
    return localStorage.getItem('adminApiKey') || '';
  }

  isLoggedIn(): boolean {
    return (localStorage.getItem('organizerToken') || '').trim().length > 0;
  }

  constructor(private http: HttpClient) {}

  login(apiBaseUrl: string, username: string, password: string): Observable<void> {
    const base = ((apiBaseUrl || '').trim() || 'http://127.0.0.1:8000').replace(/\/+$/, '');
    localStorage.setItem('apiBaseUrl', base);
    return this.http
      .post<{ access_token: string }>(`${base}/auth/login`, { username, password })
      .pipe(
        map((res) => {
          localStorage.setItem('organizerToken', res.access_token);
        })
      );
  }

  logout() {
    localStorage.removeItem('organizerToken');
  }
}

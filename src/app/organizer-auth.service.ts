import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiBaseUrl } from './config';

@Injectable({ providedIn: 'root' })
export class OrganizerAuthService {
  isLoggedIn(): boolean {
    return (localStorage.getItem('organizerToken') || '').trim().length > 0;
  }

  constructor(private http: HttpClient) {}

  requestOtp(email: string): Observable<{ status: string; otp_sent: boolean; dev_otp?: string | null; reason?: string | null }> {
    return this.http.post<{ status: string; otp_sent: boolean; dev_otp?: string | null; reason?: string | null }>(`${apiBaseUrl()}/auth/organizer/request-otp`, {
      email,
    });
  }

  verifyOtp(email: string, otp: string): Observable<void> {
    return this.http
      .post<{ access_token: string }>(`${apiBaseUrl()}/auth/organizer/verify-otp`, { email, otp })
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

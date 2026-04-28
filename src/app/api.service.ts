import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiBaseUrl } from './config';

export type EventCreate = {
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};


export type EventOut = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_closed: boolean;
};

export type AttendeeOut = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  certificate_sent_at: string | null;
  created_at: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
};

export type RegisterResponse = {
  attendee: AttendeeOut;
  qr_payload: string;
};

export type ScanRequest = {
  payload: string;
  action: 'checkin' | 'checkout';
};

export type ScanResponse = {
  attendee: AttendeeOut;
  status: string;
};

export type AttendanceRequest = {
  event_id: string;
  action: 'checkin' | 'checkout';
  name?: string | null;
  email: string;
  phone?: string | null;
  organization?: string | null;
};

export type AttendanceResponse = {
  attendee: AttendeeOut;
  status: string;
  token: string;
};

export type TemplateUpsert = {
  title?: string | null;
  body?: string | null;
  issuer_name?: string | null;
  background_hex?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
};

export type TemplateOut = {
  id: string;
  event_id: string;
  title: string;
  body: string;
  issuer_name: string | null;
  background_hex: string;
  logo_url: string | null;
  signature_url: string | null;
  updated_at: string;
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  organizerToken(): string {
    return localStorage.getItem('organizerToken') || '';
  }

  private adminHeaders(): HttpHeaders {
    const token = this.organizerToken().trim();
    if (token) {
      return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }
    return new HttpHeaders({});
  }

  constructor(private http: HttpClient) {}

  listEvents(): Observable<EventOut[]> {
    return this.http.get<EventOut[]>(`${apiBaseUrl()}/admin/events`, { headers: this.adminHeaders() });
  }

  createEvent(payload: EventCreate): Observable<EventOut> {
    return this.http.post<EventOut>(`${apiBaseUrl()}/admin/events`, payload, { headers: this.adminHeaders() });
  }

  getEvent(eventId: string): Observable<EventOut> {
    return this.http.get<EventOut>(`${apiBaseUrl()}/events/${eventId}`);
  }

  listAttendees(eventId: string): Observable<AttendeeOut[]> {
    return this.http.get<AttendeeOut[]>(`${apiBaseUrl()}/admin/events/${eventId}/attendees`, {
      headers: this.adminHeaders(),
    });
  }

  scan(eventId: string, payload: ScanRequest): Observable<ScanResponse> {
    return this.http.post<ScanResponse>(`${apiBaseUrl()}/admin/events/${eventId}/scan`, payload, {
      headers: this.adminHeaders(),
    });
  }

  closeEvent(eventId: string): Observable<any> {
    return this.http.post(`${apiBaseUrl()}/admin/events/${eventId}/close`, {}, { headers: this.adminHeaders() });
  }

  upsertTemplate(eventId: string, payload: TemplateUpsert): Observable<TemplateOut> {
    return this.http.put<TemplateOut>(`${apiBaseUrl()}/admin/events/${eventId}/template`, payload, {
      headers: this.adminHeaders(),
    });
  }

  getTemplate(eventId: string): Observable<TemplateOut> {
    return this.http.get<TemplateOut>(`${apiBaseUrl()}/admin/events/${eventId}/template`, {
      headers: this.adminHeaders(),
    });
  }

  downloadCertificatePdf(attendeeId: string): Observable<Blob> {
    return this.http.get(`${apiBaseUrl()}/admin/attendees/${attendeeId}/certificate`, {
      headers: this.adminHeaders(),
      responseType: 'blob',
    });
  }

  dispatchCertificate(attendeeId: string): Observable<any> {
    return this.http.post(`${apiBaseUrl()}/admin/attendees/${attendeeId}/certificate/dispatch`, {}, { headers: this.adminHeaders() });
  }

  previewCertificateTemplatePdf(eventId: string): Observable<Blob> {
    return this.http.get(`${apiBaseUrl()}/admin/events/${eventId}/template/preview.pdf`, {
      headers: this.adminHeaders(),
      responseType: 'blob',
    });
  }

  register(eventId: string, payload: RegisterPayload): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${apiBaseUrl()}/events/${eventId}/register`, payload);
  }

  markAttendance(payload: AttendanceRequest): Observable<AttendanceResponse> {
    return this.http.post<AttendanceResponse>(`${apiBaseUrl()}/attendance`, payload);
  }
}

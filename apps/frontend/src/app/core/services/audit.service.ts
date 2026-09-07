import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AuditEventRequest, AuditEventResponse } from '@ai-challenge/shared/audit.types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private readonly apiBase = environment.apiUrl;
  private readonly http = inject(HttpClient);

  logEvent(data: AuditEventRequest): Observable<AuditEventResponse> {
    return this.http.post<AuditEventResponse>(`${this.apiBase}/challenge/v1/audit/events`, data);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { CreateTicketRequest, CreateTicketResponse } from '@ai-challenge/shared/support.types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private readonly apiBase = environment.apiUrl;
  private readonly http = inject(HttpClient);

  createTicket(data: CreateTicketRequest): Observable<CreateTicketResponse> {
    return this.http.post<CreateTicketResponse>(
      `${this.apiBase}/challenge/v1/support/tickets`,
      data,
    );
  }
}

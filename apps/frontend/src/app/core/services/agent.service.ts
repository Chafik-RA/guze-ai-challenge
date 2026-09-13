import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AgentChatRequest {
  message: string;
}

export interface AgentChatResponse {
  intent: string;
  response: string;
  code?: string;
  suggest_handoff?: boolean;
  chips?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AgentService {
  private readonly apiBase = environment.apiUrl;
  private readonly http = inject(HttpClient);

  chat(message: string): Observable<AgentChatResponse> {
    return this.http.post<AgentChatResponse>(`${this.apiBase}/challenge/v1/agent/chat`, {
      message,
    });
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CreateActionDraftRequest,
  CreateActionDraftResponse,
  ConfirmActionResponse,
} from '@ai-challenge/shared/action-draft.types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ActionDraftService {
  private readonly apiBase = environment.apiUrl;
  private readonly http = inject(HttpClient);

  createDraft<T = Record<string, unknown>>(
    data: CreateActionDraftRequest<T>,
  ): Observable<CreateActionDraftResponse<T>> {
    return this.http.post<CreateActionDraftResponse<T>>(
      `${this.apiBase}/challenge/v1/actions/draft`,
      data,
    );
  }

  confirmDraft<T = Record<string, unknown>>(
    actionId: string,
  ): Observable<ConfirmActionResponse<T>> {
    return this.http.post<ConfirmActionResponse<T>>(
      `${this.apiBase}/challenge/v1/actions/confirm`,
      {
        action_id: actionId,
      },
    );
  }
}

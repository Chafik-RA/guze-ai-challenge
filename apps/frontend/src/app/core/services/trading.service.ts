import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AccountType } from '@ai-challenge/shared/account-type.types';
import type {
  MT5Account,
  CreateMT5Request,
  CreateMT5Response,
} from '@ai-challenge/shared/mt5-account.types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TradingService {
  private readonly apiBase = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getAccountTypes(): Observable<{ items: AccountType[] }> {
    return this.http.get<{ items: AccountType[] }>(
      `${this.apiBase}/challenge/v1/trading/account-types`,
    );
  }

  getTradingAccounts(): Observable<{ items: MT5Account[] }> {
    return this.http.get<{ items: MT5Account[] }>(`${this.apiBase}/challenge/v1/trading/accounts`);
  }

  createTradingAccount(
    data: CreateMT5Request,
    options?: { actionId?: string; stepUpToken?: string; idempotencyKey?: string },
  ): Observable<CreateMT5Response> {
    const headers: Record<string, string> = {};
    if (options?.actionId) headers['x-action-id'] = options.actionId;
    if (options?.stepUpToken) headers['x-step-up-token'] = options.stepUpToken;
    if (options?.idempotencyKey) headers['x-idempotency-key'] = options.idempotencyKey;

    return this.http.post<CreateMT5Response>(
      `${this.apiBase}/challenge/v1/trading/accounts`,
      data,
      { headers },
    );
  }
}

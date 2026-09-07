import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  Deposit,
  Withdrawal,
  CreateWithdrawalRequest,
  CreateWithdrawalResponse,
} from '@ai-challenge/shared/transaction.types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly apiBase = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getDeposits(): Observable<{ items: Deposit[] }> {
    return this.http.get<{ items: Deposit[] }>(
      `${this.apiBase}/challenge/v1/transactions/deposits`,
    );
  }

  getDepositById(depositId: string): Observable<Deposit> {
    return this.http.get<Deposit>(
      `${this.apiBase}/challenge/v1/transactions/deposits/${depositId}`,
    );
  }

  getWithdrawals(): Observable<{ items: Withdrawal[] }> {
    return this.http.get<{ items: Withdrawal[] }>(
      `${this.apiBase}/challenge/v1/transactions/withdrawals`,
    );
  }

  getWithdrawalById(withdrawalId: string): Observable<Withdrawal> {
    return this.http.get<Withdrawal>(
      `${this.apiBase}/challenge/v1/transactions/withdrawals/${withdrawalId}`,
    );
  }

  createWithdrawal(
    data: CreateWithdrawalRequest,
    options?: { actionId?: string; stepUpToken?: string; idempotencyKey?: string },
  ): Observable<CreateWithdrawalResponse> {
    const headers: Record<string, string> = {};
    if (options?.actionId) headers['x-action-id'] = options.actionId;
    if (options?.stepUpToken) headers['x-step-up-token'] = options.stepUpToken;
    if (options?.idempotencyKey) headers['x-idempotency-key'] = options.idempotencyKey;

    return this.http.post<CreateWithdrawalResponse>(
      `${this.apiBase}/challenge/v1/transactions/withdrawals`,
      data,
      { headers },
    );
  }
}

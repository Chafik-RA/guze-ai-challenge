import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { OtpVerifyRequest, OtpVerifyResponse } from '@ai-challenge/shared/security.types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private readonly apiBase = environment.apiUrl;
  private readonly http = inject(HttpClient);

  verifyOtp(data: OtpVerifyRequest): Observable<OtpVerifyResponse> {
    return this.http.post<OtpVerifyResponse>(
      `${this.apiBase}/challenge/v1/security/otp/verify`,
      data,
    );
  }
}

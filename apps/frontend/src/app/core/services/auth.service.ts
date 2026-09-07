import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import type { LoginRequest, LoginResponse, MeResponse } from '@ai-challenge/shared/auth.types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiBase = environment.apiUrl;
  private http = inject(HttpClient);

  // Signals for reactive state
  readonly currentUser = signal<LoginResponse['member'] | null>(null);
  readonly userProfile = signal<MeResponse | null>(null);
  readonly token = signal<string | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    const savedToken = localStorage.getItem('ai_challenge_token');
    const savedUser = localStorage.getItem('ai_challenge_user');
    if (savedToken) {
      this.token.set(savedToken);
      if (savedUser) {
        try {
          this.currentUser.set(JSON.parse(savedUser));
        } catch {
          // ignore corrupted json
        }
      }
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiBase}/challenge/v1/auth/login`, credentials).pipe(
      tap((res) => {
        this.token.set(res.access_token);
        this.currentUser.set(res.member);
        localStorage.setItem('ai_challenge_token', res.access_token);
        localStorage.setItem('ai_challenge_user', JSON.stringify(res.member));
      }),
      catchError((err) => {
        return throwError(() => err);
      }),
    );
  }

  fetchProfile(): Observable<MeResponse> {
    const headers = { Authorization: `Bearer ${this.token()}` };
    return this.http.get<MeResponse>(`${this.apiBase}/challenge/v1/auth/me`, { headers }).pipe(
      tap((profile) => {
        this.userProfile.set(profile);
      }),
    );
  }

  logout() {
    this.token.set(null);
    this.currentUser.set(null);
    this.userProfile.set(null);
    localStorage.removeItem('ai_challenge_token');
    localStorage.removeItem('ai_challenge_user');
  }
}

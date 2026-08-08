import { Injectable, inject } from '@angular/core';
import { Observable, delay, of, tap } from 'rxjs';
import { IAuthService } from '../interfaces/auth.service';
import { AuthResponse, AuthTokens, LoginCredentials } from '../models/auth.model';
import { ITokenService } from '../interfaces/token.service';
import { ISessionService } from '../interfaces/session.service';

@Injectable({
  providedIn: 'root'
})
export class MockAuthService implements IAuthService {
  private tokenService = inject(ITokenService);
  private sessionService = inject(ISessionService);

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const mockResponse: AuthResponse = {
      user: {
        id: 'mock-123',
        email: credentials.email,
        name: 'Administrador (Mock)',
        role: 'admin'
      },
      tokens: {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresIn: 3600
      }
    };

    return of(mockResponse).pipe(
      delay(1000), // Simula latência da rede
      tap(response => {
        this.tokenService.setToken(response.tokens.accessToken);
        this.tokenService.setRefreshToken(response.tokens.refreshToken);
        this.sessionService.startSession(response.user);
      })
    );
  }

  logout(): Observable<void> {
    return of(void 0).pipe(
      delay(500),
      tap(() => {
        this.tokenService.clearTokens();
        this.sessionService.endSession();
      })
    );
  }

  refreshToken(refreshToken: string): Observable<AuthTokens> {
    const newTokens: AuthTokens = {
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
      expiresIn: 3600
    };

    return of(newTokens).pipe(
      delay(800),
      tap(tokens => {
        this.tokenService.setToken(tokens.accessToken);
        this.tokenService.setRefreshToken(tokens.refreshToken);
      })
    );
  }
}

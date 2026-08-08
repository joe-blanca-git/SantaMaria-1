import { Injectable } from '@angular/core';
import { ITokenService } from '../interfaces/token.service';

@Injectable({
  providedIn: 'root'
})
export class LocalTokenService implements ITokenService {
  private readonly ACCESS_TOKEN_KEY = 'erp_access_token';
  private readonly REFRESH_TOKEN_KEY = 'erp_refresh_token';

  getToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
}

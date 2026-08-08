import { Observable } from 'rxjs';
import { AuthResponse, AuthTokens, LoginCredentials } from '../models/auth.model';

export abstract class IAuthService {
  abstract login(credentials: LoginCredentials): Observable<AuthResponse>;
  abstract logout(): Observable<void>;
  abstract refreshToken(refreshToken: string): Observable<AuthTokens>;
}

import { Observable } from 'rxjs';
import { Signal } from '@angular/core';
import { AuthResponse, LoginCredentials, RegisterCredentials } from '../models/auth.model';
import { User } from '../models/user.model';

export abstract class IAuthService {
  abstract currentUser: Signal<User | null>;
  abstract isAuthenticated: Signal<boolean>;
  abstract getToken(): string | null;

  abstract login(credentials: LoginCredentials): Observable<AuthResponse>;
  abstract register(credentials: RegisterCredentials): Observable<void>;
  abstract logout(): Observable<void>;
}

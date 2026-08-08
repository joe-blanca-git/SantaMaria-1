import { Signal } from '@angular/core';
import { User } from '../models/user.model';

export abstract class ISessionService {
  abstract currentUser: Signal<User | null>;
  abstract isAuthenticated: Signal<boolean>;
  
  abstract startSession(user: User): void;
  abstract endSession(): void;
}

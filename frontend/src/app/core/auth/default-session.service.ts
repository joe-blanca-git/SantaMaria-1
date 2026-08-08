import { Injectable, signal, computed } from '@angular/core';
import { ISessionService } from '../interfaces/session.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class DefaultSessionService implements ISessionService {
  private _currentUser = signal<User | null>(null);

  currentUser = computed(() => this._currentUser());
  isAuthenticated = computed(() => this._currentUser() !== null);

  startSession(user: User): void {
    this._currentUser.set(user);
  }

  endSession(): void {
    this._currentUser.set(null);
  }
}

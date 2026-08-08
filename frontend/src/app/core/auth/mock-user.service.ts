import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { IUserService } from '../interfaces/user.service';
import { User } from '../models/user.model';
import { MOCK_USERS } from '../mock/users.mock';

@Injectable({
  providedIn: 'root'
})
export class MockUserService implements IUserService {
  // Pegando o admin (usuário 1) como padrão para o mock de perfil logado
  private mockUser: User = MOCK_USERS[0];

  getUserProfile(): Observable<User> {
    return of(this.mockUser).pipe(delay(500));
  }

  updateProfile(user: Partial<User>): Observable<User> {
    this.mockUser = { ...this.mockUser, ...user };
    return of(this.mockUser).pipe(delay(500));
  }
}

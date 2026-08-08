import { Injectable, inject } from '@angular/core';
import { Observable, delay, map, switchMap, of } from 'rxjs';
import { IMenuService } from '../interfaces/menu.service';
import { MenuItem } from '../models/menu.model';
import { MOCK_MENU } from '../mock/menu.mock';
import { IPermissionsService } from '../interfaces/permissions.service';
import { ISessionService } from '../interfaces/session.service';

@Injectable({
  providedIn: 'root'
})
export class MockMenuService implements IMenuService {
  private permissionsService = inject(IPermissionsService);
  private sessionService = inject(ISessionService);

  getMenu(): Observable<MenuItem[]> {
    const user = this.sessionService.currentUser();
    
    if (!user) {
      return of([]).pipe(delay(200));
    }

    return this.permissionsService.getUserPermissions(user.id).pipe(
      delay(300),
      map(permissions => {
        const userPermCodes = permissions.map(p => p.code);
        
        // Função recursiva para filtrar menu
        const filterMenu = (items: MenuItem[]): MenuItem[] => {
          return items
            .filter(item => {
              if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
                return true;
              }
              // O usuário precisa ter pelo menos uma das permissões requisitadas (OR)
              return item.requiredPermissions.some(req => userPermCodes.includes(req));
            })
            .map(item => {
              if (item.children) {
                return { ...item, children: filterMenu(item.children) };
              }
              return item;
            })
            .sort((a, b) => a.order - b.order);
        };

        return filterMenu(MOCK_MENU);
      })
    );
  }
}

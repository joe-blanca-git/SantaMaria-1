import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ISessionService } from '../interfaces/session.service';
import { ITokenService } from '../interfaces/token.service';

export const authGuard: CanActivateFn = (route, state) => {
  const sessionService = inject(ISessionService);
  const tokenService = inject(ITokenService);
  const router = inject(Router);

  // Idealmente verificamos a sessão (no mock assumimos se tem token é válido)
  if (sessionService.isAuthenticated() || tokenService.getToken()) {
    return true;
  }

  // Redireciona para o login guardando URL de retorno
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

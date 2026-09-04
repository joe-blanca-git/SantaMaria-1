import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError, catchError } from 'rxjs';
import { IAuthService } from '../interfaces/auth.service';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(IAuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  const token = authService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token ausente/expirado/inválido: só aqui faz sentido encerrar a sessão.
        authService.logout().subscribe();
      } else if (error.status === 403) {
        // Usuário autenticado, mas sem permissão para essa ação específica —
        // não desloga, só avisa e leva de volta para um lugar seguro.
        toastService.show('Sem permissão de acesso.', 'error');
        router.navigate(['/home']);
      }
      return throwError(() => error);
    })
  );
};

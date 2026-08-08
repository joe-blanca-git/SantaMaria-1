import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, BehaviorSubject, catchError, filter, switchMap, take, Observable } from 'rxjs';
import { IAuthService } from '../interfaces/auth.service';
import { ITokenService } from '../interfaces/token.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(ITokenService);
  const authService = inject(IAuthService);

  const token = tokenService.getToken();
  
  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return handle401Error(authReq, next, authService, tokenService, error);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(
  request: HttpRequest<unknown>, 
  next: HttpHandlerFn, 
  authService: IAuthService, 
  tokenService: ITokenService,
  error: HttpErrorResponse
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = tokenService.getRefreshToken();

    if (refreshToken) {
      return authService.refreshToken(refreshToken).pipe(
        switchMap((tokens) => {
          isRefreshing = false;
          refreshTokenSubject.next(tokens.accessToken);
          return next(request.clone({
            headers: request.headers.set('Authorization', `Bearer ${tokens.accessToken}`)
          }));
        }),
        catchError((err) => {
          isRefreshing = false;
          authService.logout().subscribe(); // Force logout se refresh falhar
          return throwError(() => err);
        })
      );
    } else {
      isRefreshing = false;
      authService.logout().subscribe();
      return throwError(() => error);
    }
  }

  // Se já está dando refresh, espera na fila
  return refreshTokenSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(jwt => {
      return next(request.clone({
        headers: request.headers.set('Authorization', `Bearer ${jwt}`)
      }));
    })
  );
}

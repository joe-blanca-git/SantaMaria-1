import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { NgxEchartsModule } from 'ngx-echarts';

registerLocaleData(localePt);

// Interfaces
import { IAuthService } from './core/interfaces/auth.service';
import { ITokenService } from './core/interfaces/token.service';
import { ISessionService } from './core/interfaces/session.service';
import { IUserService } from './core/interfaces/user.service';
import { IPermissionsService } from './core/interfaces/permissions.service';
import { IModulesService } from './core/interfaces/modules.service';
import { INotificationsService } from './core/interfaces/notifications.service';
import { IMenuService } from './core/interfaces/menu.service';
import { IDashboardService } from './core/interfaces/dashboard.service';
import { IEnvironmentService, EnvironmentService } from './core/http/environment.service';

// Implementações Mockadas
import { MockAuthService } from './core/auth/mock-auth.service';
import { LocalTokenService } from './core/auth/local-token.service';
import { DefaultSessionService } from './core/auth/default-session.service';
import { MockUserService } from './core/auth/mock-user.service';
import { MockPermissionsService } from './core/services/mock-permissions.service';
import { MockModulesService } from './core/services/mock-modules.service';
import { MockNotificationsService } from './core/services/mock-notifications.service';
import { MockMenuService } from './core/services/mock-menu.service';
import { MockDashboardService } from './core/services/mock-dashboard.service';

import { authInterceptor } from './core/interceptors/auth.interceptor';

import { FlatpickrModule } from 'angularx-flatpickr';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    // Injeções de Dependência
    { provide: IAuthService, useClass: MockAuthService },
    { provide: ITokenService, useClass: LocalTokenService },
    { provide: ISessionService, useClass: DefaultSessionService },
    { provide: IUserService, useClass: MockUserService },
    { provide: IPermissionsService, useClass: MockPermissionsService },
    { provide: IModulesService, useClass: MockModulesService },
    { provide: INotificationsService, useClass: MockNotificationsService },
    { provide: IMenuService, useClass: MockMenuService },
    { provide: IDashboardService, useClass: MockDashboardService },
    { provide: IEnvironmentService, useClass: EnvironmentService },
    importProvidersFrom(
      NgxEchartsModule.forRoot({
        echarts: () => import('echarts')
      }),
      FlatpickrModule.forRoot()
    )
  ]
};

import { Routes } from '@angular/router';

export const pagesRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  { 
    path: 'home', 
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) 
  },
  {
    path: 'plano-saude',
    loadComponent: () => import('./plano-saude-placeholder/plano-saude-placeholder.component').then(m => m.PlanoSaudePlaceholderComponent)
  }
];

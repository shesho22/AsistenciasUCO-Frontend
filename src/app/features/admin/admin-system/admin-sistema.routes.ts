import { Routes } from '@angular/router';

/**
 * Rutas de `/app/admin/sistema`: la auditoría y el cierre masivo son dos vistas independientes, cada una con su propia
 * entrada en el menú lateral y su URL. `/app/admin/sistema` a secas redirige a la auditoría (enlaces antiguos). Los
 * parámetros viven únicamente en Configuración.
 */
export const SISTEMA_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auditoria' },
  {
    path: 'auditoria',
    loadComponent: () => import('./admin-auditoria.component').then((m) => m.AdminAuditoriaComponent),
  },
  {
    path: 'cierre-masivo',
    loadComponent: () => import('./admin-cierre-masivo.component').then((m) => m.AdminCierreMasivoComponent),
  },
];

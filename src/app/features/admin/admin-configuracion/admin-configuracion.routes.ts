import { Routes } from '@angular/router';
import { AdminConfiguracionComponent } from './admin-configuracion.component';

/**
 * Rutas hijas de la vista única de configuración (`/app/admin/configuracion/:pestaña`). Cada pestaña carga su pantalla
 * existente de forma diferida; `data.tab` identifica la pestaña activa para el cascarón.
 */
export const CONFIGURACION_ROUTES: Routes = [
  {
    path: '',
    component: AdminConfiguracionComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'parametros' },
      {
        path: 'parametros',
        data: { tab: 'parametros', modo: 'parametros' },
        loadComponent: () => import('../admin-system/admin-system.component').then((m) => m.AdminSystemComponent),
      },
      {
        path: 'catalogos',
        data: { tab: 'catalogos' },
        loadComponent: () => import('../admin-catalogs/admin-catalogs.component').then((m) => m.AdminCatalogsComponent),
      },
      {
        path: 'estados',
        data: { tab: 'estados' },
        loadComponent: () => import('../admin-estados/admin-estados.component').then((m) => m.AdminEstadosComponent),
      },
      {
        path: 'mensajes',
        data: { tab: 'mensajes' },
        loadComponent: () =>
          import('../../messages/message-administration/message-administration.component').then(
            (m) => m.MessageAdministrationComponent
          ),
      },
      {
        path: 'festivos',
        data: { tab: 'festivos' },
        loadComponent: () => import('../admin-festivos/admin-festivos.component').then((m) => m.AdminFestivosComponent),
      },
      {
        path: 'correo',
        data: { tab: 'correo' },
        loadComponent: () =>
          import('../admin-email-management/admin-email-management.component').then(
            (m) => m.AdminEmailManagementComponent
          ),
      },
      {
        path: 'areas',
        data: { tab: 'areas' },
        loadComponent: () => import('../admin-areas/admin-areas.component').then((m) => m.AdminAreasComponent),
      },
      {
        path: 'instituciones',
        data: { tab: 'instituciones' },
        loadComponent: () =>
          import('../admin-instituciones/admin-instituciones.component').then((m) => m.AdminInstitucionesComponent),
      },
    ],
  },
];

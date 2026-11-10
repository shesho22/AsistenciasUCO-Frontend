import { Routes } from '@angular/router';
import { TabsRutaShellComponent, TabsRutaShellConfig } from '../../../shared/components/tabs/tabs-ruta-shell.component';

const SHELL: TabsRutaShellConfig = {
  titulo: 'Estructura',
  descripcion: 'Facultades e instituciones de educación superior.',
  base: '/app/admin/estructura',
  tabs: [
    { id: 'facultades', etiqueta: 'Facultades' },
    { id: 'instituciones', etiqueta: 'Instituciones' },
  ],
  porDefecto: 'facultades',
};

/** Rutas hijas de `/app/admin/estructura/:pestaña`; cada pestaña se descarga solo al abrirse. */
export const ESTRUCTURA_ROUTES: Routes = [
  {
    path: '',
    component: TabsRutaShellComponent,
    data: { shell: SHELL },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'facultades' },
      {
        path: 'facultades',
        data: { tab: 'facultades' },
        loadComponent: () =>
          import('../admin-facultades/admin-facultades.component').then((m) => m.AdminFacultadesComponent),
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

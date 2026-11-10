import { Routes } from '@angular/router';
import { TabsRutaShellComponent, TabsRutaShellConfig } from '../../../shared/components/tabs/tabs-ruta-shell.component';

const SHELL: TabsRutaShellConfig = {
  titulo: 'Personas',
  descripcion: 'Estudiantes, docentes, decanos y asignaturas de la institución.',
  base: '/app/admin/personas',
  tabs: [
    { id: 'estudiantes', etiqueta: 'Estudiantes' },
    { id: 'docentes', etiqueta: 'Docentes' },
    { id: 'decanos', etiqueta: 'Decanos' },
    { id: 'asignaturas', etiqueta: 'Asignaturas' },
  ],
  porDefecto: 'estudiantes',
};

/**
 * Rutas hijas de `/app/admin/personas/:pestaña`. Cada pestaña reutiliza su pantalla existente y se descarga solo al
 * abrirse; docentes y asignaturas son las pantallas de decanatura abiertas con alcance institucional.
 */
export const PERSONAS_ROUTES: Routes = [
  {
    path: '',
    component: TabsRutaShellComponent,
    data: { shell: SHELL },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'estudiantes' },
      {
        path: 'estudiantes',
        data: { tab: 'estudiantes' },
        loadComponent: () =>
          import('../admin-estudiantes/admin-estudiantes.component').then((m) => m.AdminEstudiantesComponent),
      },
      {
        path: 'docentes',
        data: { tab: 'docentes', comoAdministrador: true },
        loadComponent: () => import('../../dean/dean-docentes/dean-docentes.component').then((m) => m.DeanDocentesComponent),
      },
      {
        path: 'decanos',
        data: { tab: 'decanos' },
        loadComponent: () => import('../admin-decanos/admin-decanos.component').then((m) => m.AdminDecanosComponent),
      },
      {
        path: 'asignaturas',
        data: { tab: 'asignaturas', comoAdministrador: true },
        loadComponent: () =>
          import('../../dean/dean-asignaturas/dean-asignaturas.component').then((m) => m.DeanAsignaturasComponent),
      },
    ],
  },
];

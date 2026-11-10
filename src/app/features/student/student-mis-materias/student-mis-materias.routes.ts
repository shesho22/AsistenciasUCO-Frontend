import { Routes } from '@angular/router';
import { TabsRutaShellComponent, TabsRutaShellConfig } from '../../../shared/components/tabs/tabs-ruta-shell.component';

const SHELL: TabsRutaShellConfig = {
  titulo: 'Mis materias',
  descripcion: 'Tus materias, tus horarios y la oferta de grupos en un solo lugar.',
  base: '/app/estudiante/mis-materias',
  tabs: [
    { id: 'materias', etiqueta: 'Materias' },
    { id: 'horarios', etiqueta: 'Horarios' },
    { id: 'oferta', etiqueta: 'Oferta de grupos' },
  ],
  porDefecto: 'materias',
};

/** Rutas hijas de `/app/estudiante/mis-materias/:pestaña`; cada pestaña se descarga solo al abrirse. */
export const MIS_MATERIAS_ROUTES: Routes = [
  {
    path: '',
    component: TabsRutaShellComponent,
    data: { shell: SHELL },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'materias' },
      {
        path: 'materias',
        data: { tab: 'materias' },
        loadComponent: () =>
          import('../student-courses/student-courses.component').then((m) => m.StudentCoursesComponent),
      },
      {
        path: 'horarios',
        data: { tab: 'horarios' },
        loadComponent: () =>
          import('../student-schedule/student-schedule.component').then((m) => m.StudentScheduleComponent),
      },
      {
        path: 'oferta',
        data: { tab: 'oferta' },
        loadComponent: () =>
          import('../student-group-offer/student-group-offer.component').then((m) => m.StudentGroupOfferComponent),
      },
    ],
  },
];

import { Routes } from '@angular/router';
import { TabsRutaShellComponent, TabsRutaShellConfig } from '../../../shared/components/tabs/tabs-ruta-shell.component';

const SHELL: TabsRutaShellConfig = {
  titulo: 'Mis materias',
  descripcion: 'Tus materias, tus horarios, la oferta de grupos y tu plan de estudios en un solo lugar.',
  base: '/app/estudiante/mis-materias',
  tabs: [
    { id: 'materias', etiqueta: 'Materias' },
    { id: 'horarios', etiqueta: 'Horarios' },
    { id: 'oferta', etiqueta: 'Oferta de grupos' },
    { id: 'plan', etiqueta: 'Plan de estudios' },
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
      {
        // Estructura curricular por semestres de los planes activos del estudiante.
        path: 'plan',
        data: { tab: 'plan' },
        loadComponent: () =>
          import('../student-study-plan/student-study-plan.component').then((m) => m.StudentStudyPlanComponent),
      },
    ],
  },
];

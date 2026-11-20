import { Routes } from '@angular/router';
import { TabsRutaShellComponent, TabsRutaShellConfig } from '../../../shared/components/tabs/tabs-ruta-shell.component';

const SHELL: TabsRutaShellConfig = {
  titulo: 'Mis materias',
  descripcion: 'Tus materias, tus horarios y tus materias matriculadas por semestre en un solo lugar.',
  base: '/app/estudiante/mis-materias',
  tabs: [
    { id: 'materias', etiqueta: 'Materias' },
    { id: 'horarios', etiqueta: 'Horarios' },
    { id: 'plan', etiqueta: 'Materias matriculadas' },
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
      // HU008 descartada (ADDENDUM ATA, K.3): la antigua pestaña de oferta de grupos lleva a Materias.
      { path: 'oferta', pathMatch: 'full', redirectTo: 'materias' },
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

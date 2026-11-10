import { Routes } from '@angular/router';
import { TabItem } from '../../shared/components/tabs/tabs-nav.component';
import { PestanasShellComponent } from '../../shared/components/pestanas-shell/pestanas-shell.component';

/** Pestañas de «Programa» (`/app/coordinador/programa/:pestaña`). Los planes de estudio quedan aparte: allí se opera. */
export const TABS_PROGRAMA: readonly TabItem[] = [
  { id: 'grupos', etiqueta: 'Grupos' },
  { id: 'materias', etiqueta: 'Materias' },
  { id: 'docentes', etiqueta: 'Docentes' },
  { id: 'periodos', etiqueta: 'Períodos' },
];

/**
 * Rutas hijas de Programa: grupos y horarios, materias, docentes y períodos (consulta). Cada pestaña carga su pantalla
 * de forma diferida y con el título oculto (`embebido`) porque lo pone el cascarón.
 */
export const PROGRAMA_ROUTES: Routes = [
  {
    path: '',
    component: PestanasShellComponent,
    data: {
      titulo: 'Programa',
      descripcion: 'Grupos, materias, docentes y períodos académicos de tu programa.',
      tabs: TABS_PROGRAMA,
      base: ['/app/coordinador/programa'],
    },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'grupos' },
      {
        path: 'grupos',
        data: { tab: 'grupos', embebido: true },
        loadComponent: () =>
          import('./coordinator-groups/coordinator-groups.component').then((m) => m.CoordinatorGroupsComponent),
      },
      {
        path: 'materias',
        data: { tab: 'materias', embebido: true },
        loadComponent: () =>
          import('./coordinator-subjects/coordinator-subjects.component').then((m) => m.CoordinatorSubjectsComponent),
      },
      {
        path: 'docentes',
        data: { tab: 'docentes', embebido: true },
        loadComponent: () =>
          import('./coordinator-docentes/coordinator-docentes.component').then((m) => m.CoordinatorDocentesComponent),
      },
      {
        path: 'periodos',
        data: { tab: 'periodos', embebido: true },
        loadComponent: () =>
          import('./coordinator-periods/coordinator-periods.component').then((m) => m.CoordinatorPeriodsComponent),
      },
    ],
  },
];

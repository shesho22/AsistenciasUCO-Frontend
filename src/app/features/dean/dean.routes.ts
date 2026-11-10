import { Routes } from '@angular/router';
import { TabItem } from '../../shared/components/tabs/tabs-nav.component';
import { PestanasShellComponent } from '../../shared/components/pestanas-shell/pestanas-shell.component';

/** Pestañas de «Mi facultad» (`/app/decano/mi-facultad/:pestaña`). */
export const TABS_MI_FACULTAD: readonly TabItem[] = [
  { id: 'programas', etiqueta: 'Programas' },
  { id: 'coordinadores', etiqueta: 'Coordinadores' },
  { id: 'areas', etiqueta: 'Áreas' },
];

/** Pestañas de «Seguimiento» (`/app/decano/seguimiento/:pestaña`). */
export const TABS_SEGUIMIENTO: readonly TabItem[] = [
  { id: 'indicadores', etiqueta: 'Indicadores' },
  { id: 'consolidado', etiqueta: 'Consolidado' },
  { id: 'cronograma', etiqueta: 'Cronograma' },
];

/**
 * Rutas hijas de Mi facultad: facultad + estructura + programas, coordinadores, y áreas (con la antigua infraestructura).
 * Cada pestaña carga su pantalla de forma diferida; `embebido` oculta su título porque lo pone el cascarón.
 */
export const MI_FACULTAD_ROUTES: Routes = [
  {
    path: '',
    component: PestanasShellComponent,
    data: {
      titulo: 'Mi facultad',
      descripcion: 'Programas y planes, coordinadores y áreas de conocimiento de tu facultad.',
      tabs: TABS_MI_FACULTAD,
      base: ['/app/decano/mi-facultad'],
    },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'programas' },
      {
        path: 'programas',
        data: { tab: 'programas' },
        loadComponent: () =>
          import('./dean-mi-facultad/dean-programas-tab.component').then((m) => m.DeanProgramasTabComponent),
      },
      {
        path: 'coordinadores',
        data: { tab: 'coordinadores', embebido: true },
        loadComponent: () =>
          import('./dean-coordinadores/dean-coordinadores.component').then((m) => m.DeanCoordinadoresComponent),
      },
      {
        path: 'areas',
        data: { tab: 'areas', embebido: true },
        loadComponent: () => import('./dean-areas/dean-areas.component').then((m) => m.DeanAreasComponent),
      },
    ],
  },
];

/**
 * Rutas hijas de Seguimiento: indicadores (comparativa por programa, por horas), consolidado de asistencia con filas
 * expandibles y cronograma de sesiones.
 */
export const SEGUIMIENTO_ROUTES: Routes = [
  {
    path: '',
    component: PestanasShellComponent,
    data: {
      titulo: 'Seguimiento',
      descripcion: 'Indicadores, asistencia consolidada y cronograma de sesiones de la facultad.',
      tabs: TABS_SEGUIMIENTO,
      base: ['/app/decano/seguimiento'],
    },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'indicadores' },
      {
        path: 'indicadores',
        data: { tab: 'indicadores', embebido: true },
        loadComponent: () =>
          import('./dean-indicators/dean-indicators.component').then((m) => m.DeanIndicatorsComponent),
      },
      {
        path: 'consolidado',
        data: { tab: 'consolidado', embebido: true, comoDecano: true },
        loadComponent: () =>
          import('../coordinator/coordinator-consolidado/consolidado-asistencia.component').then(
            (m) => m.ConsolidadoAsistenciaComponent
          ),
      },
      {
        path: 'cronograma',
        data: { tab: 'cronograma', embebido: true },
        loadComponent: () =>
          import('./dean-cronograma/dean-cronograma.component').then((m) => m.DeanCronogramaComponent),
      },
    ],
  },
];

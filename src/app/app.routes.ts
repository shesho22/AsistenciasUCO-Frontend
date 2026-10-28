import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public-layout/public-layout.component').then(
        (m) => m.PublicLayoutComponent
      ),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(
            (m) => m.LoginComponent
          ),
      },
      {
        path: 'register',
        redirectTo: 'login',
      },
    ],
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent
      ),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/overview/overview.component').then(
            (m) => m.OverviewComponent
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
      },
      {
        path: 'asistencia',
        canActivate: [roleGuard],
        data: { roles: ['DOCENTE'] },
        loadComponent: () =>
          import(
            './features/attendance/attendance-control/attendance-control.component'
          ).then((m) => m.AttendanceControlComponent),
      },
      // Rutas Administrador
      {
        path: 'admin/facultades',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-facultades/admin-facultades.component').then(
            (m) => m.AdminFacultadesComponent
          ),
      },
      {
        path: 'admin/sedes',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-sedes/admin-sedes.component').then(
            (m) => m.AdminSedesComponent
          ),
      },
      {
        path: 'admin/areas',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-areas/admin-areas.component').then(
            (m) => m.AdminAreasComponent
          ),
      },
      {
        path: 'admin/decanos',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-decanos/admin-decanos.component').then(
            (m) => m.AdminDecanosComponent
          ),
      },
      {
        path: 'admin/indicadores',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-indicators/admin-indicators.component').then(
            (m) => m.AdminIndicatorsComponent
          ),
      },
      {
        // HU096-HU098: el período es único por institución; solo el administrador lo gestiona.
        path: 'admin/periodos',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-periodos/admin-periodos.component').then(
            (m) => m.AdminPeriodosComponent
          ),
      },
      {
        path: 'admin/catalogos',
        redirectTo: 'admin/facultades',
        pathMatch: 'full',
      },
      {
        path: 'admin/sistema',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-system/admin-system.component').then(
            (m) => m.AdminSystemComponent
          ),
      },
      // Rutas Decano
      {
        path: 'decano/facultad',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-faculty/dean-faculty.component').then(
            (m) => m.DeanFacultyComponent
          ),
      },
      {
        path: 'decano/grupos',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-grupos/dean-grupos.component').then(
            (m) => m.DeanGruposComponent
          ),
      },
      {
        path: 'decano/grupos/:grupoId',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-grupo-detalle/dean-grupo-detalle.component').then(
            (m) => m.DeanGrupoDetalleComponent
          ),
      },
      {
        path: 'decano/programas',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-programas/dean-programas.component').then(
            (m) => m.DeanProgramasComponent
          ),
      },
      {
        path: 'decano/programas/:planId',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-plan-malla/dean-plan-malla.component').then(
            (m) => m.DeanPlanMallaComponent
          ),
      },
      {
        path: 'decano/periodos',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-periodos/dean-periodos.component').then(
            (m) => m.DeanPeriodosComponent
          ),
      },
      {
        path: 'decano/infraestructura',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-infraestructura/dean-infraestructura.component').then(
            (m) => m.DeanInfraestructuraComponent
          ),
      },
      {
        path: 'decano/coordinadores',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-coordinadores/dean-coordinadores.component').then(
            (m) => m.DeanCoordinadoresComponent
          ),
      },
      {
        path: 'decano/estudiantes',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-estudiantes/dean-estudiantes.component').then((m) => m.DeanEstudiantesComponent),
      },
      {
        path: 'decano/estructura',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-estructura/dean-estructura.component').then((m) => m.DeanEstructuraComponent),
      },
      {
        path: 'decano/cronograma',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-cronograma/dean-cronograma.component').then((m) => m.DeanCronogramaComponent),
      },
      // Rutas Coordinador
      {
        path: 'coordinador/docentes',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import('./features/coordinator/coordinator-docentes/coordinator-docentes.component').then(
            (m) => m.CoordinatorDocentesComponent
          ),
      },
      {
        path: 'coordinador/planes-estudio',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-study-plans/coordinator-study-plans.component'
          ).then((m) => m.CoordinatorStudyPlansComponent),
      },
      {
        path: 'coordinador/planes-estudio/nuevo',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-study-plans/pages/study-plan-form-page.component'
          ).then((m) => m.CoordinatorStudyPlanFormPageComponent),
      },
      {
        path: 'coordinador/planes-estudio/:planId/editar',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-study-plans/pages/study-plan-form-page.component'
          ).then((m) => m.CoordinatorStudyPlanFormPageComponent),
      },
      {
        path: 'coordinador/planes-estudio/:planId/malla',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-study-plans/pages/study-plan-mesh-page.component'
          ).then((m) => m.CoordinatorStudyPlanMeshPageComponent),
      },
      {
        path: 'coordinador/planes-estudio/:planId/asignaturas/nueva',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-study-plans/pages/subject-form-page.component'
          ).then((m) => m.CoordinatorSubjectFormPageComponent),
      },
      {
        path: 'coordinador/planes-estudio/:planId/asignaturas/:asignaturaId/editar',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-study-plans/pages/subject-form-page.component'
          ).then((m) => m.CoordinatorSubjectFormPageComponent),
      },
      {
        path: 'coordinador/periodos',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import('./features/coordinator/coordinator-periods/coordinator-periods.component').then(
            (m) => m.CoordinatorPeriodsComponent
          ),
      },
      {
        path: 'coordinador/indicadores',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-indicators/coordinator-indicators.component'
          ).then((m) => m.CoordinatorIndicatorsComponent),
      },
      {
        path: 'decano/indicadores',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-indicators/dean-indicators.component').then(
            (m) => m.DeanIndicatorsComponent
          ),
      },
      {
        path: 'coordinador/estudiantes',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-students/coordinator-students.component'
          ).then((m) => m.CoordinatorStudentsComponent),
      },
      {
        path: 'coordinador/materias',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-subjects/coordinator-subjects.component'
          ).then((m) => m.CoordinatorSubjectsComponent),
      },
      {
        path: 'coordinador/asistencias',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-attendance/coordinator-attendance.component'
          ).then((m) => m.CoordinatorAttendanceComponent),
      },
      // Rutas Docente
      {
        path: 'docente/grupos',
        canActivate: [roleGuard],
        data: { roles: ['DOCENTE'] },
        loadComponent: () =>
          import('./features/teacher/teacher-grupos/teacher-grupos.component').then(
            (m) => m.TeacherGruposComponent
          ),
      },
      {
        path: 'docente/horarios',
        canActivate: [roleGuard],
        data: { roles: ['DOCENTE'] },
        loadComponent: () =>
          import('./features/teacher/teacher-schedule/teacher-schedule.component').then(
            (m) => m.TeacherScheduleComponent
          ),
      },
      {
        path: 'docente/reclamos',
        canActivate: [roleGuard],
        data: { roles: ['DOCENTE'] },
        loadComponent: () =>
          import('./features/teacher/teacher-claims/teacher-claims.component').then(
            (m) => m.TeacherClaimsComponent
          ),
      },
      // Rutas Estudiante
      {
        path: 'estudiante/horarios',
        canActivate: [roleGuard],
        data: { roles: ['ESTUDIANTE'] },
        loadComponent: () =>
          import('./features/student/student-schedule/student-schedule.component').then(
            (m) => m.StudentScheduleComponent
          ),
      },
      {
        path: 'estudiante/materias',
        canActivate: [roleGuard],
        data: { roles: ['ESTUDIANTE'] },
        loadComponent: () =>
          import('./features/student/student-courses/student-courses.component').then(
            (m) => m.StudentCoursesComponent
          ),
      },
      {
        path: 'estudiante/reclamos',
        canActivate: [roleGuard],
        data: { roles: ['ESTUDIANTE'] },
        loadComponent: () =>
          import('./features/student/student-claims/student-claims.component').then(
            (m) => m.StudentClaimsComponent
          ),
      },
      {
        path: 'estudiante/solicitudes',
        canActivate: [roleGuard],
        data: { roles: ['ESTUDIANTE'] },
        loadComponent: () =>
          import('./features/student/student-enrollment-requests/student-enrollment-requests.component').then(
            (m) => m.StudentEnrollmentRequestsComponent
          ),
      },
      {
        path: 'estudiante/oferta',
        canActivate: [roleGuard],
        data: { roles: ['ESTUDIANTE'] },
        loadComponent: () =>
          import('./features/student/student-group-offer/student-group-offer.component').then(
            (m) => m.StudentGroupOfferComponent
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

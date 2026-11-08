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
        // IDENT-001: destino publico del enlace de verificacion de correo (el token llega en el fragmento).
        path: 'verificar-correo',
        loadComponent: () =>
          import('./features/auth/verify-email/verify-email.component').then(
            (m) => m.VerifyEmailComponent
          ),
      },
      {
        // HU176B: matricula publica por QR (token en `?t=`, que la pagina borra de la URL) o por PIN. Sin authGuard: el
        // estudiante aun puede no tener cuenta. El backend exige red del campus y limita los intentos.
        path: 'matricula/qr',
        loadComponent: () =>
          import('./features/public/matricula-qr/matricula-qr.component').then(
            (m) => m.MatriculaQrComponent
          ),
      },
      {
        path: 'matricula/pin',
        loadComponent: () =>
          import('./features/public/matricula-qr/matricula-qr.component').then(
            (m) => m.MatriculaQrComponent
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
      // CULM-001 B.2 (HU176): el estudiante registra su asistencia con el QR (camara nativa) o con el PIN.
      ...['asistencia/qr', 'asistencia/pin'].map((path) => ({
        path,
        canActivate: [roleGuard],
        data: { roles: ['ESTUDIANTE'] },
        loadComponent: () =>
          import('./features/student/student-attendance-qr/student-attendance-qr.component').then(
            (m) => m.StudentAttendanceQrComponent
          ),
      })),
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
        // HU154 (tipos de programa): antes redirigía a facultades y la pantalla no tenía ruta.
        path: 'admin/catalogos',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-catalogs/admin-catalogs.component').then((m) => m.AdminCatalogsComponent),
      },
      {
        // HU155 / HU167: estados del sistema, solo consulta.
        path: 'admin/estados',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-estados/admin-estados.component').then((m) => m.AdminEstadosComponent),
      },
      {
        // CULM-001 B.1 (pantalla 3.7): festivos de Colombia (consulta, recarga y sesiones en festivo con asistencia).
        path: 'admin/festivos',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-festivos/admin-festivos.component').then((m) => m.AdminFestivosComponent),
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
      {
        path: 'admin/seguridad',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/security/security-administration/security-administration.component').then(
            (m) => m.SecurityAdministrationComponent
          ),
      },
      {
        path: 'admin/mensajes',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/messages/message-administration/message-administration.component').then(
            (m) => m.MessageAdministrationComponent
          ),
      },
      {
        path: 'admin/correos',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-email-management/admin-email-management.component').then(
            (m) => m.AdminEmailManagementComponent
          ),
      },
      {
        path: 'admin/instituciones',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-instituciones/admin-instituciones.component').then(
            (m) => m.AdminInstitucionesComponent
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
        path: 'decano/areas',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-areas/dean-areas.component').then(
            (m) => m.DeanAreasComponent
          ),
      },
      // Ruta heredada: se conserva solo para no romper marcadores guardados.
      { path: 'decano/infraestructura', redirectTo: 'decano/areas', pathMatch: 'full' },
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
      // HU128 / HU143: docentes y búsqueda de asignaturas de la facultad del decano
      {
        path: 'decano/docentes',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-docentes/dean-docentes.component').then((m) => m.DeanDocentesComponent),
      },
      {
        path: 'decano/asignaturas',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-asignaturas/dean-asignaturas.component').then((m) => m.DeanAsignaturasComponent),
      },
      // HU061: consolidado de asistencia por cohorte, materia y docente (facultad del decano)
      {
        path: 'decano/consolidado-asistencia',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'], comoDecano: true },
        loadComponent: () =>
          import('./features/coordinator/coordinator-consolidado/consolidado-asistencia.component').then(
            (m) => m.ConsolidadoAsistenciaComponent
          ),
      },
      // CULM-001 C.1: revisiones de cancelación de matrícula por pérdida de inasistencia (decano)
      {
        path: 'decano/revisiones-cancelacion',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'], rol: 'DECANO' },
        loadComponent: () =>
          import('./features/shared/revisiones-resolucion/revisiones-resolucion.component').then(
            (m) => m.RevisionesResolucionComponent
          ),
      },
      // HU143 / HU157: búsqueda de asignaturas y ficha unificada de estudiantes del administrador
      {
        path: 'admin/asignaturas',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'], comoAdministrador: true },
        loadComponent: () =>
          import('./features/dean/dean-asignaturas/dean-asignaturas.component').then((m) => m.DeanAsignaturasComponent),
      },
      {
        path: 'admin/docentes',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'], comoAdministrador: true },
        loadComponent: () =>
          import('./features/dean/dean-docentes/dean-docentes.component').then((m) => m.DeanDocentesComponent),
      },
      {
        path: 'admin/estudiantes',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-estudiantes/admin-estudiantes.component').then((m) => m.AdminEstudiantesComponent),
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
        path: 'coordinador/grupos',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-groups/coordinator-groups.component'
          ).then((m) => m.CoordinatorGroupsComponent),
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
      // HU061: consolidado de asistencia por cohorte, materia y docente (programa del coordinador)
      {
        path: 'coordinador/consolidado-asistencia',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import('./features/coordinator/coordinator-consolidado/consolidado-asistencia.component').then(
            (m) => m.ConsolidadoAsistenciaComponent
          ),
      },
      // CULM-001 C.1: revisiones de cancelación de matrícula por pérdida de inasistencia (coordinador)
      {
        path: 'coordinador/revisiones-cancelacion',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'], rol: 'COORDINADOR' },
        loadComponent: () =>
          import('./features/shared/revisiones-resolucion/revisiones-resolucion.component').then(
            (m) => m.RevisionesResolucionComponent
          ),
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
        path: 'estudiante/alertas',
        canActivate: [roleGuard],
        data: { roles: ['ESTUDIANTE'] },
        loadComponent: () =>
          import('./features/student/student-alerts/student-alerts.component').then(
            (m) => m.StudentAlertsComponent
          ),
      },
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

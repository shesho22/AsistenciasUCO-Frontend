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
        // HU177: paginas publicas de recuperacion de contrasena. La primera pide el enlace; la segunda es el destino del
        // enlace del correo (el token llega en el fragmento) y define la contrasena nueva.
        path: 'recuperar-clave',
        loadComponent: () =>
          import('./features/auth/recover-password/recover-password.component').then(
            (m) => m.RecoverPasswordComponent
          ),
      },
      {
        path: 'restablecer-clave',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent
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
        // Estructura institucional: pestañas facultades e instituciones (/app/admin/estructura/:pestaña).
        path: 'admin/estructura',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadChildren: () =>
          import('./features/admin/admin-estructura/admin-estructura.routes').then((m) => m.ESTRUCTURA_ROUTES),
      },
      {
        // Personas: estudiantes, docentes, decanos y asignaturas (/app/admin/personas/:pestaña).
        path: 'admin/personas',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadChildren: () =>
          import('./features/admin/admin-personas/admin-personas.routes').then((m) => m.PERSONAS_ROUTES),
      },
      { path: 'admin/facultades', redirectTo: 'admin/estructura/facultades', pathMatch: 'full' },
      {
        // Vista única de configuración (parámetros, catálogos, estados, mensajes, festivos, correo, áreas e instituciones):
        // /app/admin/configuracion/:pestaña; sin pestaña abre parámetros. Las rutas hijas viven en su propio archivo diferido.
        path: 'admin/configuracion',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadChildren: () =>
          import('./features/admin/admin-configuracion/admin-configuracion.routes').then((m) => m.CONFIGURACION_ROUTES),
      },
      { path: 'admin/areas', redirectTo: 'admin/configuracion/areas', pathMatch: 'full' },
      { path: 'admin/decanos', redirectTo: 'admin/personas/decanos', pathMatch: 'full' },
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
      { path: 'admin/catalogos', redirectTo: 'admin/configuracion/catalogos', pathMatch: 'full' },
      { path: 'admin/estados', redirectTo: 'admin/configuracion/estados', pathMatch: 'full' },
      { path: 'admin/festivos', redirectTo: 'admin/configuracion/festivos', pathMatch: 'full' },
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
        // Vista propia: depende del micro frontend de MessageUcoLab; el menú la oculta si el componente externo no está.
        path: 'admin/mensajes',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/messages/message-administration/message-administration.component').then(
            (m) => m.MessageAdministrationComponent
          ),
      },
      { path: 'admin/correos', redirectTo: 'admin/configuracion/correo', pathMatch: 'full' },
      { path: 'admin/instituciones', redirectTo: 'admin/estructura/instituciones', pathMatch: 'full' },
      // Rutas Decano (CULM-001: 16 pantallas -> 8). Mi facultad, Seguimiento y Directorio agrupan las antiguas por pestaña
      // o selector; Períodos y Revisiones se mantienen. Los destinos hijos viven en su propio archivo diferido.
      {
        path: 'decano/mi-facultad',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadChildren: () => import('./features/dean/dean.routes').then((m) => m.MI_FACULTAD_ROUTES),
      },
      {
        path: 'decano/seguimiento',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadChildren: () => import('./features/dean/dean.routes').then((m) => m.SEGUIMIENTO_ROUTES),
      },
      {
        path: 'decano/directorio',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'docentes' },
          {
            path: ':entidad',
            loadComponent: () =>
              import('./features/dean/dean-directorio/dean-directorio.component').then((m) => m.DeanDirectorioComponent),
          },
        ],
      },
      // Rutas antiguas del decano: se conservan solo para no romper marcadores guardados.
      { path: 'decano/facultad', redirectTo: 'decano/mi-facultad/programas', pathMatch: 'full' },
      { path: 'decano/estructura', redirectTo: 'decano/mi-facultad/programas', pathMatch: 'full' },
      { path: 'decano/programas', redirectTo: 'decano/mi-facultad/programas', pathMatch: 'full' },
      { path: 'decano/coordinadores', redirectTo: 'decano/mi-facultad/coordinadores', pathMatch: 'full' },
      { path: 'decano/areas', redirectTo: 'decano/mi-facultad/areas', pathMatch: 'full' },
      { path: 'decano/infraestructura', redirectTo: 'decano/mi-facultad/areas', pathMatch: 'full' },
      { path: 'decano/indicadores', redirectTo: 'decano/seguimiento/indicadores', pathMatch: 'full' },
      { path: 'decano/consolidado-asistencia', redirectTo: 'decano/seguimiento/consolidado', pathMatch: 'full' },
      { path: 'decano/cronograma', redirectTo: 'decano/seguimiento/cronograma', pathMatch: 'full' },
      { path: 'decano/docentes', redirectTo: 'decano/directorio/docentes', pathMatch: 'full' },
      { path: 'decano/estudiantes', redirectTo: 'decano/directorio/estudiantes', pathMatch: 'full' },
      { path: 'decano/asignaturas', redirectTo: 'decano/directorio/asignaturas', pathMatch: 'full' },
      { path: 'decano/grupos', redirectTo: 'decano/directorio/grupos', pathMatch: 'full' },
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
      { path: 'admin/asignaturas', redirectTo: 'admin/personas/asignaturas', pathMatch: 'full' },
      { path: 'admin/docentes', redirectTo: 'admin/personas/docentes', pathMatch: 'full' },
      { path: 'admin/estudiantes', redirectTo: 'admin/personas/estudiantes', pathMatch: 'full' },
      // Rutas Coordinador (CULM-001: 12 pantallas -> 7). Programa agrupa por pestaña; Asistencia fusiona asistencias,
      // consolidado e indicadores; Estudiantes, Planes de estudio y Revisiones se mantienen.
      {
        path: 'coordinador/programa',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadChildren: () => import('./features/coordinator/coordinator.routes').then((m) => m.PROGRAMA_ROUTES),
      },
      {
        path: 'coordinador/asistencia',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import('./features/coordinator/coordinator-asistencia/coordinator-asistencia.component').then(
            (m) => m.CoordinatorAsistenciaComponent
          ),
      },
      // Rutas antiguas del coordinador: se conservan solo para no romper marcadores guardados.
      { path: 'coordinador/grupos', redirectTo: 'coordinador/programa/grupos', pathMatch: 'full' },
      { path: 'coordinador/materias', redirectTo: 'coordinador/programa/materias', pathMatch: 'full' },
      { path: 'coordinador/docentes', redirectTo: 'coordinador/programa/docentes', pathMatch: 'full' },
      { path: 'coordinador/periodos', redirectTo: 'coordinador/programa/periodos', pathMatch: 'full' },
      { path: 'coordinador/asistencias', redirectTo: 'coordinador/asistencia', pathMatch: 'full' },
      { path: 'coordinador/consolidado-asistencia', redirectTo: 'coordinador/asistencia', pathMatch: 'full' },
      { path: 'coordinador/indicadores', redirectTo: 'coordinador/asistencia', pathMatch: 'full' },
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
        path: 'coordinador/estudiantes',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-students/coordinator-students.component'
          ).then((m) => m.CoordinatorStudentsComponent),
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
      { path: 'estudiante/horarios', redirectTo: 'estudiante/mis-materias/horarios', pathMatch: 'full' },
      { path: 'estudiante/materias', redirectTo: 'estudiante/mis-materias/materias', pathMatch: 'full' },
      {
        // Mis materias: pestañas materias, horarios y oferta (/app/estudiante/mis-materias/:pestaña).
        path: 'estudiante/mis-materias',
        canActivate: [roleGuard],
        data: { roles: ['ESTUDIANTE'] },
        loadChildren: () =>
          import('./features/student/student-mis-materias/student-mis-materias.routes').then(
            (m) => m.MIS_MATERIAS_ROUTES
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
      { path: 'estudiante/oferta', redirectTo: 'estudiante/mis-materias/oferta', pathMatch: 'full' },
      {
        path: 'acceso-denegado',
        data: { codigo: 403 },
        loadComponent: () =>
          import('./features/shared/ruta-no-disponible/ruta-no-disponible.component').then(
            (m) => m.RutaNoDisponibleComponent
          ),
      },
      {
        // F3-TRX-01: una ruta inexistente dentro de /app muestra 404 en el layout, sin perder la sesión.
        path: '**',
        data: { codigo: 404 },
        loadComponent: () =>
          import('./features/shared/ruta-no-disponible/ruta-no-disponible.component').then(
            (m) => m.RutaNoDisponibleComponent
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

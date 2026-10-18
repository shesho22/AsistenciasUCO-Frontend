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
        path: 'admin/decanos',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-decanos/admin-decanos.component').then(
            (m) => m.AdminDecanosComponent
          ),
      },
      {
        path: 'admin/catalogos',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-catalogs/admin-catalogs.component').then(
            (m) => m.AdminCatalogsComponent
          ),
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
          import('./features/admin/admin-security/admin-security.component').then(
            (m) => m.AdminSecurityComponent
          ),
      },
      {
        path: 'seguridad',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'ADMIN'] },
        loadComponent: () =>
          import('./features/admin/admin-security/admin-security.component').then(
            (m) => m.AdminSecurityComponent
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
        path: 'decano/coordinadores',
        canActivate: [roleGuard],
        data: { roles: ['DECANO'] },
        loadComponent: () =>
          import('./features/dean/dean-coordinadores/dean-coordinadores.component').then(
            (m) => m.DeanCoordinadoresComponent
          ),
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
        path: 'coordinador/estudiantes',
        canActivate: [roleGuard],
        data: { roles: ['COORDINADOR'] },
        loadComponent: () =>
          import(
            './features/coordinator/coordinator-students/coordinator-students.component'
          ).then((m) => m.CoordinatorStudentsComponent),
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
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

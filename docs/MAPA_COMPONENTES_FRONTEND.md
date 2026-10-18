# 🗺️ Mapa Integral de Componentes Frontend — GestioAsistencia

Este documento sirve como **guía y catálogo de navegación rápida** de la aplicación Angular 19 (`GestioAsistenciaFrontend`). Permite localizar de forma inmediata cualquier pantalla, componente hijo, modal o servicio asociado a un error reportado.

---

## 1. Arquitectura General y Flujo de Contenedores

```text
AppComponent
 ├── PublicLayoutComponent  [Rutas públicas: /login]
 │    └── LoginComponent
 └── DashboardLayoutComponent  [Rutas privadas: /app/** (Con AuthGuard)]
      ├── Sidebar Navigation
      ├── Header & Profile Menu
      └── <router-outlet>
           ├── OverviewComponent (/app/dashboard)
           ├── ProfileComponent (/app/perfil)
           ├── AttendanceControlComponent (/app/asistencia)
           ├── Docente (/app/docente/*)
           ├── Estudiante (/app/estudiante/*)
           ├── Coordinador (/app/coordinador/*)
           ├── Decano (/app/decano/*)
           └── Administrador (/app/admin/*)
```

---

## 2. Mapa Detallado por Dominios y Rutas

### 2.1 Módulo de Asistencia (`/app/asistencia`) — [Docente]
Control centralizado de sesiones y registro de asistencia en aula.
- **Ruta:** `/app/asistencia?courseId=<id>&sessionId=<id>`
- **Componente Principal:**
  - [`AttendanceControlComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/attendance/attendance-control/attendance-control.component.ts)
- **Subcomponentes:**
  - [`AttendanceControlHeaderComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/attendance/attendance-control/components/attendance-control-header.component.ts): Selector de grupos, sesiones, exportación Excel y botones de acción.
  - [`GroupSessionsOverviewComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/attendance/attendance-control/components/group-sessions-overview.component.ts): Vista **Maestro** (Bento Grid de KPIs globales, cronograma interactivo, accesos directos a QR/Matrícula).
  - [`AttendanceControlTableComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/attendance/attendance-control/components/attendance-control-table.component.ts): Vista **Detalle** (lista de estudiantes matriculados, estados Presente/Falta/Justificada y botón Guardar).
- **Modales Asociados:**
  - `AttendanceEnrollmentModalComponent`: Matrícula individual manual.
  - `AttendanceNewSessionModalComponent`: Creación de sesiones extraordinarias o reposición.
  - `AttendanceProjectionModalComponent`: Proyección de clase / QR en proyector.
  - `GroupClaimsModalComponent`: Gestión de reclamos y justificaciones médicas/laborales.
  - `GroupInfoModalComponent`: Sabana de asistencia e información general de estudiantes.
  - `TeacherMatriculaModalComponent`: Proyección de QR y PIN temporal de matrícula.

---

### 2.2 Módulo de Docente (`/app/docente/*`)
- **Grupos del Docente:**
  - **Ruta:** `/app/docente/grupos`
  - **Componente:** [`TeacherGruposComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/teacher/teacher-grupos/teacher-grupos.component.ts)
  - **Función:** Lista todos los cursos del docente; al hacer clic en un grupo navega de inmediato a `/app/asistencia?courseId=<id>` (Vista Bento Grid).
- **Horarios del Docente:**
  - **Ruta:** `/app/docente/horarios`
  - **Componente:** `TeacherScheduleComponent`
- **Reclamos y Excusas Docente:**
  - **Ruta:** `/app/docente/reclamos`
  - **Componente:** `TeacherClaimsComponent`

---

### 2.3 Módulo de Estudiante (`/app/estudiante/*`)
- **Horario Personal del Estudiante:**
  - **Ruta:** `/app/estudiante/horarios`
  - **Componente:** `StudentScheduleComponent`
- **Mis Materias y Auto-Asistencia:**
  - **Ruta:** `/app/estudiante/materias`
  - **Componente:** `StudentCoursesComponent`
  - **Subcomponentes:**
    - `StudentCoursesListComponent`: Tarjetas de asignaturas inscritas.
    - `StudentCourseDetailComponent`: Detalle de asistencias acumuladas y porcentaje de inasistencia (alerta de 20%).
    - `StudentClaimFormComponent`: Radicación de reclamos e incapacidades.
    - `StudentCourseEnrollFormComponent`: Matrícula por código.
  - **Modales:**
    - `StudentAutoAsistenciaModalComponent`: Marcación de asistencia con validación de Wi-Fi institucional.
    - `StudentMatriculaCodigoModalComponent`: Auto-matrícula vía código/PIN de aula.
    - `StudentPrerequisitosModalComponent`: Validación de requisitos académicos.

---

### 2.4 Módulo de Coordinador (`/app/coordinador/*`)
> Separado en vistas y rutas independientes con soporte de deep-linking (UX-006). Rutas en [`app.routes.ts`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/app.routes.ts) con `data.roles: ['COORDINADOR']`. Sidebar en [`dashboard-layout.component.ts`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/layouts/dashboard-layout/dashboard-layout.component.ts). Servicio de datos: [`CoordinatorManagementService`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/core/services/coordinator-management.service.ts).

| Ruta | Sidebar | Componente Contenedor | Hijo Presentacional | Spec |
| :--- | :--- | :--- | :--- | :--- |
| `/app/coordinador/docentes` | Gestión de Docentes | [`CoordinatorDocentesComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-docentes/coordinator-docentes.component.ts) | — | ✅ |
| `/app/coordinador/planes-estudio` | Planes de Estudio | [`CoordinatorStudyPlansComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-study-plans/coordinator-study-plans.component.ts) | [`StudyPlansListComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-study-plans/components/study-plans-list.component.ts) | ✅ |
| `/app/coordinador/planes-estudio/nuevo` · `/:planId/editar` | — (deep-link) | [`CoordinatorStudyPlanFormPageComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-study-plans/pages/study-plan-form-page.component.ts) | [`StudyPlanFormComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-study-plans/components/study-plan-form.component.ts) | ✅ |
| `/app/coordinador/planes-estudio/:planId/malla` | — (deep-link) | [`CoordinatorStudyPlanMeshPageComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-study-plans/pages/study-plan-mesh-page.component.ts) | [`StudyPlanMeshComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-study-plans/components/study-plan-mesh.component.ts) | ✅ |
| `/app/coordinador/planes-estudio/:planId/asignaturas/nueva` · `/:asignaturaId/editar` | — (deep-link) | [`CoordinatorSubjectFormPageComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-study-plans/pages/subject-form-page.component.ts) | [`SubjectFormComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-study-plans/components/subject-form.component.ts) | ✅ |
| `/app/coordinador/periodos` | Períodos Académicos | [`CoordinatorPeriodsComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-periods/coordinator-periods.component.ts) | [`AcademicPeriodsTabComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-study-plans/components/academic-periods-tab.component.ts) | ✅ |
| `/app/coordinador/estudiantes` | Estudiantes del Programa | [`CoordinatorStudentsComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-students/coordinator-students.component.ts) | — (Directorio paginado del padrón estudiantil de la carrera) | ✅ |
| `/app/coordinador/materias` | Materias del Programa | [`CoordinatorSubjectsComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/coordinator/coordinator-subjects/coordinator-subjects.component.ts) | — (Catálogo de grupos ofertados, consulta de inscritos y asignaturas curriculares) | ✅ |

---

### 2.5 Módulo de Decano (`/app/decano/*`)
> Separado en vistas independientes por dominio funcional (UX-006). Rutas con `data.roles: ['DECANO']`. Servicios: [`CourseService`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/core/services/course.service.ts), [`SessionService`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/core/services/session.service.ts), [`AdminManagementService`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/core/services/admin-management.service.ts), [`CoordinatorManagementService`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/core/services/coordinator-management.service.ts), [`DeanManagementService`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/core/services/dean-management.service.ts).

| Ruta | Sidebar | Componente | Responsabilidad | Spec |
| :--- | :--- | :--- | :--- | :--- |
| `/app/decano/facultad` | Mi Facultad | [`DeanFacultyComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/dean/dean-faculty/dean-faculty.component.ts) | Resumen ejecutivo de la facultad, ficha institucional, KPIs y accesos rápidos. | ✅ |
| `/app/decano/grupos` | Grupos de la Facultad | [`DeanGruposComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/dean/dean-grupos/dean-grupos.component.ts) | Listado paginado y buscador reactivo de grupos de la facultad y métricas de aforo. | ✅ |
| `/app/decano/grupos/:grupoId` | — (deep-link) | [`DeanGrupoDetalleComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/dean/dean-grupo-detalle/dean-grupo-detalle.component.ts) | Ficha resumen del grupo seleccionado y cronograma de sesiones registradas. | ✅ |
| `/app/decano/programas` | Programas y Planes | [`DeanProgramasComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/dean/dean-programas/dean-programas.component.ts) | Catálogo de programas académicos y planes de estudio adscritos a la facultad. | ✅ |
| `/app/decano/programas/:planId` | — (deep-link) | [`DeanPlanMallaComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/dean/dean-plan-malla/dean-plan-malla.component.ts) | Vista dedicada de solo lectura de la malla curricular y asignaturas por semestre. | ✅ |
| `/app/decano/periodos` | Períodos Académicos | [`DeanPeriodosComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/dean/dean-periodos/dean-periodos.component.ts) | Consulta del calendario académico y vigencias semestrales. | ✅ |
| `/app/decano/infraestructura` | Áreas y Sedes | [`DeanInfraestructuraComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/dean/dean-infraestructura/dean-infraestructura.component.ts) | Consulta de áreas de conocimiento, sedes universitarias y espacios físicos. | ✅ |
| `/app/decano/coordinadores` | Gestión de Coordinadores | [`DeanCoordinadoresComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/dean/dean-coordinadores/dean-coordinadores.component.ts) | Administración y nombramiento de coordinadores de programa. | — |

---

### 2.6 Módulo de Administrador Institucional (`/app/admin/*`)
> Separado en vistas independientes en el commit `a3bbebc` (HU116). Rutas con `data.roles: ['ADMINISTRADOR', 'ADMIN']`. Servicio: [`AdminManagementService`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/core/services/admin-management.service.ts).

| Ruta | Sidebar | Componente | Spec |
| :--- | :--- | :--- | :--- |
| `/app/admin/facultades` | Gestión de Facultades | [`AdminFacultadesComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/admin/admin-facultades/admin-facultades.component.ts) | ✅ |
| `/app/admin/decanos` | Gestión de Decanos | [`AdminDecanosComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/admin/admin-decanos/admin-decanos.component.ts) | — |
| `/app/admin/sedes` | Sedes Institucionales | [`AdminSedesComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/admin/admin-sedes/admin-sedes.component.ts) | ✅ |
| `/app/admin/areas` | Áreas de Conocimiento | [`AdminAreasComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/admin/admin-areas/admin-areas.component.ts) | ✅ |
| `/app/admin/sistema` | Sistema & Auditoría | [`AdminSystemComponent`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/admin/admin-system/admin-system.component.ts) | — |
| `/app/admin/catalogos` | — | `redirectTo: 'admin/facultades'` (ruta legada) | — |

> [!WARNING]
> [`admin-catalogs.component.ts`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/app/features/admin/admin-catalogs/admin-catalogs.component.ts) sigue en disco pero ya no está enrutado (los `Catalog*Component` fueron eliminados). Candidato a limpieza.

---

### 2.7 Patrón de Separación de Vistas (referencia para nuevas pantallas)
Aplicado en Admin (`a3bbebc`), Decano y Coordinador (`UX-006`). Usarlo cuando una pantalla acumule pestañas de dominios distintos o sub-vistas controladas por signals sin URL.

1. **Una ruta por dominio funcional** en `app.routes.ts` (`loadComponent`, `roleGuard`, `data.roles`) y **una entrada de sidebar** por ruta de primer nivel.
2. **Maestro-detalle con URL:** listas en `/<rol>/<recurso>`, detalle/formularios en `/<rol>/<recurso>/:id[/accion]` (deep-link y botón “atrás” funcionales). Nada de `subVista.set(...)` para navegar entre pantallas completas.
3. **Carpeta por vista:** `features/<rol>/<rol>-<recurso>/<rol>-<recurso>.component.ts` + `.spec.ts`.
4. **Ruta antigua:** conservar como vista resumen o con `redirectTo` hacia la nueva vista principal.
5. **Hijos presentacionales** (`components/`) con `input()`/`output()` sin dependencias de servicios; el contenedor por ruta orquesta servicios y `Router`.

---

## 3. Catálogo de Componentes Reutilizables (`src/app/shared/components`)

| Componente | Selector | Propósito |
| :--- | :--- | :--- |
| `ButtonComponent` | `app-button` | Botones Aurora Design System con variantes (primary, secondary, danger, ghost) y estado `loading`. |
| `BadgeComponent` | `app-badge` | Etiquetas de estado (presente, ausente, justificada, borrador, finalizada). |
| `CardComponent` | `app-card` | Contenedores redondeados con sombra y borde cálido (`warm-200`). |
| `ModalComponent` | `app-modal` | Ventanas modales accesibles con backdrop difuminado y foco gestionado. |
| `FormSelectComponent` | `app-form-select` | Selects reactivos estilizados compatibles con formularios y Signals. |
| `FormFieldComponent` | `app-form-field` | Wrappers de inputs con etiquetas y mensajes de error automáticos. |
| `AvatarComponent` | `app-avatar` | Avatar de usuario con iniciales o fotografía y anillos de color por rol. |
| `PaginationComponent` | `app-pagination` | Controles de paginación para consultas con `ApiPageResponse<T>`. |
| `ToastComponent` | `app-toast` | Notificaciones flotantes reactivas. |
| `SkeletonComponent` | `app-skeleton` | Efectos shimmer para estados de carga (`isLoading`). |
| `EmptyStateComponent` | `app-empty-state` | Ilustración y mensaje cuando una lista o consulta no arroja datos. |

---

## 4. Guía Rápida para Diagnóstico de Problemas en Frontend

1. **Problema de Espaciado / Layout pegado:**
   - *Causa habitual:* El selector de Angular (`app-*`) es elemento inline por defecto.
   - *Solución:* Incluir `host: { class: 'block w-full' }` en el `@Component`, o usar `flex flex-col gap-6` en el padre en lugar de `space-y-*`.
2. **El estado no se actualiza o no responde:**
   - *Verificar:* Todos los componentes usan `ChangeDetectionStrategy.OnPush` y Angular Signals (`signal()`, `computed()`). Prohibido mutar arreglos directamente (`lista.push()`); siempre usar `lista.update(prev => [...prev, nuevo])`.
3. **Pérdida de Reactividad en Tiempo Real:**
   - *Verificar:* `AttendanceRealtimeSyncService` conectado al SSE `/api/v1/realtime/stream`. Las reconexiones deben reflejarse en los signals del componente.

# CLOSURE — UX-006: Separación de Vistas Sobrecargadas (Decano y Coordinador)

> **Work Item:** `UX-006-dean-coordinator-view-split`  
> **Fecha de Cierre:** 2026-10-18  
> **Estado:** CLOSED

---

## 1. Resumen de Entregables

1. **Enrutamiento y Configuración (`app.config.ts`, `app.routes.ts`, `dashboard-layout.component.ts`):**
   - Habilitado `withComponentInputBinding()` en `provideRouter(routes, withComponentInputBinding())`.
   - Registradas las rutas dedicadas lazy-loaded para `DECANO` (`/app/decano/grupos`, `/app/decano/grupos/:grupoId`, `/app/decano/programas`, `/app/decano/programas/:planId`, `/app/decano/periodos`, `/app/decano/infraestructura`) y `COORDINADOR` (`/app/coordinador/planes-estudio/nuevo`, `/app/coordinador/planes-estudio/:planId/editar`, `/app/coordinador/planes-estudio/:planId/malla`, `/app/coordinador/planes-estudio/:planId/asignaturas/nueva`, `/app/coordinador/planes-estudio/:planId/asignaturas/:asignaturaId/editar`, `/app/coordinador/periodos`, `/app/coordinador/estudiantes`, `/app/coordinador/materias`).
   - Actualizado el menú lateral (`DashboardLayoutComponent`) para reflejar las nuevas vistas modulares en ambos roles (`Estudiantes del Programa` y `Materias del Programa` en Coordinador).
2. **Desacoplamiento de Vistas de Coordinador:**
   - `/app/coordinador/planes-estudio` convertido en vista maestra de listado y KPIs (`CoordinatorStudyPlansComponent`), delegando creación/edición de planes (`StudyPlanFormPageComponent`), gestión de malla curricular (`StudyPlanMeshPageComponent`), alta/edición de asignaturas (`SubjectFormPageComponent`) y períodos académicos (`CoordinatorPeriodsComponent`) a páginas dedicadas.
   - `/app/coordinador/estudiantes` refactorizado como vista exclusiva del **Directorio de Estudiantes del Programa** (`CoordinatorStudentsComponent`), retirando la pestaña de **Solicitudes de Cupo** y los controles manuales de matrícula (responsabilidad del rol Docente) y preservando intacto `coordinator-students.component.spec.ts`.
   - `/app/coordinador/materias` creado como vista dedicada (`CoordinatorSubjectsComponent`) para listar todas las materias y grupos activos de la carrera, consultar la nómina de estudiantes inscritos por grupo y explorar el catálogo curricular del programa.
3. **Desacoplamiento de Vistas de Decano:**
   - `/app/decano/facultad` refactorizado en un Resumen Ejecutivo de Facultad (`DeanFacultyComponent`) con tarjetas de acceso rápido, preservando intacta la compatibilidad con `dean-faculty.component.spec.ts`.
   - Creadas las vistas especializadas `DeanGruposComponent`, `DeanGrupoDetalleComponent`, `DeanProgramasComponent`, `DeanPlanMallaComponent`, `DeanPeriodosComponent` y `DeanInfraestructuraComponent`.
4. **Actualización del Mapa de Componentes (`docs/MAPA_COMPONENTES_FRONTEND.md`):**
   - Documentadas todas las rutas, componentes, subpáginas y el patrón arquitectónico de separación de vistas (Secciones 2.4, 2.5, 2.6 y 2.7).

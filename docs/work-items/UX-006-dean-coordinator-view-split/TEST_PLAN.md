# UX-006 — Plan de Pruebas (TEST_PLAN)

## Alcance de Pruebas

1. **Rutas y Navegación (`app.routes.ts` y `DashboardLayoutComponent`):**
   - Verificar que todas las rutas nuevas de Decano (`/app/decano/facultad`, `/app/decano/grupos`, `/app/decano/grupos/:grupoId`, `/app/decano/programas`, `/app/decano/programas/:planId`, `/app/decano/periodos`, `/app/decano/infraestructura`) estén registradas con `roleGuard` y `data.roles: ['DECANO']`.
   - Verificar que todas las rutas nuevas de Coordinador (`/app/coordinador/planes-estudio`, `/app/coordinador/planes-estudio/nuevo`, `/app/coordinador/planes-estudio/:planId/editar`, `/app/coordinador/planes-estudio/:planId/malla`, `/app/coordinador/planes-estudio/:planId/asignaturas/nueva`, `/app/coordinador/planes-estudio/:planId/asignaturas/:asignaturaId/editar`, `/app/coordinador/periodos`) estén registradas con `roleGuard` y `data.roles: ['COORDINADOR']`.
   - Verificar entradas de menú lateral por rol en `DashboardLayoutComponent`.

2. **Componentes del Rol Decano:**
   - `DeanFacultyComponent`: No regresión del spec existente (`dean-faculty.component.spec.ts`) y renderizado de resumen ejecutivo y enlaces rápidos.
   - `DeanGruposComponent` (`dean-grupos.component.spec.ts`): Carga de grupos, filtrado reactivo con Signals (`filtroTexto`), cálculo de KPIs y navegación a `/app/decano/grupos/:grupoId`.
   - `DeanGrupoDetalleComponent` (`dean-grupo-detalle.component.spec.ts`): Resolución del grupo por `grupoId`, carga de sesiones del grupo y botón de retorno a `/app/decano/grupos`.
   - `DeanProgramasComponent` (`dean-programas.component.spec.ts`): Renderizado de planes/programas y navegación a `/app/decano/programas/:planId`.
   - `DeanPlanMallaComponent` (`dean-plan-malla.component.spec.ts`): Resolución del plan por `planId`, visualización de asignaturas por semestre y filtro por semestre/texto.
   - `DeanPeriodosComponent` (`dean-periodos.component.spec.ts`): Carga explícita de `getPeriodosAcademicos()` en `ngOnInit` y visualización de vigencias.
   - `DeanInfraestructuraComponent` (`dean-infraestructura.component.spec.ts`): Carga de áreas de conocimiento y sedes institucionales con filtro reactivo.

3. **Componentes del Rol Coordinador:**
   - `CoordinatorStudyPlansComponent` (`coordinator-study-plans.component.spec.ts`): Carga de planes de estudio y navegación mediante `Router` hacia crear plan, editar plan y ver malla.
   - `CoordinatorStudyPlanFormPageComponent` (`coordinator-study-plan-form-page.component.spec.ts`): Creación y edición de plan de estudio según parámetro `planId` y retorno a `/app/coordinador/planes-estudio`.
   - `CoordinatorStudyPlanMeshPageComponent` (`coordinator-study-plan-mesh-page.component.spec.ts`): Carga de malla y asignaturas por `planId`, agregar/eliminar semestre y navegación a formulario de asignatura.
   - `CoordinatorSubjectFormPageComponent` (`coordinator-subject-form-page.component.spec.ts`): Creación y edición de asignatura en el plan y retorno a la malla curricular.
   - `CoordinatorPeriodsComponent` (`coordinator-periods.component.spec.ts`): Carga de períodos académicos, creación/edición y cambio de estado en su propia vista `/app/coordinador/periodos`.
   - `CoordinatorStudentsComponent` (`coordinator-students.component.spec.ts`): No regresión del spec existente (`LB-001B.1B`), dedicando la vista exclusivamente al Directorio Estudiantil del Programa sin pestaña de Solicitudes de Cupo.
   - `CoordinatorSubjectsComponent` (`coordinator-subjects.component.spec.ts`): Carga de grupos/materias ofertadas, asignaturas curriculares del programa y consulta de estudiantes inscritos por grupo en `/app/coordinador/materias`.

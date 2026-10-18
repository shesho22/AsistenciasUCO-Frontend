# UX-006 — Separación de Vistas Monolíticas de Decano y Coordinador

## Objetivo

Refactorizar las vistas sobrecargadas `/app/decano/facultad` y `/app/coordinador/planes-estudio` dividiéndolas en rutas independientes de primer nivel y rutas de detalle con soporte de deep-linking, siguiendo el patrón arquitectónico establecido en el rol de Administrador (`a3bbebc` - HU116).

## Alcance y Límites

- **Ámbito:** Exclusivamente Frontend (`GestioAsistenciaFrontend`).
- **Sin cambios en Backend / DB / Contratos OpenAPI:** No se modifican esquemas ni contratos WORM.
- **Compatibilidad hacia atrás:** Las rutas existentes (`/app/decano/facultad`, `/app/coordinador/planes-estudio`) se preservan como puntos de entrada válidos de sus respectivos módulos.

## Diseño de Rutas y Componentes

### 1. Módulo de Decano (`/app/decano/*`)

| Ruta | Componente | Responsabilidad | Entrada Sidebar |
| :--- | :--- | :--- | :--- |
| `/app/decano/facultad` | `DeanFacultyComponent` | Resumen ejecutivo de la facultad (ficha institucional, KPIs, accesos rápidos a módulos). Conserva métodos de compatibilidad de pruebas. | Mi Facultad |
| `/app/decano/grupos` | `DeanGruposComponent` | Supervisión de grupos activos de la facultad, KPIs de cupos, buscador reactivo con Signals y paginación. | Grupos de la Facultad |
| `/app/decano/grupos/:grupoId` | `DeanGrupoDetalleComponent` | Detalle de un grupo específico y su cronograma de sesiones registradas (deep-link). | — |
| `/app/decano/programas` | `DeanProgramasComponent` | Listado de programas académicos y planes de estudio adscritos a la facultad. | Programas y Planes |
| `/app/decano/programas/:planId` | `DeanPlanMallaComponent` | Visualización en página completa (solo lectura) de la malla curricular y asignaturas por semestre de un plan. | — |
| `/app/decano/periodos` | `DeanPeriodosComponent` | Consulta del calendario académico y vigencias de períodos lectivos. | Períodos Académicos |
| `/app/decano/infraestructura` | `DeanInfraestructuraComponent` | Consulta de áreas de conocimiento y sedes universitarias donde opera la facultad. | Áreas y Sedes |
| `/app/decano/coordinadores` | `DeanCoordinadoresComponent` | Gestión de coordinadores de programa (sin cambios). | Gestión de Coordinadores |

### 2. Módulo de Coordinador (`/app/coordinador/*`)

| Ruta | Componente Contenedor | Subcomponente Presentacional | Entrada Sidebar |
| :--- | :--- | :--- | :--- |
| `/app/coordinador/planes-estudio` | `CoordinatorStudyPlansComponent` | `StudyPlansListComponent` | Planes de Estudio |
| `/app/coordinador/planes-estudio/nuevo` | `CoordinatorStudyPlanFormPageComponent` | `StudyPlanFormComponent` (`modo="CREAR"`) | — |
| `/app/coordinador/planes-estudio/:planId/editar` | `CoordinatorStudyPlanFormPageComponent` | `StudyPlanFormComponent` (`modo="EDITAR"`) | — |
| `/app/coordinador/planes-estudio/:planId/malla` | `CoordinatorStudyPlanMeshPageComponent` | `StudyPlanMeshComponent` | — |
| `/app/coordinador/planes-estudio/:planId/asignaturas/nueva` | `CoordinatorSubjectFormPageComponent` | `SubjectFormComponent` (`modo="CREAR"`) | — |
| `/app/coordinador/planes-estudio/:planId/asignaturas/:asignaturaId/editar` | `CoordinatorSubjectFormPageComponent` | `SubjectFormComponent` (`modo="EDITAR"`) | — |
| `/app/coordinador/periodos` | `CoordinatorPeriodsComponent` | `AcademicPeriodsTabComponent` | Períodos Académicos |
| `/app/coordinador/docentes` | `CoordinatorDocentesComponent` | — (sin cambios) | Gestión de Docentes |
| `/app/coordinador/estudiantes` | `CoordinatorStudentsComponent` | — (Directorio Estudiantil del Programa; se retiran Solicitudes de Cupo y matrícula manual) | Estudiantes del Programa |
| `/app/coordinador/materias` | `CoordinatorSubjectsComponent` | — (Catálogo de materias/grupos ofertados, consulta de inscritos y asignaturas curriculares) | Materias del Programa |

## Criterios de Aceptación y No Regresión

1. `withComponentInputBinding()` habilitado en `app.config.ts` para enlazar parámetros de ruta (`grupoId`, `planId`, `asignaturaId`) a `input()` de Angular Signals.
2. Todos los componentes nuevos utilizan `ChangeDetectionStrategy.OnPush`, Signals (`signal`, `computed`) y cero timers de polling.
3. `MAPA_COMPONENTES_FRONTEND.md` actualizado reflejando todas las rutas, componentes contenedores, subcomponentes y el patrón de separación de vistas.
4. Compilación de producción (`npm run build`) y suite de pruebas unitarias (`npm run test:ci`) en verde.

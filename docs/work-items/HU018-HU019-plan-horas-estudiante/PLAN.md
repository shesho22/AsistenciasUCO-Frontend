---
status: active
type: work-item
scope: frontend
owner: fullstack-team
last-reviewed: 2026-11-10
---

# HU018-HU019 — Plan de estudios por semestres y barra de horas de cada materia

El origen, las reglas y el contrato HTTP están en el work item homónimo del backend. La decisión es de John (2026-11-10): la barra es por horas, porque la aplicación no maneja notas ni asignaturas aprobadas.

## Cambios

- **Barra de horas en "Mis materias":**
  - Cada tarjeta de `StudentCoursesListComponent` muestra una barra con tres valores: las horas a las que el estudiante asistió, las horas dictadas hasta hoy y las horas programadas del grupo. Los créditos de la materia siguen en la misma tarjeta.
  - Las horas asistidas y dictadas ya venían en `indicadores`; las programadas llegan en el campo nuevo `horasProgramadas` de `GET /estudiante/materias`, junto con `sesionesProgramadas`.
  - El frontend no calcula horas: solo convierte los tres valores en el ancho de cada tramo y en el porcentaje del curso ya dictado. Los anchos nunca pasan de 100 % y el tramo asistido nunca sobresale del dictado.
  - Si el backend no informa las horas programadas, la tarjeta dice "Horas programadas: no disponible" y no dibuja la barra. Si el grupo aún no tiene sesiones, lo dice. Sin indicadores de asistencia, el bloque no aparece.
  - La barra tiene texto alternativo con los tres valores y una leyenda visible, así que no depende del color.
- **Pestaña "Plan de estudios":**
  - `Mis materias` gana una cuarta pestaña, `/app/estudiante/mis-materias/plan`, con `StudentStudyPlanComponent`.
  - Muestra cada plan activo de los programas del estudiante: programa, plan, semestres, asignaturas, créditos del plan y un resumen de lo que cursa hoy.
  - Cada semestre es un acordeón (`details`) con sus asignaturas: código, nombre, créditos, carácter y tipo. Las que el estudiante cursa llevan la marca "Cursando" y el nombre del grupo.
  - Se abren de entrada los semestres donde cursa algo, o el único semestre del plan. Un semestre sin asignaturas lo dice.
  - Estados: carga, error con el mensaje del backend y "Reintentar", y vacío cuando no hay un plan activo.
- **Datos:** `PlanEstudioEstudianteService` consulta `GET /estudiante/plan-estudio` sin toast global. `StudentPortalMapper.toMateria` mapea `horasProgramadas` y `sesionesProgramadas`; un valor que no es un número válido queda en `null`.
- **Modo de datos simulados:** `mock-backend.interceptor` responde `GET /estudiante/plan-estudio` con un plan de ejemplo de la misma forma que el backend.

## Privacidad

El estudiante solo ve su plan y sus materias. El frontend no envía ningún identificador de estudiante: el backend lo resuelve de la sesión.

## Pruebas

- `student-courses-list.component.spec.ts`: la barra con sus tres valores, su texto alternativo y sus anchos; los anchos nunca pasan de 100 %; sin horas programadas no dibuja la barra; con cero dice que no hay sesiones; sin indicadores no muestra el bloque.
- `mock-backend.interceptor.spec.ts`: el plan simulado tiene totales coherentes y un semestre vacío.
- `student-portal.mapper.spec.ts`: mapea las horas y sesiones programadas y descarta valores inválidos.
- `plan-estudio-estudiante.service.spec.ts`: consulta sin parámetros y sin toast global.
- `student-study-plan.component.spec.ts`: carga, totales, orden de semestres, detalle de asignaturas, "Cursando", semestre vacío, estado vacío, error con reintento y datos que el backend no informa.
- `student-mis-materias.routes.spec.ts`: la cuarta pestaña.

## Rollback

Revertir el commit del work item.

# HU008-oferta-grupos-estudiante — Oferta de grupos del estudiante

## Objetivo

El estudiante ve, en "Oferta de Grupos", los grupos del período vigente y de los próximos:
- las asignaturas **específicas** de su programa;
- las **transversales** (básicas e institucionales) de su institución, marcadas con "Transversal · Básica" o "Transversal · Institucional".

Cada grupo muestra el docente, el horario y los cupos. Es solo consulta (CULM-001 A.1): el estudiante se matricula con el QR o PIN del docente o por matrícula manual.

## Alcance y límites

- El contrato HTTP, las decisiones de John (J1-J5) y la validación de las 3 capas están en el work item homónimo del backend (`docs/work-items/HU008-oferta-grupos-estudiante/`).
- **Endpoint nuevo:** `GET /api/v1/estudiante/oferta-academica`.
- **Transversales:** si en el futuro se ocultan (parámetro `OFERTA.INCLUIR_TRANSVERSALES = 0` en la DB), la pantalla no cambia. Simplemente deja de recibirlas.

## Pantallas, servicios y simulación

| Elemento | Cambio |
|---|---|
| `StudentGroupOfferComponent` (`features/student/student-group-offer`) | Nuevo. Incluye:<br>- búsqueda con debounce y paginación en el servidor;<br>- tarjetas con estado del período, horario, cupos y etiqueta de transversal;<br>- indicación "Ya estás matriculado" o el texto de cómo matricularse;<br>- error visible. |
| `OfertaAcademicaService` (`core/services`) | Nuevo, sin toast global |
| `app.routes.ts`, `dashboard-layout.component.ts` | Ruta `/app/estudiante/oferta` (ESTUDIANTE) y menú "Oferta de Grupos" |
| `mock-backend.interceptor` | `GET .../estudiante/oferta-academica` |

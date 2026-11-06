# HU005-HU016-categorias-justificacion — Motivos para justificar una inasistencia

Contrato y validación de las 3 capas: work item homónimo del backend.

## Cambios

- **HU005:** `StudentClaimFormComponent` recibe `categorias` (catálogo `GET /api/v1/categorias-justificacion`) en lugar de la lista fija.
  - Preselecciona la primera categoría y muestra la descripción de la elegida.
  - Sigue emitiendo el **nombre** en `categoria`, así que el contrato de `POST /estudiante/reclamos` no cambia.
  - Sin catálogo, no deja radicar y lo informa. No hay lista de respaldo en el cliente.
- **HU016:** `MotivosJustificacionComponent` (nuevo) es un bloque desplegable "¿Por qué motivos puedo justificar una inasistencia?". Está en `StudentCourseDetailComponent` y se oculta si el catálogo no trae filas.
- `StudentCoursesComponent` carga el catálogo una vez y lo pasa al detalle y al formulario.
- `CategoriaJustificacion` (tipo) pasa a `string`: los valores salen del catálogo.
- **Servicio y mock:** `ConsultasTransversalesService.getCategoriasJustificacion()` y su simulación en `mock-consultas-transversales.ts`.

## Rollback

Revertir el commit del work item.

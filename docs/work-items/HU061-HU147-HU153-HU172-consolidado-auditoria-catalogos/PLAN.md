# HU061-HU147-HU153-HU172-consolidado-auditoria-catalogos — Consolidado, auditoría, catálogos y reglas de asignatura

> **Actualización (2026-11-04):** por la regla de John de catálogos base de solo consulta, la escritura de HU153 se retiró en CAT-01 (`docs/work-items/CAT-01-catalogos-solo-consulta/`). El resto de este work item sigue vigente.

## Objetivo

Pantallas para HU061 (consolidado de asistencia del coordinador y del decano), HU172 (auditoría del administrador) y HU153 (tipos de documento), y el formulario de asignaturas con componentes (HU147) y áreas reales, créditos obligatorios y semestre del plan (P5). Las pantallas de otros integrantes solo reciben cambios acotados.

## Alcance y límites

- El contrato HTTP, las decisiones de John (D1-D8) y la validación de las 3 capas están en el work item homónimo del backend (`docs/work-items/HU061-HU147-HU153-HU172-consolidado-auditoria-catalogos/`).
- Sin cambios en `SecurityConfig`. HU148 queda DESCARTADA (componentes fijos BAS/INS/ESP) y HU006 sigue solo como consulta.

## Pantallas, servicios y simulación

- **HU061:** `ConsolidadoAsistenciaComponent` (`features/coordinator/coordinator-consolidado`) en `/app/coordinador/consolidado-asistencia` y en `/app/decano/consolidado-asistencia` con `data.comoDecano`. Filtros por cohorte (períodos de `GET /coordinador/periodos-academicos`, lectura compartida), materia y docente (opciones acumuladas de las filas ya consultadas). Paginación del servidor con `ListadoPaginado`.
- **HU172:** `AdminAuditoriaComponent` (`features/admin/admin-system`) dentro de la pestaña "Trazabilidad y Auditoría" de `AdminSystemComponent`. Rango por defecto: los últimos 7 días, contando hoy; máximo 90 días, validado también en el cliente. Las fechas locales se convierten a ISO-8601 UTC `[desde 00:00, día siguiente a hasta 00:00)`. Por defecto solo acciones de asistencia.
- **HU153:** `AdminTiposDocumentoComponent` dentro de `AdminCatalogsComponent`. Alta con código de 1 a 5 letras, que no se modifica después, y edición solo del nombre; sin acciones de estado. `CatalogService` gana `crearTipoIdentificacion` y `actualizarTipoIdentificacion`.
- **Ruta `/app/admin/catalogos`:** antes redirigía a facultades y `AdminCatalogsComponent` (HU154, tipos de programa) no tenía ruta. Ahora carga esa pantalla, con la entrada de menú "Tipos de Programa y Documento".
- **HU147 / P5:** `SubjectFormComponent` recibe `componentes` (de `GET /coordinador/componentes-formacion`) y `areas` (activas, de `GET /admin/areas`). Los dos son obligatorios y no hay opciones quemadas: antes se ofrecían Obligatoria, Electiva y Complementaria, que no existen. Los créditos son obligatorios, enteros y mayores que cero, sin valor por defecto. El semestre es una lista con los semestres del plan.
- **Corrección de contrato:** `aSolicitudAsignatura()` (`coordinator-management.service.ts`) envía `semestreNumero`, `nombreArea` y `nombreComponente`. Antes se enviaban `semestre`, `area` y `componente`, que el backend no leía.
- `ConsultasTransversalesService` gana `getConsolidadoAsistencia`, `getAuditoria` y `getComponentesFormacion`.
- **Modo mock:** `mock-consultas-transversales.ts` simula los 3 GET nuevos. Se quitó la respuesta vieja de `/admin/auditoria` del interceptor y `cargarAuditoria()` de `AdminManagementService`: tenían la forma simulada `RegistroAuditoriaItem`, que el backend no devuelve.

## Archivos de otros integrantes que se tocan (aviso a Sergio)

- `app.routes.ts` y `dashboard-layout.component.ts`: 2 rutas y 3 entradas de menú nuevas; `admin/catalogos` deja de redirigir.
- `admin-system.component.ts`: la pestaña de auditoría usa el componente nuevo. Se quitan el filtro local y la carga simulada.
- `admin-catalogs.component.ts`: incluye la sección de tipos de documento.
- `subject-form.component.ts`, `subject-form-page.component.ts` y `coordinator-management.service.ts`: selectores reales, validaciones y mapeo del cuerpo.
- `admin-management.service.ts`: se quita `cargarAuditoria()` y la señal `auditoria`.

## Rollback

Revertir los commits del work item; el frontend no tiene migraciones de datos.

# TEST_PLAN — HU061-HU147-HU153-HU172-consolidado-auditoria-catalogos

| Spec | Cobertura |
|---|---|
| `consolidado-asistencia.component.spec.ts` | Ruta del coordinador y del decano; métricas y porcentajes; filtro por cohorte desde la página 1; sin resultados; error del backend; opciones de materia y docente acumuladas sin repetir. |
| `admin-auditoria.component.spec.ts` | Por defecto 7 días y solo asistencia; nombre del usuario, resultado fallido y código de error; acción en mayúsculas, resultado y "todas"; rango inválido no consulta; `rangoUtc` (días completos, máximo 90) y `fechaLocal`. |
| `admin-system.component.spec.ts` | La pestaña de auditoría consulta `GET /admin/auditoria` (ya no la carga simulada). |
| `admin-tipos-documento.component.spec.ts` | Listado sin acciones de estado; validación de código (1 a 5 letras, solo en el alta) y nombre (3 a 50); alta en mayúsculas y recarga; edición solo del nombre; error del backend; formulario inválido no envía. |
| `admin-catalogs.component.spec.ts` | Sin cambios de casos (HU154); se aísla la sección de tipos de documento con un doble de `CatalogService`. |
| `subject-form.component.spec.ts` | Solo componentes reales, áreas activas y semestres del plan; créditos sin valor por defecto, enteros y > 0; área, componente y semestre obligatorios; emite créditos numéricos; edición conserva lo que llega. |
| `subject-form-page.component.spec.ts` | Carga componentes y áreas; el cuerpo enviado usa `semestreNumero`, `nombreArea` y `nombreComponente`. |
| `consultas-transversales.service.spec.ts` | Rutas y parámetros del consolidado (coordinador y decano), de la auditoría y de los componentes. |
| `mock-consultas-transversales.spec.ts` | Simulación del consolidado con filtro por materia, de la auditoría (solo asistencia y todas) y de los componentes. |
| `admin-management.service.spec.ts` | Se quita el caso de `cargarAuditoria()`. |

Validación manual: MV-013 del ledger del backend.

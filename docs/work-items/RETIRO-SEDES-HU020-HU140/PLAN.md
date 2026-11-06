---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-06
---

# RETIRO-SEDES-HU020-HU140 — Retiro de sedes y espacios físicos

El contrato y la decisión de John están en el work item homónimo del backend: HU020 y HU140 descartadas el 2026-11-06, porque sedes, bloques y aulas no se piden.

## Cambios

- Se retiran la pantalla `/app/admin/sedes` (`AdminSedesComponent` y su spec) y la opción "Sedes Institucionales" del menú del administrador.
- `AdminManagementService` pierde las señales y los métodos de sedes y espacios físicos (`cargarSedes`, `crearSede`, `actualizarSede`, `cambiarEstadoSede` y los equivalentes de espacios).
- Se retiran los modelos `SedeInstitucionalItem` y `EspacioFisicoItem`, `MOCK_SEDES` y `MOCK_ESPACIOS_FISICOS`, y sus simulaciones del interceptor de mocks.
- `role-scope.interceptor`: la excepción de lectura de `/admin` para DECANO y COORDINADOR queda solo con `areas`, igual que `SecurityConfig`.
- Decano:
  - La opción del menú pasa de "Áreas y Sedes" a "Áreas de Conocimiento". `DeanInfraestructuraComponent` muestra solo las áreas.
  - En "Mi Facultad" (`DeanFacultyComponent`) se quitan la tarjeta "Sedes y Espacios", la "Sede Principal" y el "Total Espacios Físicos".
  - Ya no se llama a `/admin/sedes`, que respondía 501.
- La pantalla de sedes la hizo Sergio; el aviso para él va en el mensaje consolidado del equipo.

## Rollback

Revertir el commit del work item.

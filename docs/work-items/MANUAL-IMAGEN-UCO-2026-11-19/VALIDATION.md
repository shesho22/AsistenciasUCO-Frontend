# Validación — MANUAL-IMAGEN-UCO-2026-11-19

Fecha: 2026-11-19/20, rama `feat/manual-imagen-uco`, Windows 10, Node 24, Chrome Headless 157.

| Comando | Resultado |
|---|---|
| `npm run lint` | exit 0, 0 problemas |
| `npm run lint:tokens` | exit 0: tokens OK, contraste WCAG 2.1 AA OK, a11y (nombre accesible y `th scope`) OK |
| `npm run check:retiro-solicitudes`, `check:registro-individual`, `check:hu-en-ui`, `check:mensajes-ui`, `check:mensajes-ui-catalogo` | exit 0 |
| `npm run check:openapi-contract` | exit 0 (2 avisos previos: `COORDINADOR` como tipo de cancelación aún no está en el contrato) |
| `npm run check:matriz-hu` | exit 0 tras `npm run sync:matriz-hu` |
| `ng test --watch=false --browsers=ChromeHeadlessCI` | **3665 SUCCESS, 0 FAILED** |
| `ng build` (producción) | exit 0. Quedan 3 avisos NG8113 de imports sin usar en `ProfileComponent` y `AdminEmailManagementComponent` |

## Revisión en pantalla

- Se usaron los usuarios de prueba del laboratorio local. Las capturas, a 1366x768 y 390x844, están fuera del repo, en `capturas-manual-uco/F_*.png` de la carpeta del proyecto.
- Pantallas: login; coordinador Asistencia del programa y Asignaturas; docente Mis grupos y Justificaciones; estudiante Mis materias y Materias matriculadas; administrador Organigrama.
- Todas las pantallas cargan sus tablas y no hay desplazamiento horizontal de página en el teléfono.
- A 1366x768 la tabla de grupos de «Asistencia del programa» se ve sin desplazar.

## Limitaciones

- Los e2e de Playwright (`e2e/`) se ajustaron (selectores de tabla y textos nuevos), pero no se ejecutaron en esta pasada.
- El backend local devolvió 503 intermitentes de autorización durante las capturas; se tomaron con reintentos.
- Persisten dos 403 de backend ajenos a este trabajo (ver PLAN, «Fuera de alcance»).

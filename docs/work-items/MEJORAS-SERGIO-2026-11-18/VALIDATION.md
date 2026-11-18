# MEJORAS-SERGIO-2026-11-18 — Validación del frontend

Fecha: 2026-11-18. Equipo local (Windows 10, Node 24, Chrome Headless 157). Rama `feat/mejoras-sergio-2026-11-18`.

## Compuertas ejecutadas (equivalentes a `npm run verify`)

| Comando | Resultado |
|---|---|
| `npm run lint` | OK (sin hallazgos) |
| `npm run lint:tokens` | OK (tokens y a11y: `th` con `scope`, controles con nombre) |
| `npm run test:ci` | **3417 SUCCESS, 0 FAILED**; cobertura: statements 94.94 %, branches 84.07 %, lines 95.85 % |
| `npm run coverage:realtime:check` | PASSED (line 95.24 %, branch 86.81 %) |
| `npm run check:retiro-solicitudes` / `check:registro-individual` / `check:hu-en-ui` / `check:mensajes-ui` | OK |
| `npm run check:mensajes-ui-catalogo` | PASS (142 textos). En Windows falla solo por CRLF de la copia de trabajo; no hubo cambio real. |
| `npm run check:matriz-hu` | PASS tras `sync:matriz-hu` (commit propio) |
| `npm run check:openapi-contract` | PASS (2 avisos preexistentes de `cancelacion.tipo = COORDINADOR`) |
| `npm run build -- --configuration=production` | OK (exit 0) |

## Pruebas nuevas o ajustadas por ítem

| Ítem | Prueba |
|---|---|
| 1, 12 | `coordinator-docentes.component.spec.ts` (tabla con acciones, sin chips/filtro de tipo), `coordinator-docente-*-modal.component.spec.ts`, `coordinator-management.service.spec.ts` (sin `idTipoVinculacion` ni `/tipos-vinculacion`) |
| 3 | `dean-programas-tab.component.spec.ts`, `subpestanas.component.spec.ts` |
| 4, 5 | `dean-directorio.component.spec.ts` (`CC 43000111`, `TI 1017000111`) |
| 6 | `dean-grupo-detalle.component.spec.ts` (39 sesiones → 20 + 19 por página) |
| 7 | `action-menu.component.spec.ts` (abre hacia arriba sin espacio), `study-plans-list.component.spec.ts` (`overflow-visible`) |
| 8 | `coordinator-students.component.spec.ts` (tabla, "Ver ficha", sin estado financiero ni promedio) |
| 9 | `teacher-schedule.component.spec.ts` (franja → `/app/docente/grupos?grupo=<id>`) |
| 10 | `attendance-control.cancelada.spec.ts` (botón Cancelar solo en no canceladas, éxito con notificados, rechazo `SES_012` en el modal) |
| 11 | `coordinator-subjects.component.spec.ts` (subpestañas, nómina en ventana emergente) |
| 13 | `study-plan-mesh-page.component.spec.ts` (el semestre nuevo aparece en el filtro y en la caché del servicio sin recargar) |

## Ítems sin cambio de frontend

- **2**: el flujo ya existía (backend `AprobarSolicitudSesionUseCaseImpl` → `SESION_MANUAL_CREADA_ESTUDIANTE`); el modal de
  aprobación ya lo anuncia. Validado por las pruebas del backend.

## No verificado aquí

- Prueba manual en `localhost:4200` contra el backend real (los servidores se dejaron detenidos para que John los reinicie).
- E2E de Playwright (no forman parte de `verify`).

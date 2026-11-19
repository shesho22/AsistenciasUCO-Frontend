# VALIDATION — HU178: Rol sin ámbito, ajustes tras la prueba en pantalla (frontend)

Fecha: 2026-11-19. Rama local: `feat/HU074-HU178-asignatura-estado-ambito` (sin commit, junto con HU074).
Windows 10, Chrome Headless 157. Antes de las pruebas y el build se verificó que no hubiera Maven ni gate de BD
corriendo (solo el backend de 8080 y `ng serve` de 4200, que no se detuvieron).

## Prueba en pantalla (John, 2026-11-19, antes de los ajustes)

Decano sin facultad y coordinador sin programa de prueba, creados con autorización de John.

- Decano: aviso en Mi facultad, Seguimiento y Directorio; barra «Sin facultad asignada»; Períodos muestra el calendario
  institucional; panel con aviso.
- Coordinador: aviso en Asistencia, Solicitudes de sesión, Programa, Planes de estudio y Estudiantes; barra «Sin programa
  asignado»; panel con aviso.
- Hallazgos: (1) el encabezado del panel seguía ofreciendo acciones que llevan al aviso; (2) Revisiones de cancelación
  mostraba una lista vacía «de tu facultad» en lugar del aviso. Ambos se corrigieron (ver `PLAN.md`).

## Gates (ejecutados uno a la vez)

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.spec.json` | exit 0 |
| `npm run lint` | exit 0, sin hallazgos |
| `npm run lint:tokens` | OK: tokens y a11y (controles con nombre accesible, `th` con `scope`) |
| `npm run check:mensajes-ui` | OK (144 códigos en el catálogo, ningún toast con texto literal) |
| `npm run check:mensajes-ui-catalogo` | `MENSAJES_UI_CATALOGO_PASS textos=144 remotos=144` |
| `npm run check:hu-en-ui` | OK (sin códigos de HU en la interfaz) |
| `npm run check:matriz-hu` | FAIL (conteos desactualizados por las pruebas nuevas) → `npm run sync:matriz-hu` → `MATRIZ_HU_PRUEBAS_PASS hu=74 archivos=98/303`. HU178: 12 archivos, 299 pruebas contadas por el script (antes 294) |
| `npm run check:openapi-contract` | `OPENAPI_CONTRACT_PASS sha256=c2e6d28f4842 llamadas=3 dtos=10`, con los dos avisos ya existentes de `cancelacion.tipo` (`COORDINADOR`), ajenos a HU178 |
| `npm run check:retiro-solicitudes` / `check:registro-individual` | OK / OK |
| `ng test --watch=false --browsers=ChromeHeadless` con 8 specs (abajo) | `TOTAL: 304 SUCCESS`, exit 0 |
| `npm run build -- --configuration=production` | exit 0 (~62 s). Avisos ya existentes: bundle inicial 509.92 kB sobre el presupuesto de 500 kB (+9.92 kB; con solo HU074 era 509.90 kB) y NG8113 en `ProfileComponent` y `AdminEmailManagementComponent` |

Specs: `app.routes.spec.ts`, `overview.component.spec.ts` (HU178) y `coordinator-management.service.spec.ts`,
`study-plan-mesh.component.spec.ts`, `study-plan-mesh-page.component.spec.ts`, `dean-plan-malla.component.spec.ts`,
`mock-backend.interceptor.spec.ts`, `coordinator-groups.component.spec.ts` (HU074, ya en la rama).

## Pendiente

- Repetir en pantalla los dos ajustes con los usuarios de prueba (ver `TEST_PLAN.md`, «Prueba manual»).
- `npm run test:ci` completo y `npm run coverage:realtime:check` (no se pidieron en esta ronda).

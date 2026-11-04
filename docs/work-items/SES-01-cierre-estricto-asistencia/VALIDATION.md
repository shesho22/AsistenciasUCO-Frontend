# VALIDATION — SES-01 (Frontend)

Fecha: 2026-11-03. Rama `fix/ses01-cierre-estricto-asistencia`. Commits: `e3fd4f0` (RED), `47c0dd7` (fix).

## Pruebas

| Comando | Resultado |
|---|---|
| `npx ng test --watch=false --browsers=ChromeHeadlessCI` (antes de ajustar fixtures) | 1488 ejecutadas, **10 FAILED**: 9 specs existentes con sesiones sin instantes v2 (quedan `INDETERMINADA` → bloqueadas por la regla nueva) y 1 spec SES-01 con un sobre de error incompleto (corregido al formato real `ApiErrorResponse`) |
| `npx ng test --watch=false --browsers=ChromeHeadlessCI` (final) | **1488/1488 SUCCESS**, exit 0 |
| `npx tsc -p tsconfig.app.json --noEmit` / `tsconfig.spec.json` | OK |

Matriz cubierta (`session-attendance-window.util.spec.ts`, `attendance-control.ses01.spec.ts`):

| Caso | Resultado esperado | Estado |
|---|---|---|
| 07:59:59 Bogotá | `NO_INICIADA`, controles y guardado bloqueados | PASS |
| 08:00:00 | `ABIERTA` | PASS |
| 09:59:59.999 | `ABIERTA` | PASS |
| 10:00:00 | `CERRADA`, mensaje de cierre visible | PASS |
| 12:00 | `CERRADA` | PASS |
| Offset Berlín para el mismo instante | Misma decisión | PASS |
| `INDETERMINADA` / sin instantes / instantes inválidos | Nunca habilita | PASS |
| Cambio de sesión | Recalcula | PASS |
| Página abierta tras el cierre | Bloquea y descarta cambios no guardados | PASS |
| 409 `ERR_SESION_CERRADA` del backend | Error, nunca éxito; recarga lo persistido | PASS |
| Sesión activa | Cambio individual, masivo y guardado habilitados | PASS |

## Navegador integrado

**NOT_RUN** al cierre de este registro: requiere backend local en 8080 con la rama SES-01 y que el usuario inicie
sesión manualmente como DOCENTE. Sin una sesión activa segura no se escriben asistencias reales (solo lectura).

## CI

Pendiente de publicar la rama y abrir el PR (el CI corre en el PR).

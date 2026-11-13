# VALIDATION — VAL-oleada3-mensajes (frontend)

Fecha: 2026-11-13.

| Prueba | Resultado |
| :--- | :--- |
| Barrido de toasts antes | 101 llamadas con texto: 52 con texto literal como argumento y 49 con respaldo literal (`|| '...'`, `getBackendUserMessage(err, '...')`); más `AUTH_MESSAGES_FALLBACK` y `CODE_MESSAGES` |
| Barrido después (`npm run check:mensajes-ui`) | OK: 116 códigos en el catálogo, ningún toast con texto literal |
| La compuerta detecta regresiones | Con un `toast.error('texto quemado')` y un `mensajeUi('NO_EXISTE')` de prueba falla con los dos hallazgos (se revirtió) |
| `tsc -p tsconfig.app.json` y `tsconfig.spec.json` | 0 errores |
| ESLint sobre los archivos tocados | 0 errores (26 advertencias previas) |
| `npm run verify` | OK: lint:tokens, 2749 de 2749 pruebas (incluye `mensajes-ui.spec.ts`), cobertura realtime 95.26% / 86.81%, checks de fuente (incluido `check:mensajes-ui`) y build de producción |

## Merge de `develop` tras el PR #91 (2026-11-13)

Se unió `origin/develop` (con `feat/mejoras-revision-manual`, PR #91) por merge, sin rebase. Conflictos en 3 archivos (5 bloques):

- `admin-periodos.component.ts`: se conserva `this.tab()?.cerrarFormulario()` de #91 y el toast con `mensajeUi('UI_ADMIN_PERIODOS_001')`.
- `dean-coordinadores.component.ts`: queda la validación por modo de programa de #91 (`errorPrograma()`); el toast de precarga usa `UI_DEAN_COORDINADORES_007` con el texto nuevo de #91 ("Defina el programa y guarde.") y sin forzar `SIN_PROGRAMA`.
- `teacher-grupos.component.ts`: #91 retiró la creación de grupo del docente y cambió la sesión manual a solicitud pendiente (DEC-065); se toma la versión de #91.

Textos nuevos de #91 llevados al catálogo: `UI_ADMIN_PERIODOS_003`, `UI_DEAN_COORDINADORES_008..011`, `UI_ADMIN_DECANOS_012..015`, `UI_COORDINATOR_SOLICITUDES_SESION_001..002`, `UI_TEACHER_GRUPO_DECISIONES_001` y `UI_SESION_SOLICITUD_*` (los avisos de `sesion-manual.util.ts`). Se quitaron los códigos que #91 dejó sin uso (`UI_DEAN_COORDINADORES_003`, `UI_TEACHER_GRUPOS_002..004` y `_010`). Los textos no cambian, así que las pruebas de #91 siguen igual.

| Prueba | Resultado |
| :--- | :--- |
| `npm run check:mensajes-ui` | OK: 130 códigos en el catálogo, ningún toast con texto literal |
| `npm run lint` | 0 errores (425 advertencias previas) |
| `npm run verify` | OK: 2919 de 2919 pruebas; cobertura 93.75% statements, 80.77% branches, 94.73% lines; realtime 95.26% / 86.81%; checks de fuente y build de producción |

# PLAN — VAL-oleada3-mensajes (frontend)

Origen: `informes/LISTA_CHEQUEO_VALIDACION_2026-11-12.md`, ítem MSG-06 ("el frontend no tiene textos quemados": toasts con texto
literal y `AUTH_MESSAGES_FALLBACK`). Rama local `fix/VAL-oleada3-mensajes-catalogo` desde `origin/develop`
(`public/assets/env.js` sigue modificado solo en local y no se sube).

## Mecanismo

El frontend ya tenía dos piezas: los errores del backend llegan con el texto resuelto por el catálogo de mensajes
(`ApiErrorResponse.message`, que `getApiErrorMessage` muestra tal cual) y los textos locales eran mapas por código
(`AUTH_MESSAGES_FALLBACK`, `CODE_MESSAGES`). Se unifican los textos locales en un solo catálogo:

- `src/app/core/messages/mensajes-ui.ts`: `MENSAJES_UI` (116 códigos: 9 `AUTH_*`, 11 `API_ERROR_*`, 96 `UI_*`),
  `mensajeUi(codigo, parametros)` con marcadores `{nombre}` y `esCodigoMensajeUi`. El tipo `CodigoMensajeUi` hace que un código
  inexistente no compile.
- `auth.service.ts`: `AUTH_MESSAGES_FALLBACK` se retira; `resolveAuthMessage` lee los `AUTH_*` del catálogo.
- `api-error.util.ts`: `CODE_MESSAGES`, `DEFAULT_ERROR_MESSAGE` y "Error en datos del formulario" salen del catálogo. La lógica
  por código no cambia (el backend sigue siendo quien traduce sus errores).
- Toasts: 108 textos en 28 archivos (52 toasts con texto literal y 56 respaldos dentro de toasts, por ejemplo
  `res.mensajeUsuario || '...'` o `getBackendUserMessage(err, '...')`) pasan a `mensajeUi('UI_...')`. El mensaje que ya llega
  del backend (`mensajeUsuario`, `mensaje`) se sigue mostrando primero; el catálogo es el respaldo. Los textos son los mismos.
- Compuerta: `scripts/check-mensajes-ui.mjs` (`npm run check:mensajes-ui`, dentro de `npm run verify` y como paso del CI)
  falla si un toast lleva texto literal fuera de `mensajeUi(...)` o si se usa un código que no está en el catálogo.
- Prueba: `src/app/core/messages/mensajes-ui.spec.ts`.

## Fuera de alcance (se documenta)

- Textos de las plantillas HTML y constantes de aviso reutilizadas en plantillas (por ejemplo `AVISO_SESION_MANUAL_NOTIFICADA`,
  `avisoSinGrupo`): no son toasts; el ítem MSG-06 se refiere a los toasts y a `AUTH_MESSAGES_FALLBACK`.
- Los códigos de error del backend: no cambian (el backend conserva `VALIDATION_ERROR`, `FORBIDDEN`, etc.; ver el work item
  del backend), así que la clasificación del frontend (`classifyLoadError`, interceptor 403) sigue igual.

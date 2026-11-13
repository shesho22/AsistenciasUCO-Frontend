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

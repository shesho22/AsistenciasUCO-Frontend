---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-14
---

# VALIDATION — VAL-oleada5-frontend-pendientes (frontend)

Validación local en Windows 11 con Node 22.23.4 y Chrome Headless 157 (2026-11-14), sobre `develop` 72e7efc más los
commits de esta rama.

## Evidencia por ítem

| Ítem | Cambio | Evidencia |
|---|---|---|
| MSG-06 | `mensajeUi()` usa el texto del catálogo cuando ya llegó y el de `mensajes-ui.ts` como respaldo. `CatalogoMensajesUiService` pide cada texto con `createMessageClient` (minifront-mensajes 0.4.0, carga diferida) por `GET /messageucolab/v1/public/messages/MSG_UI###`, una vez por código. Una signal de versión actualiza plantillas y `computed` al llegar el texto. Sin `MESSAGEUCOLAB_APPLICATION_ID` / `MESSAGEUCOLAB_ENVIRONMENT_ID` no se descarga nada. | `catalogo-mensajes-ui.service.spec.ts` (17 casos: sin configuración, código remoto, marcadores, `computed` reactivo, un pedido por código, respaldo del cliente, descarga fallida, texto vacío, `onError`, fábrica real e inicializador diferido). |
| MSG-03 (frontend) | `scripts/sync-mensajes-ui-catalogo.mjs`: código remoto estable `UI001`…`UI135` (`mensajes-ui-codigos-remotos.ts`), archivo de importación `docs/messages/mensajes-ui-messageucolab.psv` y compuerta con los límites de MessageUcoLab (código de 1 a 10 caracteres, título de 10 a 50 y contenido de 10 a 100). Cuatro textos de más de 100 caracteres se acortaron sin cambiar su sentido. | `MENSAJES_UI_CATALOGO_PASS textos=135 remotos=135`. Excel de importación generado con `write_xlsx` de `AsistenciasUCO-Infra/components/messages/build-message-catalog.py` y la plantilla oficial: 135 filas. |
| F12-06 / REA-04 (frontend) | La proyección del QR pide un código vigente por HTTP al volver el SSE y cuando el vigía CSS (rotación + 5 s) termina sin `ASISTENCIA_QR_ROTADO`; una vez por ciclo, sin temporizadores de JavaScript. | `toma-qr-proyeccion.component.spec.ts` (7 casos nuevos y el de pérdida de conexión ajustado al comportamiento nuevo) y `qr-proyeccion.component.spec.ts` (3 casos del vigía). |
| EST-11 | 0 `any` en el código de la aplicación (DTO tipados) y en el backend simulado; `no-explicit-any` en `error` fuera de los specs. Specs: 265 → 123. | `npm run lint`: 0 errores, 123 avisos (todos `no-explicit-any` en `*.spec.ts`). |
| PRU-09 (frontend) | `scripts/matriz-hu-pruebas.mjs` genera `docs/testing/MATRIZ_HU_PRUEBAS_FRONTEND.md` y falla si queda desactualizada. | `MATRIZ_HU_PRUEBAS_PASS hu=73 archivos=85/279`. |

## Corrida final (2026-11-14)

| Compuerta | Resultado |
|---|---|
| `npm run verify` | exit 0: 3.019 pruebas en verde; cobertura 94,16 % sentencias, 81,74 % ramas, 94,38 % funciones, 95,13 % líneas; realtime 95,26 % líneas y 86,81 % ramas; compuertas de fuente, catálogo de mensajes, contrato OpenAPI y build. |
| Bundle inicial | La primera corrida dio 504,89 kB (el servicio del catálogo entraba al arranque). Con el inicializador diferido queda en 499,74 kB. |
| Pruebas nuevas tras esa corrida | `catalogo-mensajes-ui` (17 casos, incluido el inicializador diferido): en verde. |
| E2E | Playwright 1.64.1 con el Chrome del sistema sobre el build de producción: 21 passed. |

## Prueba en vivo contra MessageUcoLab (2026-11-14)

Laboratorio local: MessageUcoLab detrás de Kong (`localhost:8000`), aplicación "Asistencias UCO" `c05f384e…`, ambiente
Develop `9732b9aa…`; backend en modo baseline y SPA en `ng serve`.

| Paso | Resultado |
|---|---|
| Importación del Excel (validar y confirmar por la API de importación, usuario administrador del laboratorio) | 135 filas, 0 con error; `confirm` 200 con `count: 135`. |
| Ruta pública `GET /v1/public/messages/MSG_UI001…MSG_UI135` | 135/135 en 200 (en lotes por el límite de 120 por minuto). |
| SPA: nombre de facultad corto en "Registrar Nuevo Decano" | Pide `MSG_UI033` (UI_ADMIN_DECANOS_012) → 200 y muestra el texto. |
| SPA: 403 de una consulta al cargar la pantalla | Pide `MSG_UI092` y `MSG_UI091` (textos de error del interceptor) → 200; un pedido por código y carga. |

Hallazgos que se corrigieron en esta rama:

- Once llamadas a `mensajeUi()` se evaluaban al importar el módulo (`api-error.util.ts`: los diez textos `API_ERROR_*`;
  `sesion-manual.util.ts`: el aviso de solicitud registrada). Corrían antes de iniciar el catálogo y nunca tomaban el
  texto de MessageUcoLab. Ahora se leen al usarse. Dos campos de componente (`horarioMensaje`, `inpMensaje`) pasaron a
  `computed` para actualizarse cuando llega el texto. Caso nuevo en `catalogo-mensajes-ui.service.spec.ts`.
- En el laboratorio, `ng serve` publica `src/assets/env.js` (ignorado por git) por encima de `public/assets/env.js`: los
  dos UUID van en ese archivo.
- La plantilla `plantilla-mensajes.xlsx` traía 9 filas de ejemplo (SIG014–015, VCE001–007) que `write_xlsx` conserva; el
  Excel de la interfaz se generó desde una copia de la plantilla con solo los encabezados, para no pisar esos mensajes.

## Limitaciones

- Los textos importados son los mismos de `mensajes-ui.ts`; para ver un cambio hay que editar un texto en la
  administración de Mensajes y recargar la SPA (el cliente lo guarda en caché por sesión).
- El bus distribuido del SSE sigue siendo del backend; la resincronización evita que el aula quede sin QR mientras tanto.
- CF-04 conserva `style-src 'unsafe-inline'` (ver PLAN.md).

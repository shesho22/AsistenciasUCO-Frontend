---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-14
---

# PLAN — VAL-oleada5-frontend-pendientes (frontend)

Lo que quedaba del frontend en la lista de chequeo de validación tras VAL-oleada4 (PR #109). Rama
`fix/VAL-oleada5-frontend-pendientes`, desde `develop` 72e7efc.

| Ítem | Estado de partida | Qué se hace |
|---|---|---|
| MSG-06 | PARCIAL | Los textos de la interfaz se leen del catálogo de MessageUcoLab con el cliente oficial del minifront (`createMessageClient`, ruta pública por código), con `mensajes-ui.ts` como respaldo. |
| MSG-03 (lado frontend) | PARCIAL | Código remoto estable `UI###` por texto, archivo de importación `docs/messages/mensajes-ui-messageucolab.psv` y compuerta de sincronización. |
| F12-06 / REA-04 (lado frontend) | PARCIAL | La proyección del QR se resincroniza por HTTP al volver el SSE y cuando un vigía CSS detecta que no llegó la rotación (caso de 2 réplicas). |
| EST-11 | mejora | `no-explicit-any` en `error` para el código de la aplicación (DTO tipados); los specs bajan de 265 a 123. |
| PRU-09 (lado frontend) | PARCIAL | Matriz HU → pruebas generada desde los specs, con compuerta. |

## Decisiones

- **Por qué la ruta pública por código y no una ruta del backend:** es la integración que define la Guía de integración de
  MessageUcoLab (pasos 9.5 y 9.8) para los textos que solo existen en la pantalla. Cada texto se pide una sola vez por
  sesión, cuando la interfaz lo usa, y el cliente lo guarda en caché; no se precargan los 135 textos, para no acercarse
  al límite de la ruta pública (120 por minuto por IP).
- **El primer uso de un texto muestra el respaldo local** mientras llega el del catálogo; las plantillas y los `computed`
  se actualizan solos al llegar (signal de versión). Un toast ya mostrado no cambia.
- **CF-04, `style-src 'unsafe-inline'`:** no se quita. Security UI y minifront-mensajes inyectan `<style>` en su shadow DOM
  sin soporte de nonce, y Angular escribe atributos `style` estáticos de las plantillas; con nonce o sin
  `'unsafe-inline'` esas pantallas se romperían. La CSP ya no permite JavaScript en línea (oleada 4). Se deja como
  dependencia de esos equipos.

## Pasos manuales (fuera del código)

1. Importar `mensajes-ui-messageucolab.xlsx` (generado desde el `.psv` con la plantilla oficial) en la aplicación
   "Asistencias UCO" de MessageUcoLab, ambiente Develop, desde la administración de mensajes.
2. Poner `MESSAGEUCOLAB_APPLICATION_ID` y `MESSAGEUCOLAB_ENVIRONMENT_ID` (los mismos del backend) en el `.env` del
   frontend (contenedor) o, con `ng serve`, en `src/assets/env.js` (ignorado por git; tiene prioridad sobre
   `public/assets/env.js`).

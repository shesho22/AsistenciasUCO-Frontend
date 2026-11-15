---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-15
---

# PLAN — VAL-oleada6-frontend-cierre (frontend)

Lo que quedaba a cargo del frontend en la lista de chequeo de validación tras VAL-oleada5 (PR #110). Rama
`fix/VAL-oleada6-frontend-cierre`, desde `develop` 59a235a.

| Ítem | Estado de partida | Qué se hace |
|---|---|---|
| EST-11 | 0 `any` en la aplicación; 123 avisos de `no-explicit-any` en 19 specs | Tipar las capturas de las pruebas con los tipos reales de los servicios y del backend simulado, sin cambiar aserciones, y dejar `no-explicit-any` en `error` en todo `src` (sin reglas en `warn`). |
| ROL-12 | Pendiente de repetir en el laboratorio | Correr el E2E real de los 5 roles (`e2e_baseline.py`: PKCE, Bearer, Spring, PEP/PDP, SQL) contra el laboratorio con la migración 40 aplicada. |

## Decisiones

- **Tipos de las capturas:** cada variable que guarda una respuesta usa el tipo que emite el método del servicio
  (`ObservedValueOf<ReturnType<typeof service.metodo>>`), así el compilador revisa los campos que lee la prueba. En el
  backend simulado se describen los sobres (`exitoso`, `datos`, `elementos`) y solo los campos que se comprueban.
- **Asignación definida (`let x!: T`)** donde `HttpTestingController` entrega la respuesta de forma síncrona antes de la
  aserción; `?.` donde la prueba ya contemplaba un valor ausente. Ninguna aserción se relajó: si falta el valor, la
  aserción sigue fallando.
- **ROL-12, comprobación 18:** la ruta `DELETE /api/v1/coordinador/grupos/{id}/estudiantes/{id}` se retiró por contrato
  (CULM-001 A.1, `HTTP_AS_IS_MATRIX.md` del backend: responde 404). El script del backend todavía espera que pase por el
  PEP; corregirlo es del repositorio del backend.

## Fuera del frontend (sin cambio)

- CF-04 `style-src 'unsafe-inline'`: depende de Security UI y minifront-mensajes (estilos sin nonce).
- Bus distribuido del SSE y contadores compartidos (F12-06 / REA-04, backend).

---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-15
---

# VALIDATION — VAL-oleada6-frontend-cierre (frontend)

Validación local en Windows 11 con Node 22.23.4 y Chrome Headless 157 (2026-11-15), sobre `develop` 59a235a más los
commits de esta rama.

## Evidencia por ítem

| Ítem | Cambio | Evidencia |
|---|---|---|
| EST-11 | Los 123 `any` de 19 specs pasan a tipos reales: el tipo que emite cada método de servicio, los sobres del backend simulado (`Sobre`, `SobreDatos<T>`, `SobrePagina<T>`) y los modelos de la aplicación (`SolicitudRevisionItem`, `MatriculaEstudianteSolicitud`, `UserPickerItem`). Sin aserciones relajadas. `no-explicit-any` queda en `error` en todo `src` y no quedan reglas en `warn`. | `npm run lint`: 0 errores y 0 avisos (antes: 0 errores y 123 avisos). `tsc -p tsconfig.spec.json`: 0 errores. |
| ROL-12 | E2E real de los 5 roles contra el laboratorio (`e2e_baseline.py`: PKCE, Bearer, Spring, PEP/PDP, SQL), con la migración 40 aplicada (la BD del laboratorio va en la 44). | 17/18 PASS: 401 sin credencial o con credencial falsa, ALLOW del PEP para los 5 roles en su ruta, 403 cruzados (docente a estudiante, estudiante a administración) y métodos con efectos que atraviesan Spring y el PEP. La 18 (`COORDINADOR DELETE /coordinador/grupos/<uuid>/estudiantes/<uuid>`) responde 404 porque la ruta se retiró por contrato (CULM-001 A.1, `HTTP_AS_IS_MATRIX.md` del backend); el script del backend debe actualizarse. |

El E2E se corrió con la clave común de prueba de los usuarios `uco-*` (la que documenta `AGENTS.md`), sin modificar
`lab.env`: desde el 2026-11-06 esos usuarios ya no usan las claves generadas en ese archivo.

## Corrida final (2026-11-15)

| Compuerta | Resultado |
|---|---|
| `npm run verify` | exit 0: 3.022 pruebas en verde; cobertura 94,17 % sentencias, 81,78 % ramas, 94,42 % funciones, 95,14 % líneas; realtime 95,26 % líneas y 86,81 % ramas; compuertas de fuente, catálogo de mensajes (135/135), matriz HU (73 HU), contrato OpenAPI y build. |
| Bundle inicial | 499,68 kB. |

## Limitaciones

- La comprobación 18 de `e2e_baseline.py` está desactualizada en el repositorio del backend.
- CF-04 (`style-src 'unsafe-inline'`) y el bus distribuido del SSE siguen fuera del frontend (ver PLAN.md).

# PLAN — VAL-oleada2-cumplimiento (frontend)

Origen: `informes/LISTA_CHEQUEO_VALIDACION_2026-11-12.md`. Rama local `fix/VAL-oleada2-cumplimiento`.

## Agente B: PAR-05 y PAR-06 (valores quemados)

| Ítem | Antes | Cambio |
|---|---|---|
| PAR-05 | `soporte-file.validator.ts` validaba con 5 MB fijo aunque `GET /api/v1/configuracion/reclamos` ya publicaba `tamanioMaximoBytes` (parámetro `ARCHIVO/TAMANIO_MAXIMO_BYTES`). | `validateSoporteFile(file, maxBytes)` usa el límite de la configuración; el mensaje dice el tamaño real (`describirTamano`). `student-courses` le pasa `configuracionReclamos().tamanioMaximoBytes`. El formulario del reclamo muestra el límite sin redondear. `SOPORTE_MAX_BYTES` y `DEFAULT_CONFIGURACION_RECLAMOS` (5242880) quedan solo como respaldo cuando la configuración no llegó; un valor por encima del techo del servidor (5 MiB) se ignora. |
| PAR-06 | `consolidado-asistencia.component.ts` coloreaba la inasistencia con `>= 15` fijo y el semáforo usaba sus valores por defecto. | El consolidado lee `umbralAdvertencia` y `umbralPerdida` de los KPI del rol (`/coordinador/indicadores` o `/decano/indicadores`, parámetros `ASISTENCIA/UMBRAL_ALERTA_ADVERTENCIA` y `UMBRAL_ALERTA_PERDIDA`) y los pasa al semáforo. 15/20 (`UMBRAL_*_RESPALDO`) solo aplican si los KPI no responden. |
| PAR-06 | `group-sessions-overview.component.ts:74` | Solo era un comentario (">20%"); el conteo ya usaba `codigoPermanencia` del backend. Se corrige el comentario. |

Opción elegida para PAR-05: **endpoint de configuración** (ya existía y ya se cargaba), en vez de devolver el límite en
el error del backend.

## Cadena de suministro y CI (agente T)

TRI-03, TRI-06, TRI-07, SEC-05, SEC-08, EST-04, EST-07, EST-08, EST-09, EST-10 y EST-11: plan, cambios y triage en [CI-CADENA-SUMINISTRO.md](CI-CADENA-SUMINISTRO.md).

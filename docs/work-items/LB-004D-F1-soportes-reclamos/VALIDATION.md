---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-10-19
---

# LB-004D — F1: soportes de reclamos (estudiante y docente)

```text
BACKEND_CONTRACT: PR backend jose-valencia/lb-004d-b1-support-binding (alejovh12/AsistenciasUCO)
DB_CONTRACT: ONE_TABLE, pendiente de aprobación del owner DB (no se fusiona antes)
MERGE: NO
```

## Cambios

| Área | Cambio |
|---|---|
| Validación previa | `core/files/soporte-file.validator.ts`: PDF/PNG/JPEG, 1 byte–5 MiB, nombre ≤ 250 caracteres, content-type coherente con la extensión. El backend sigue siendo la autoridad (magic bytes, ClamAV). El texto anunciado pasa de 10 MB a **5 MB**. |
| Subida (estudiante) | `StudentCoursesComponent`: valida antes de enviar, estado de subida (`subiendoSoporte`), una sola subida a la vez, cancelación real (desuscripción aborta la petición), `input.value = ''` para reelegir el mismo archivo, mensajes distintos por 401 / 400‑413 / red / servicio caído. |
| Radicación | `AttendanceClaimService.crearReclamo` envía **solo** `soporteArchivoId` (el `fileId` opaco); nunca `soporteNombre` ni `soporteUrl`. Sin doble envío (`enviandoReclamo`) ni radicación mientras sube el soporte. Un 404 al radicar con soporte descarta el adjunto y pide volver a adjuntarlo. Radicar sin soporte sigue funcionando. |
| Reclamos del docente | `getReclamosDocente` adapta `ApiListResponse<ReclamoDocenteApi>` al modelo de UI (`ClaimMapper.fromReclamoDocente`). Sin correo del estudiante (datos mínimos). `estadoOriginal` pasa a opcional (el backend no lo informa). |
| Descarga (docente) | Ya era `HttpClient` + `Blob` con Bearer por interceptor (sin `window.open`, sin token en la URL). Se añade guarda de doble clic, nombre de archivo saneado y mensajes claros para 401/404/red. |
| UTC v2 / IANA | El instante UTC se conserva (`fechaSesionUtc`, `fechaSubidaUtc`) y la fecha se presenta con `SessionTimeZoneService` (zona IANA seleccionada, con DST); sin offsets manuales. Una sesión histórica sin procedencia verificable no muestra fecha inventada. |

## Validación (2026-10-19)

| Comprobación | Resultado |
|---|---|
| `npm ci` | PASS |
| Especificaciones de las áreas tocadas (validador, servicio, mapper, estudiante, docente, asistencia, dashboard) | 139 PASS / 8 FAIL |
| `npx ng build --configuration=production` | PASS |
| `npm run test:ci` (suite completa) | **BLOCKED por la base**: `tsc -p tsconfig.spec.json` tiene 34 errores de tipos en 11 archivos `.spec.ts` ajenos a este cambio (comprobado en `origin/develop` `714b082` limpio), por lo que Karma no carga. No se modificaron esos specs. |

Los 8 fallos de las áreas tocadas son de `AttendanceEnrollmentModalComponent` (`NG0950`: input requerido sin valor en el
spec), anteriores a este cambio y ajenos a los soportes.

## No ejecutado

SonarCloud, auditoría de dependencias remota y Trivy corren en el PR. El E2E con navegador (Keycloak + Angular + backend +
SQL + MinIO + ClamAV) se documenta en el reporte E2E del backend.

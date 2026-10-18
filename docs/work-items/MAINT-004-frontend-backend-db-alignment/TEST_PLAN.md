# MAINT-004 — Plan de pruebas

## Unitarias y de integración Angular

- Conversión Bogotá y Berlín en verano/invierno.
- Cambio de zona IANA: el valor UTC original permanece y cambia solo la presentación.
- Preferencia manual, modo automático y redetección tras recarga.
- Medianoche, hora DST inexistente y hora DST ambigua.
- RFC3339 con 0–7 decimales; edición solo de nombre preserva el string original.
- `CONFIRMADA` y `INDETERMINADA` con fechas nulas.
- POST/GET/PATCH v2 en URLs y cuerpos exactos; PUT ausente.
- 400, 401, 403, 404 y 405 propagados por el interceptor de errores.
- Flag v2 apagado: solo v1; no fallback silencioso desde un 404 v2.
- Directorio: page 0-based, size, filtros, página vacía y totales de servidor.
- IDs `idEstudiante`, grupo y sesión en toma de asistencia; estados `AN/SJC/EX`.
- SSE autenticado, reconexión y recarga HTTP.
- Archivo `fileId` y descarga Blob autenticada.
- 501 de reclamos/perfil sin perder sesión ni fabricar datos.
- Cambio mock/real sin interceptor residual.
- `USE_MOCKS=true/false` en runtime, ruta API sin mock controlada y recurso externo no interceptado.
- Directorio: búsquedas rápidas con respuestas invertidas, cancelación, errores, loading sin resultados antiguos y página vacía.
- Matrícula: búsqueda server-side separada del directorio paginado, filtro activo y no carga masiva.
- Reclamos: lista exitosa vacía, 501, 403, error de red, 500 y PATCH void con `exitoso=true` sin `datos`.
- Temporalidad: `08:00–08:00`, `23:30–01:30`, `+05:99`, cambio de zona durante edición y caché de formateadores.

## Integración manual condicionada

Solo se puede ejecutar con el backend real accesible, `APP_SESIONES_V2_ENABLED=true`, DB compatible y usuario DOCENTE de prueba. La sesión SQL existente `sql_server_asistencias` y la base `gestionasistenciadb` son precondiciones; no se crean recursos nuevos ni se escriben credenciales.

## Evidencia esperada

Guardar URL, método, status, `X-Correlation-Id`, payload sin secretos, captura de la UI y resultado de la consulta posterior. Nunca guardar access tokens ni archivos de credenciales.

## Criterio de certificación

La suite solo se considera aprobada con ChromeHeadless conectado y número exacto de specs PASS/FAIL/SKIP. Un bundle generado sin navegador conectado no es PASS.


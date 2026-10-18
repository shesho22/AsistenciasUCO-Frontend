# MAINT-004 — Riesgos y decisiones

| Riesgo | Mitigación / estado |
|---|---|
| Backend v2 apagado o DB incompatible | Flag frontend opt-in; sin fallback v2→v1. Verificar `APP_SESIONES_V2_ENABLED` antes del smoke. |
| DST inexistente o ambiguo | La conversión usa la base IANA de `Intl`; cero candidatos o múltiples candidatos producen error accionable. |
| Zona cambia durante edición | El instante original vive en `fechaHoraInicio/Fin`; cambio de zona solo cambia presentación y el PATCH conserva strings si el horario no cambió. |
| DATETIME2(7) | No se normalizan ni pasan por `Date` los instantes que ya vienen de API; solo se usa precisión de milisegundos para resolver presentación. |
| Histórico v1 sin procedencia | v2 entrega `INDETERMINADA` y fechas null; la UI muestra la sesión y no inventa horario. |
| POST no devuelve ID | El listado se recarga y la UI no elige por nombre/fecha cuando puede haber duplicados. |
| Paginación y alcance institucional | `/estudiantes` se usa solo para el directorio coordinador en roles autorizados; el grupo docente sigue usando `/grupos/{id}/estudiantes`. |
| Interceptor mock residual | `AuthService.isMockMode()` decide por petición; modo real deja pasar y modo mock devuelve 501 controlado para API desconocida. |
| Reclamos GET 501 | No se fabrican mocks en real y se muestra limitación explícita; PATCH individual queda separado. |
| Descarga protegida | Se usa `HttpClient`/Blob con Bearer; no se abre una URL sin autenticación. |
| Calidad CI | Builds development/production pasan; Karma no conecta ChromeHeadless en el host actual y no permite certificar tests/cobertura. |
| Horas iguales | Validación explícita rechaza `08:00–08:00`; no se interpreta como 24 horas. |
| RFC3339 malformado | Se rechazan offsets como `+05:99` y valores fuera de ±14:00. |
| Selector de matrícula | Consulta server-side por nombre/documento con tamaño limitado; no declara disponibilidad global si el resultado no fue consultado. |
| Dependencias | 59 alertas siguen abiertas; arreglos automáticos requieren Angular mayor y no se aplican sin análisis de compatibilidad. |


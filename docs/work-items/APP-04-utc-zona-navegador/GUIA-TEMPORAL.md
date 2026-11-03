# Guía temporal del frontend (APP-04)

Regla corta para cualquier pantalla nueva que muestre fechas u horas.

1. **Clasifica el campo según su contrato**, no por su nombre:
   - Instante real (`...Z` o `±hh:mm`): inicio/fin de sesión v2, `*Utc`, radicación, carga de soporte, auditoría.
   - `LocalDateTime` sin zona (contratos v1): se muestra literal; nunca se le agrega `Z` ni se le resta un offset.
   - Fecha civil `yyyy-MM-dd`: nunca se convierte como medianoche UTC.
2. **Presenta siempre con `SessionTimeZoneService`** (inyectado como `timeZone` en el componente):
   - `timeZone.formatTemporal(valor)` → `dd/MM/yyyy HH:mm`; `'date'`/`'time'` para una parte.
   - `timeZone.formatTemporalRange(inicio, fin)` → muestra la fecha del fin si cruza medianoche.
   - `timeZone.hasUnzonedValue([...])` → decide si la pantalla debe decir «sin zona horaria confirmada».
   - `timeZone.zoneLabel()` → zona efectiva visible (`America/Bogota (UTC-05:00, automática del navegador)`).
   - Fecha civil: `formatCivilDate(valor)` de `core/time/session-timezone.util.ts`.
3. **No uses** el pipe `date`, `new Date(texto)`, `toLocale*String`, `getTimezoneOffset` ni sumas de horas sobre
   instantes o `LocalDateTime`: dependen de la zona del sistema e ignoran la preferencia de la aplicación.
4. **Sesiones**: usa `resolveSessionInstant(v1, utc, estadoTemporal)`; el instante solo cuenta si
   `estadoTemporal = CONFIRMADA`. Un histórico INDETERMINADO no se reinterpreta.
5. **Escritura**: convierte la entrada local con `timeZone.toInstants(...)` (rechaza horas inexistentes/ambiguas por
   DST) y envía el instante; si el usuario no cambió el horario, reenvía el instante original (conserva 7 decimales).
6. **Nunca** persistas horas convertidas ni instantes en `localStorage`; solo se guarda la preferencia de zona.
7. La zona por defecto es la del navegador (sin GPS, IP ni idioma); se recalcula al recargar y al volver a la pestaña.

# fix(APP-04): instantes de sesión en la zona horaria del navegador

## Problema

La misma sesión `2026-08-17T13:00:00Z` se veía 08:00 para el docente (v2 UTC) y 13:00 para el coordinador: HU060
entrega `LocalDateTime` sin zona y `coordinator-attendance` lo pintaba con el pipe `date` (+5 h).

## Cambios

- `SessionTimeZoneService` / `session-timezone.util.ts` (sin sistema paralelo): `presentTemporal`, `formatTemporal`,
  `formatTemporalRange` (fecha del fin si cruza medianoche), `zoneLabel`, `zoneSource` (navegador / respaldo UTC /
  manual), recálculo automático al volver a la pestaña; `formatCivilDate`, `resolveSessionInstant`.
- Instante → zona efectiva; `LocalDateTime` v1 → literal + aviso «sin zona horaria confirmada»; fecha civil sin
  desplazamiento. Sesiones: el instante solo cuenta si `estadoTemporal = CONFIRMADA`.
- Coordinador (HU060 + bitácora) y decano (HU145) dejan de usar el pipe `date` sobre horas.
- Consume de forma opcional `fechaHoraInicioUtc`/`fechaHoraFinUtc`/`estadoTemporal` del backend
  `fix/app04-utc-coordinador-sesiones` (alejovh12/AsistenciasUCO).

## Evidencia

- RED → GREEN focalizado 50/50; `test:ci` 1437/1437 (Lines 92.35 %); realtime 95.06 %; build producción OK.
- Navegador integrado, DOCENTE: Bogotá 08:00, Londres 14:00 (BST) / 13:00 (GMT), Berlín 15:00 (CEST) / 14:00 (CET);
  identidad e instantes de la respuesta v2 sin cambios. Detalle y límites en `VALIDATION.md`.
- Guía para nuevas pantallas: `GUIA-TEMPORAL.md`.

## Fuera de alcance

Decano/estudiante con procedencia (requiere backend), HU061, reportes Excel. Sin cambios de DB ni datos.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

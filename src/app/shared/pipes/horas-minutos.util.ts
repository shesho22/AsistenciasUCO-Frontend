/**
 * Formatea una cantidad de horas decimales como horas y minutos para el usuario (`3.48` → `3 h 29 min`), porque el
 * decimal se confunde con minutos. Redondea al minuto más cercano.
 *
 * - `0` → `0 min`; menos de una hora → `45 min`; horas exactas → `2 h`; mixto → `3 h 29 min`.
 * - `null`, `undefined`, `NaN` y negativos (no deberían llegar del backend) → `—`.
 *
 * Solo es presentación: las exportaciones conservan el número decimal crudo.
 */
export function formatearHorasMinutos(horas: number | null | undefined): string {
  if (typeof horas !== 'number' || !Number.isFinite(horas) || horas < 0) {
    return '—';
  }
  const totalMinutos = Math.round(horas * 60);
  const h = Math.floor(totalMinutos / 60);
  const min = totalMinutos % 60;
  if (h === 0) {
    return `${min} min`;
  }
  return min === 0 ? `${h} h` : `${h} h ${min} min`;
}

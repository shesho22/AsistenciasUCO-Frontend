/**
 * Formato unico de fechas y horas (CULM-001 transversal): zona local del navegador,
 * sin segundos ni "UTC" visibles. El instante original se conserva para `title`.
 */
const SIN_DATO = '—';
const SOLO_HORA = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ValorTemporal = string | Date | number | null | undefined;

/** Convierte a Date. Las fechas sin hora (`2026-11-12`) se interpretan como dia local, sin desfase por UTC. */
export function aFecha(valor: ValorTemporal): Date | null {
  if (valor === null || valor === undefined || valor === '') return null;
  let fecha: Date;
  if (typeof valor === 'string') {
    const dia = SOLO_FECHA.exec(valor);
    fecha = dia ? new Date(Number(dia[1]), Number(dia[2]) - 1, Number(dia[3])) : new Date(valor);
  } else {
    fecha = new Date(valor);
  }
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function limpiar(texto: string): string {
  return texto.replace(/ de /g, ' ').replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}

export function formatearFechaCorta(valor: ValorTemporal, timeZone?: string): string {
  const fecha = aFecha(valor);
  if (!fecha) return SIN_DATO;
  return limpiar(new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(fecha));
}

export function formatearHoraCorta(valor: ValorTemporal, timeZone?: string): string {
  if (typeof valor === 'string') {
    const soloHora = SOLO_HORA.exec(valor);
    if (soloHora) return `${soloHora[1]}:${soloHora[2]}`;
  }
  const fecha = aFecha(valor);
  if (!fecha) return SIN_DATO;
  return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(fecha);
}

export function formatearRangoHorario(inicio: ValorTemporal, fin: ValorTemporal, timeZone?: string): string {
  if (aFecha(inicio) === null && !(typeof inicio === 'string' && SOLO_HORA.test(inicio))) return SIN_DATO;
  const a = formatearHoraCorta(inicio, timeZone);
  const b = formatearHoraCorta(fin, timeZone);
  return b === SIN_DATO ? a : `${a}–${b}`;
}

export function formatearFechaHoraCorta(valor: ValorTemporal, timeZone?: string): string {
  if (aFecha(valor) === null) return SIN_DATO;
  return `${formatearFechaCorta(valor, timeZone)}, ${formatearHoraCorta(valor, timeZone)}`;
}

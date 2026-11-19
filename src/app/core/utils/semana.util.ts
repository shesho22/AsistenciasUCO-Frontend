/**
 * ATA D7: aritmética de fechas civiles `YYYY-MM-DD` para el horario semanal. Se calcula siempre en UTC sobre la fecha
 * civil (sin hora), de modo que el huso del navegador y el horario de verano no corren los días.
 */

const MS_DIA = 24 * 60 * 60 * 1000;

function aFecha(civil: string): Date {
  const [anio, mes, dia] = civil.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function aCivil(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Suma (o resta) días a una fecha civil. */
export function sumarDias(civil: string, dias: number): string {
  return aCivil(new Date(aFecha(civil).getTime() + dias * MS_DIA));
}

/** Lunes de la semana (lunes a domingo) que contiene la fecha civil. */
export function lunesDeSemana(civil: string): string {
  const diaSemana = aFecha(civil).getUTCDay(); // 0 = domingo
  return sumarDias(civil, -((diaSemana + 6) % 7));
}

/** Los siete días civiles de la semana que empieza en `lunes`. */
export function diasDeSemana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/** `lunes 17 nov`: nombre del día y fecha, siempre en español. */
export function etiquetaDia(civil: string): string {
  return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(aFecha(civil))
    .replace(/\./g, '');
}

/** `17 nov – 23 nov 2026`: rango de la semana para el encabezado de navegación. */
export function etiquetaSemana(lunes: string): string {
  const formato = (civil: string, conAnio: boolean): string =>
    new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      ...(conAnio ? { year: 'numeric' as const } : {}),
      timeZone: 'UTC',
    })
      .format(aFecha(civil))
      .replace(/\./g, '');
  return `${formato(lunes, false)} – ${formato(sumarDias(lunes, 6), true)}`;
}

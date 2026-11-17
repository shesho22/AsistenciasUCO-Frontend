/**
 * CIERRE-W3I: estado de carga de los indicadores de un tablero. Un indicador que todavia no llego NO es "0" ni "sin periodo":
 * se muestra como "cargando"; si la consulta fallo se muestra "Sin datos"; solo una respuesta recibida pinta una cifra.
 */
export type EstadoIndicadores = 'cargando' | 'listo' | 'error';

export const TEXTO_CARGANDO = 'Cargando…';
export const TEXTO_SIN_DATOS = 'Sin datos';

/** Texto de una cifra de negocio que entrega el servidor; el cliente no la calcula ni le inventa un valor por defecto. */
export function textoCifra(valor: number | null | undefined, estado: EstadoIndicadores, sufijo = ''): string {
  if (estado === 'cargando') return TEXTO_CARGANDO;
  if (estado === 'error' || valor === null || valor === undefined) return TEXTO_SIN_DATOS;
  return `${valor}${sufijo}`;
}

/**
 * Texto del periodo al que corresponden los indicadores. "Sin período vigente" solo se afirma cuando el servidor respondio y
 * no hay periodo; mientras carga o si fallo no se declara nada sobre el periodo (F-DEC-01).
 */
export function textoPeriodo(estado: EstadoIndicadores, nombrePeriodo: string | null | undefined): string {
  if (estado === 'cargando') return TEXTO_CARGANDO;
  if (estado === 'error') return TEXTO_SIN_DATOS;
  return nombrePeriodo ?? 'Sin período vigente';
}

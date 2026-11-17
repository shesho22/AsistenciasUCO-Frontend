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

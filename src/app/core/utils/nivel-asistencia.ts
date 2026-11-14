/**
 * Semaforo unico de asistencia (CULM-001 transversal).
 * Nivel segun % de inasistencia por horas: verde < advertencia, ambar [advertencia, perdida), rojo >= perdida.
 * Los umbrales vienen del backend (umbralAdvertencia/umbralPerdida); 15/20 solo son respaldo cuando una pantalla no los recibe.
 */
export type NivelAsistencia = 'verde' | 'ambar' | 'rojo';

export const UMBRAL_ADVERTENCIA_RESPALDO = 15;
export const UMBRAL_PERDIDA_RESPALDO = 20;

/**
 * VAL PRU-14 (decision 3A de John, 2026-11-13): el umbral se compara DESPUES de redondear a dos decimales, igual que
 * la BD (`ROUND(x, 2)` sobre DECIMAL): 19,995 % cuenta como 20,00 %. Se redondea sobre la notacion decimal (`e2`) y
 * no con `Math.round(x * 100)`, porque 19.995 * 100 = 1999.4999… en binario y daria 19,99.
 */
export function redondearPorcentaje(valor: number): number {
  const redondeado = Number(`${Math.round(Number(`${valor}e2`))}e-2`);
  return Object.is(redondeado, -0) ? 0 : redondeado;
}

export function nivelAsistencia(
  porcentajeInasistencia: number | null | undefined,
  umbralAdvertencia: number | null | undefined = UMBRAL_ADVERTENCIA_RESPALDO,
  umbralPerdida: number | null | undefined = UMBRAL_PERDIDA_RESPALDO,
): NivelAsistencia | null {
  if (porcentajeInasistencia === null || porcentajeInasistencia === undefined || Number.isNaN(porcentajeInasistencia)) {
    return null;
  }
  const adv = umbralAdvertencia ?? UMBRAL_ADVERTENCIA_RESPALDO;
  const per = umbralPerdida ?? UMBRAL_PERDIDA_RESPALDO;
  const porcentaje = redondearPorcentaje(porcentajeInasistencia);
  if (porcentaje >= per) return 'rojo';
  if (porcentaje >= adv) return 'ambar';
  return 'verde';
}

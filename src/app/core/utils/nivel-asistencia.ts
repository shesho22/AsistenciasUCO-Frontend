/**
 * Semaforo unico de asistencia (CULM-001 transversal).
 * Nivel segun % de inasistencia por horas: verde < advertencia, ambar [advertencia, perdida), rojo >= perdida.
 * Los umbrales vienen del backend (umbralAdvertencia/umbralPerdida); 15/20 solo son respaldo cuando una pantalla no los recibe.
 */
export type NivelAsistencia = 'verde' | 'ambar' | 'rojo';

export const UMBRAL_ADVERTENCIA_RESPALDO = 15;
export const UMBRAL_PERDIDA_RESPALDO = 20;

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
  if (porcentajeInasistencia >= per) return 'rojo';
  if (porcentajeInasistencia >= adv) return 'ambar';
  return 'verde';
}

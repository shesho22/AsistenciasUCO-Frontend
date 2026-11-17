/**
 * Semaforo unico de asistencia (CULM-001 transversal, CIERRE-W3I).
 * El NIVEL lo clasifica el servidor con la unica regla de permanencia y los umbrales del catalogo de parametros
 * (`ufn_clasificar_permanencia`): REGULAR (verde), RIESGO (ambar) y PERDIDA (rojo). El cliente no compara porcentajes ni conoce
 * umbrales: solo traduce el codigo que llega a su presentacion (color, icono y texto).
 */
export type NivelAsistencia = 'verde' | 'ambar' | 'rojo';

const NIVEL_POR_CODIGO: Readonly<Record<string, NivelAsistencia>> = {
  REGULAR: 'verde',
  RIESGO: 'ambar',
  PERDIDA: 'rojo',
  // Alertas tempranas del coordinador: el servidor ya las entrega como semaforo.
  VERDE: 'verde',
  AMBAR: 'ambar',
  ROJO: 'rojo',
};

/** Nivel de presentacion del codigo que entrega el servidor; `null` si no hay codigo o no se reconoce (no se inventa un nivel). */
export function nivelDesdeCodigo(codigo: string | null | undefined): NivelAsistencia | null {
  if (!codigo) return null;
  return NIVEL_POR_CODIGO[codigo.trim().toUpperCase()] ?? null;
}

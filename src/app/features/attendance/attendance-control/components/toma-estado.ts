import { EstadoRegistroToma } from '../../../../core/models/toma-asistencia.model';

/** Estado de un estudiante en una toma; `null` es "Sin registro". */
export type EstadoFilaToma = EstadoRegistroToma | null;
export type ClaveEstadoToma = 'AN' | 'SJC' | 'EX' | 'SIN';

export const ETIQUETA_ESTADO_TOMA: Readonly<Record<ClaveEstadoToma, string>> = {
  AN: 'Presente',
  SJC: 'Falta',
  EX: 'Excusa',
  SIN: 'Sin registro',
};

export function claveEstadoToma(estado: EstadoFilaToma): ClaveEstadoToma {
  return estado ?? 'SIN';
}

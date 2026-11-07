import { SesionMateriaDetalle } from '../models/role-management.model';

type ClaveOrden = Pick<SesionMateriaDetalle, 'fecha' | 'horario' | 'numeroSesion' | 'fechaHoraInicioUtc'>;

/** Instante de inicio comparable: el UTC normalizado cuando existe; si no, fecha y hora de inicio presentadas. */
function claveInicio(sesion: ClaveOrden): string {
  if (sesion.fechaHoraInicioUtc) return sesion.fechaHoraInicioUtc;
  const inicio = (sesion.horario ?? '').match(/\d{1,2}:\d{2}/)?.[0] ?? '';
  return `${sesion.fecha ?? ''} ${inicio.padStart(5, '0')}`;
}

/**
 * Orden cronologico (inicio de la sesion; a igualdad, numero de sesion). No muta la lista de entrada.
 * El backend no garantiza ORDER BY, asi que la vista no debe depender del orden de llegada.
 */
export function ordenarSesionesCronologicamente<T extends ClaveOrden>(sesiones: readonly T[]): T[] {
  return [...sesiones].sort((a, b) => {
    const porInicio = claveInicio(a).localeCompare(claveInicio(b));
    return porInicio !== 0 ? porInicio : a.numeroSesion - b.numeroSesion;
  });
}

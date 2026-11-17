import { EstadoSesionGrupo } from './matriz-asistencia.model';

/**
 * CIERRE-W3M: resumen de las sesiones del grupo del docente entregado por el backend (estado temporal con la hora
 * institucional, conteos por sesion y del grupo, en riesgo y promedio con los umbrales de catalogo). El cliente no
 * compara fechas con su reloj ni cuenta registros.
 */
export interface SesionResumenGrupo {
  idSesion: string;
  numero: number;
  nombre: string;
  fechaHoraInicioUtc: string | null;
  fechaHoraFinUtc: string | null;
  horarioConfirmado: boolean;
  estadoSesion: EstadoSesionGrupo;
  estadoSolicitud: string | null;
  pendienteAprobacion: boolean;
  /** Matriculas activas del grupo. */
  totalEstudiantes: number;
  presentes: number;
  parciales: number;
  justificadas: number;
  ausentes: number;
  sinRegistro: number;
}

export interface ResumenSesionesGrupo {
  sesionesProgramadas: number;
  sesionesEjecutadas: number;
  sesionesCanceladas: number;
  sesionesEnCurso: number;
  idSesionEnCurso: string | null;
  idSesionProxima: string | null;
  estudiantesActivos: number;
  estudiantesEnRiesgo: number;
  /** `null` mientras el grupo no tenga horas dictadas. */
  promedioAsistencia: number | null;
  umbralAdvertencia: number | null;
  umbralPerdida: number | null;
  sesiones: SesionResumenGrupo[];
}

/** Definicion unica del conteo de sesiones; se muestra junto a la cifra para que nadie la interprete distinto. */
export const DEFINICION_CONTEO_SESIONES =
  'Programadas: todas las sesiones del grupo, incluidas las ya dictadas y las canceladas. ' +
  'Ejecutadas: sesiones no canceladas cuya hora de fin ya pasó. ' +
  'Canceladas: sesiones canceladas por el docente, la coordinación o un día festivo.';

const plural = (n: number, singular: string, pluralForma: string): string => `${n} ${n === 1 ? singular : pluralForma}`;

/** "13 programadas · 7 ejecutadas · 3 canceladas": solo da formato a los conteos que entrega el servidor. */
export function textoResumenSesiones(resumen: Pick<ResumenSesionesGrupo, 'sesionesProgramadas' | 'sesionesEjecutadas' | 'sesionesCanceladas'>): string {
  return (
    `${plural(resumen.sesionesProgramadas, 'programada', 'programadas')} · ` +
    `${plural(resumen.sesionesEjecutadas, 'ejecutada', 'ejecutadas')} · ` +
    `${plural(resumen.sesionesCanceladas, 'cancelada', 'canceladas')}`
  );
}

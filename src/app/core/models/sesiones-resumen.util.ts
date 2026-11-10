import { ClassSession } from './attendance.model';
import { estaCancelada } from './sesion-estado.model';

export interface ResumenSesiones {
  programadas: number;
  ejecutadas: number;
  canceladas: number;
  /** "13 programadas · 7 ejecutadas · 3 canceladas" */
  texto: string;
}

/** Definición única del conteo de sesiones; se muestra junto a la cifra para que nadie la interprete distinto. */
export const DEFINICION_CONTEO_SESIONES =
  'Programadas: todas las sesiones del grupo, incluidas las ya dictadas y las canceladas. ' +
  'Ejecutadas: sesiones no canceladas cuya hora de fin ya pasó. ' +
  'Canceladas: sesiones canceladas por el docente, la coordinación o un día festivo.';

function aMilisegundos(utc: string | null | undefined, fecha: string | undefined, hora: string | undefined): number | null {
  if (utc) {
    const t = Date.parse(utc);
    if (!Number.isNaN(t)) return t;
  }
  if (!fecha || !hora) return null;
  const t = Date.parse(`${fecha}T${hora}`);
  return Number.isNaN(t) ? null : t;
}

function inicio(s: ClassSession): number | null {
  return aMilisegundos(s.fechaHoraInicio, s.date, s.startTime);
}

function fin(s: ClassSession): number | null {
  return aMilisegundos(s.fechaHoraFin, s.endDate ?? s.date, s.endTime);
}

const plural = (n: number, singular: string, pluralForma: string): string => `${n} ${n === 1 ? singular : pluralForma}`;

export function resumirSesiones(sesiones: readonly ClassSession[], ahora: Date): ResumenSesiones {
  const t = ahora.getTime();
  const canceladas = sesiones.filter((s) => estaCancelada(s)).length;
  const ejecutadas = sesiones.filter((s) => {
    if (estaCancelada(s)) return false;
    const f = fin(s);
    return f !== null && f <= t;
  }).length;
  const programadas = sesiones.length;
  return {
    programadas,
    ejecutadas,
    canceladas,
    texto: `${plural(programadas, 'programada', 'programadas')} · ${plural(ejecutadas, 'ejecutada', 'ejecutadas')} · ${plural(canceladas, 'cancelada', 'canceladas')}`,
  };
}

export interface SesionDeHoy {
  sesion: ClassSession;
  tipo: 'EN_CURSO' | 'PROXIMA';
}

/** La sesión en curso o, si no hay, la próxima no cancelada más cercana; `null` si no queda ninguna vigente. */
export function sesionDeHoy(sesiones: readonly ClassSession[], ahora: Date): SesionDeHoy | null {
  const t = ahora.getTime();
  const vigentes = sesiones
    .filter((s) => !estaCancelada(s))
    .map((s) => ({ s, i: inicio(s), f: fin(s) }))
    .filter((x): x is { s: ClassSession; i: number; f: number } => x.i !== null && x.f !== null);
  const enCurso = vigentes.find((x) => x.i <= t && t < x.f);
  if (enCurso) return { sesion: enCurso.s, tipo: 'EN_CURSO' };
  const proxima = vigentes.filter((x) => x.i > t).sort((a, b) => a.i - b.i)[0];
  return proxima ? { sesion: proxima.s, tipo: 'PROXIMA' } : null;
}

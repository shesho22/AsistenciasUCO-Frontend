import { DiaSemana } from '../models/role-management.model';
import { SesionCalendario } from '../models/sesion-calendario.model';
import { mockUuid } from './student-portal-mock.adapter';

/** Franja semanal del mock (la comparten los horarios del estudiante y del docente). */
export interface FranjaMock {
  id: string;
  codigoMateria: string;
  nombreMateria: string;
  dia: DiaSemana;
  horaInicio: string;
  horaFin: string;
  grupo?: string;
  seccion?: string;
  docente?: string | null;
}

const DIA_A_NUMERO: Record<DiaSemana, number> = {
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
};

/** Desfase fijo de Bogotá (UTC-5) con que el mock convierte la hora local de la franja en instante UTC. */
const DESFASE_HORAS_BOGOTA = 5;

function instanteUtc(anio: number, mes: number, dia: number, hora: string): string {
  const [h, m] = hora.split(':').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia, h + DESFASE_HORAS_BOGOTA, m)).toISOString();
}

/**
 * ATA D7 (modo mock): una sesión por cada franja semanal y por cada fecha del rango `desde`-`hasta` (YYYY-MM-DD) que
 * caiga en el día de la franja, con la forma de `SesionCalendarioResponse`.
 */
export function mockSesionesCalendario(franjas: FranjaMock[], desde: string, hasta: string): SesionCalendario[] {
  const [a, m, d] = desde.split('-').map(Number);
  const inicio = Date.UTC(a, m - 1, d);
  const fin = Date.parse(`${hasta}T00:00:00Z`);
  const sesiones: SesionCalendario[] = [];
  for (let t = inicio; t <= fin; t += 24 * 60 * 60 * 1000) {
    const fecha = new Date(t);
    const iso = fecha.toISOString().slice(0, 10);
    for (const franja of franjas.filter((f) => DIA_A_NUMERO[f.dia] === fecha.getUTCDay())) {
      const [anio, mes, dia] = [fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate()];
      sesiones.push({
        idSesion: mockUuid(`sesion:${franja.id}:${iso}`),
        idGrupo: mockUuid(`grupo:${franja.codigoMateria}:${franja.grupo ?? franja.seccion ?? ''}`),
        codigoGrupo: franja.grupo ?? franja.seccion ?? '01',
        nombreGrupo: `Grupo ${franja.grupo ?? franja.seccion ?? '01'}`,
        idAsignatura: mockUuid(`asignatura:${franja.codigoMateria}`),
        codigoAsignatura: franja.codigoMateria,
        nombreAsignatura: franja.nombreMateria,
        nombreDocente: franja.docente ?? null,
        fechaHoraInicioUtc: instanteUtc(anio, mes, dia, franja.horaInicio),
        fechaHoraFinUtc: instanteUtc(anio, mes, dia, franja.horaFin),
        esExtraordinaria: false,
        estaCancelada: false,
        motivoCancelacion: null,
        esCancelacionAutomatica: false,
        nombreDiaFestivo: null,
      });
    }
  }
  return sesiones;
}

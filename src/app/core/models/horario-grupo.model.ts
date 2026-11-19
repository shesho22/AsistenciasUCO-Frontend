/**
 * SES-GEN-01: previsualización, de solo lectura, del calendario de sesiones de un horario propuesto para un grupo
 * (`POST /api/v1/coordinador/grupos/previsualizacion-horario`). Los tiempos van en minutos enteros; una «hora» de la materia son 60
 * minutos de reloj. Todo el cálculo y las validaciones viven en la base de datos: aquí solo se muestran.
 */
export interface PrevisualizacionHorarioGrupo {
  idGrupo: string | null;
  asignatura: { id: string; codigo: string; nombre: string; horasSemanales: number | null };
  periodo: { id: string; nombre: string; fechaInicio: string; fechaFin: string; diasPeriodo: number; semanasPeriodo: number; estado: string };
  zonaHoraria: string;
  franjas: { codigoDia: string; nombreDia: string; horaInicio: string; horaFin: string; minutos: number }[];
  resumenSemanal: {
    franjasPorSemana: number;
    minutosSemanales: number;
    minutosSemanalesMateria: number | null;
    diferenciaMinutos: number | null;
    coincideConMateria: boolean | null;
  };
  resumenPeriodo: {
    sesionesCalendario: number;
    sesionesProgramadas: number;
    sesionesEnFestivo: number;
    sesionesNoProgramables: number;
    minutosCalendario: number;
    minutosProgramados: number;
    minutosPerdidosFestivo: number;
    minutosNoProgramables: number;
    minutosEsperadosMateria: number | null;
    diferenciaMinutos: number | null;
    cubreTotalEsperado: boolean | null;
  };
  festivos: { fecha: string; nombre: string; sesionesAfectadas: number }[];
  sesiones: {
    numero: number;
    numeroSemana: number;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    fechaHoraInicioUtc: string;
    fechaHoraFinUtc: string;
    minutos: number;
    estado: 'PROGRAMADA' | 'CANCELADA_POR_FESTIVO' | 'NO_PROGRAMABLE_POR_FECHA';
    nombreFestivo: string | null;
  }[];
  /** Solo al editar un grupo existente. */
  cambioSobreGrupoExistente: {
    sesionesConservadas: number;
    minutosConservados: number;
    sesionesFuturasQueSeRetiran: number;
    sesionesFuturasQueSeCrean: number;
    sesionesFuturasQueSeConservan: number;
  } | null;
  conflictos: { codigo: string; severidad: 'BLOQUEANTE' | 'ADVERTENCIA' | 'INFORMATIVO'; mensaje: string; franja: string | null }[];
  puedeConfirmar: boolean;
}

/** Cuerpo de la previsualización: `idGrupo` ausente = grupo nuevo (entonces asignatura, período y docente son obligatorios). */
export interface PrevisualizarHorarioPayload {
  idGrupo?: string;
  idAsignatura?: string;
  idPeriodoAcademico?: string;
  idDocente?: string;
  franjas: { dia: string; horaInicio: string; horaFin: string }[];
}

/** Texto de una cantidad de minutos como horas: 240 → «4 h», 90 → «1,5 h». */
export function minutosAHoras(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined) return '—';
  const horas = minutos / 60;
  return `${Number.isInteger(horas) ? horas : horas.toFixed(1).replace('.', ',')} h`;
}

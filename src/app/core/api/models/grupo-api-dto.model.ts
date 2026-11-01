export interface GrupoApiDto {
  id: string;
  codigo: string;
  nombre: string;
  idAsignatura: string;
  nombreAsignatura: string;
  idDocente: string;
  capacidadMaximaPermitida: number;
  estudiantesActivos: number;
  cuposDisponibles: number;
  grupoHabilitado: boolean;
  fechaInicioPeriodoAcademico: string;
  fechaFinPeriodoAcademico: string;
  /** F1: horario semanal del grupo (dbo.uv_horario), ordenado de lunes a domingo. */
  franjas?: { codigoDia: string; nombreDia?: string | null; horaInicio: string; horaFin: string }[];
}

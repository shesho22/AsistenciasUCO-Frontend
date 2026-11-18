/**
 * ATA D7: una sesión del horario semanal con fecha (`SesionCalendarioResponse` del backend). Las franjas regulares ya
 * son sesiones; las extraordinarias se distinguen por `esExtraordinaria`. Los instantes llegan en UTC (ISO-8601 con Z)
 * y se presentan en la zona institucional con `SessionTimeZoneService`.
 */
export interface SesionCalendario {
  idSesion: string;
  idGrupo: string;
  codigoGrupo: string | number;
  nombreGrupo: string;
  idAsignatura: string;
  codigoAsignatura: string;
  nombreAsignatura: string;
  nombreDocente: string | null;
  fechaHoraInicioUtc: string;
  fechaHoraFinUtc: string;
  esExtraordinaria: boolean;
  estaCancelada: boolean;
  motivoCancelacion: string | null;
  esCancelacionAutomatica: boolean;
  nombreDiaFestivo: string | null;
}

/** Rol que consulta su propio calendario. */
export type RolCalendario = 'ESTUDIANTE' | 'DOCENTE';

export interface SesionConsultadaApiDto {
  sesion: string;
  grupo: string;
  nombre: string;
  numero: number;
  codigo: string;
  numeroSemana: number;
  codigoGrupo: string;
  nombreGrupo: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
}

export type EstadoTemporalSesion = 'CONFIRMADA' | 'INDETERMINADA';
export type ProcedenciaTemporalSesion = 'UTC_V2' | 'UTC_GENERADOR' | 'UTC_OWNER';

export interface SesionV2ApiDto {
  sesion: string;
  grupo: string;
  nombre: string;
  numero: number;
  codigo: string;
  numeroSemana: number;
  codigoGrupo: string;
  nombreGrupo: string;
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
  estadoTemporal: EstadoTemporalSesion;
  procedenciaTemporal: ProcedenciaTemporalSesion | null;
}

export interface CrearSesionV2Request {
  grupo: string;
  nombre: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
}

export interface ActualizarSesionV2Request {
  nombre: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
}

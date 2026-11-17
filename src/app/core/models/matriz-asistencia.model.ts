import { ApiPageResponse } from '../api/models/api-page-response.model';

/**
 * CIERRE-W3M: matriz estudiantes x sesiones del grupo entregada ya cruzada por el backend (estados de
 * `uv_asistencia_sesion_horas`, DEC-066). El cliente solo la pinta: no cruza padron, sesiones ni asistencias.
 */

/** Estado de un estudiante en una sesion: los cuatro primeros los define la base por tramos entre tomas. */
export type EstadoCeldaAsistencia =
  | 'PRESENTE'
  | 'PARCIAL'
  | 'JUSTIFICADA'
  | 'AUSENTE'
  | 'SIN_REGISTRO'
  | 'NO_DISPONIBLE';

/** Estado temporal de una sesion, resuelto por la base con la hora institucional. */
export type EstadoSesionGrupo = 'PROGRAMADA' | 'EN_CURSO' | 'EJECUTADA' | 'CANCELADA';

export interface SesionMatriz {
  idSesion: string;
  numero: number;
  nombre: string;
  estadoSesion: EstadoSesionGrupo;
  fechaHoraInicioUtc: string | null;
  fechaHoraFinUtc: string | null;
  horarioConfirmado: boolean;
}

export interface CeldaMatriz {
  idSesion: string;
  codigoEstado: EstadoCeldaAsistencia;
  minutosAsistidos: number;
  minutosSesion: number;
}

export interface FilaMatriz {
  idEstudianteGrupo: string;
  idEstudiante: string;
  nombreCompleto: string;
  documento: string;
  /** `A` = matricula activa; cualquier otro codigo es una matricula no activa (retirado, finalizado...). */
  codigoEstadoEstudiante: string;
  celdas: CeldaMatriz[];
}

/** Pagina de la matriz: el total cuenta estudiantes que cumplen la busqueda; `sesiones` es el encabezado completo. */
export interface MatrizAsistenciaPagina extends ApiPageResponse<FilaMatriz> {
  sesiones: SesionMatriz[];
}

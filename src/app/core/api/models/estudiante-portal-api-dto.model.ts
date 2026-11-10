import { IndicadoresAsistenciaResponse } from '../../models/indicadores-asistencia.model';
import { CancelacionSesion, EstadoSesion } from '../../models/sesion-estado.model';
/**
 * DTO HTTP reales del portal estudiantil (`/api/v1/estudiante/**`).
 * Espejo de los records Java vigentes en el backend; no se agregan campos que el backend no entrega.
 */

/** `MateriaEstudianteDTO`: una fila por (asignatura, grupo) en el que el estudiante esta matriculado. */
export interface MateriaEstudianteApiDto {
  idAsignatura: string;
  nombreAsignatura: string;
  idGrupo: string;
  nombreGrupo: string;
  /** CULM-001 B.2: indicadores por horas calculados por el backend (nunca `null` en B.2; opcional por compatibilidad). */
  indicadores?: IndicadoresAsistenciaResponse | null;
  /** CULM-001 C.1: estado de matricula ('A' = ACTIVA, 'CI' = CANCELADA_POR_INASISTENCIA, etc.). */
  estadoMatricula?: string | null;
  /** CULM-001 D.9-a: creditos de la asignatura. */
  creditos?: number | null;
  /** B2: caracter de la asignatura (OBL/OPT) cuando el backend lo informa. */
  codigoCaracter?: string | null;
  nombreCaracter?: string | null;
}

/** `HorarioEstudianteDTO`. `dia` y las horas llegan como texto (`LocalTime`: `HH:mm` o `HH:mm:ss`). */
export interface HorarioEstudianteApiDto {
  id: string;
  idEstudiante: string;
  idGrupo: string;
  codigoMateria: string;
  nombreMateria: string;
  grupo: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  docente: string;
}

/**
 * `SesionMateriaEstudianteDTO`. Las fechas son `LocalDateTime` del backend: persisten en UTC pero el wire format
 * actual no incluye zona (BACKEND_GOLDEN_PATH_CONTRACT §I); si algun despliegue las emite con offset, se respeta.
 *
 * Campos de asistencia (contrato LB-004D, backend `SesionMateriaEstudianteDTO`), todos derivados en el servidor
 * para el estudiante autenticado:
 * - `estadoAsistencia`: `PRESENTE | AUSENTE | JUSTIFICADA | PARCIAL | NO_DISPONIBLE`. `NO_DISPONIBLE` = sin registro o con
 *   una combinacion que la DB no define; nunca equivale a ausencia. La DB no distingue retardo, asi que no llega `RETARDO`.
 *   `PARCIAL` (SUPUESTO-B-15) = sesion con varias tomas en la que alguna quedo ausente y otra presente; es reclamable.
 * - `estadoSolicitudRevision`: nombre del estado de la solicitud de revision existente (`pendiente`, `aceptada`,
 *   `rechazada`, `DESCONOCIDO`) o `null`.
 * - `reclamable`: pista de presentacion (ausencia confirmada y sin solicitud previa). La autorizacion definitiva
 *   sigue siendo del backend/DB al radicar.
 *
 * Los tres son opcionales por compatibilidad con despliegues anteriores: si faltan, la sesion es "no disponible".
 */
export interface SesionMateriaEstudianteApiDto {
  id: string;
  nombre: string;
  numero: number;
  /** CULM-001 B.1 (SUPUESTO-B-18): el backend ya no entrega el codigo de la sesion al estudiante (no es credencial). */
  codigo?: string | null;
  numeroSemana: number;
  idGrupo: string;
  codigoGrupo: string;
  nombreGrupo: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  /** CULM-001 B.1 (aditivo): estado de la sesion y detalle de la cancelacion. */
  estado?: EstadoSesion | null;
  cancelacion?: CancelacionSesion | null;
  /** APP-04 (aditivo): instante UTC con sufijo Z solo si estadoTemporal = CONFIRMADA; null en otro caso. */
  fechaHoraInicioUtc?: string | null;
  fechaHoraFinUtc?: string | null;
  estadoTemporal?: string | null;
  estadoAsistencia?: string | null;
  estadoSolicitudRevision?: string | null;
  reclamable?: boolean | null;
  /** CULM-001 B.2: horas de la sesion (y de sus tomas) calculadas por el backend. */
  horasSesion?: number | null;
  totalTomas?: number | null;
  /** CULM-001 D.1 (HU026B): limite UTC para justificar (`null` si no hay plazo calculable) e indicador del backend. */
  fechaLimiteJustificacionUtc?: string | null;
  plazoJustificacionVigente?: boolean | null;
}

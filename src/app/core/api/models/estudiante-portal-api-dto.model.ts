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
 * - `estadoAsistencia`: `PRESENTE | AUSENTE | JUSTIFICADA | NO_DISPONIBLE`. `NO_DISPONIBLE` = sin registro o con una
 *   combinacion que la DB no define; nunca equivale a ausencia. La DB no distingue retardo, asi que no llega `RETARDO`.
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
  codigo: string;
  numeroSemana: number;
  idGrupo: string;
  codigoGrupo: string;
  nombreGrupo: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  estadoAsistencia?: string | null;
  estadoSolicitudRevision?: string | null;
  reclamable?: boolean | null;
}

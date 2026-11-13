import { CancelacionSesion, EstadoSesion, EstadoSolicitudSesion } from './sesion-estado.model';

export type AttendanceStatus = 'AN' | 'SJC' | 'EX';

export interface StudentAttendance {
  studentId: string;
  studentName: string;
  studentCode: string;
  avatarUrl?: string;
  /** `null` representa que el docente todavía no ha registrado asistencia. */
  status: AttendanceStatus | null;
  arrivalTime?: string;
}

export interface ClassSession {
  id: string;
  courseId: string;
  sessionNumber: number;
  title: string;
  date: string; // ISO format (YYYY-MM-DD)
  /** Fecha local de finalización; puede ser distinta cuando cruza medianoche. */
  endDate?: string;
  startTime: string;
  endTime: string;
  records: StudentAttendance[];
  /** Instantes RFC3339 originales entregados por v2; no se reinterpretan al cambiar de zona. */
  fechaHoraInicio?: string | null;
  fechaHoraFin?: string | null;
  estadoTemporal?: 'CONFIRMADA' | 'INDETERMINADA';
  procedenciaTemporal?: 'UTC_V2' | 'UTC_GENERADOR' | 'UTC_OWNER' | null;
  codigo?: string;
  numeroSemana?: number;
  codigoGrupo?: string;
  nombreGrupo?: string;
  /** CULM-001 B.1: estado de la sesión y detalle de la cancelación (docente o festivo). */
  estado?: EstadoSesion;
  cancelacion?: CancelacionSesion | null;
  /** DEC-065 (2): solicitud de sesión extraordinaria pendiente de aval del coordinador. */
  estadoSolicitud?: EstadoSolicitudSesion | null;
  pendienteAprobacion?: boolean;
}

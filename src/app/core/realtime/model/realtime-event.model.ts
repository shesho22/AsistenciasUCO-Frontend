/**
 * Contrato exacto del evento de negocio publicado por
 * `GET /api/v1/realtime/stream` (campo SSE `data`, serializado como JSON).
 * Los nombres de campo son los del backend; no se renombran para "encajar"
 * con el frontend legacy (eventId -> id, type -> topic/action, etc.).
 */
export interface RealtimeEvent<TPayload = unknown> {
  eventId: string;
  type: string;
  occurredAt: string;
  correlationId: string | null;
  payload: TPayload;
}

/** Eventos de negocio conectados por el backend. */
export const REALTIME_EVENT_TYPE = {
  ASISTENCIAS_SESION_ACTUALIZADAS: 'ASISTENCIAS_SESION_ACTUALIZADAS',
  PARAMETER_UPDATED: 'PARAMETER_UPDATED',
  MESSAGE_UPDATED: 'MESSAGE_UPDATED',
  SESION_CANCELADA: 'SESION_CANCELADA',
  // CULM-001 / DEC-064: sesión creada manualmente por el docente (audiencia: estudiantes del grupo y coordinador)
  SESION_MANUAL_CREADA: 'SESION_MANUAL_CREADA',
  TOMA_ABIERTA: 'TOMA_ABIERTA',
  TOMA_CERRADA: 'TOMA_CERRADA',
  ASISTENCIA_QR_ROTADO: 'ASISTENCIA_QR_ROTADO',
  ASISTENCIA_QR_REGISTRADA: 'ASISTENCIA_QR_REGISTRADA',
  ASISTENCIAS_TOMA_ACTUALIZADAS: 'ASISTENCIAS_TOMA_ACTUALIZADAS',
  // CULM-001 C.1: Alertas y Revisiones de Cancelación
  ALERTA_INASISTENCIA: 'ALERTA_INASISTENCIA',
  REVISION_CANCELACION_CREADA: 'REVISION_CANCELACION_CREADA',
  REVISION_CANCELACION_DECIDIDA: 'REVISION_CANCELACION_DECIDIDA',
  REVISION_CANCELACION_PROPUESTA: 'REVISION_CANCELACION_PROPUESTA',
  REVISION_CANCELACION_RESUELTA: 'REVISION_CANCELACION_RESUELTA',
  REVISION_CANCELACION_RESOLUCION: 'REVISION_CANCELACION_RESOLUCION',
  REVISION_CANCELACION_REASIGNADA: 'REVISION_CANCELACION_REASIGNADA',
  REVISION_CANCELACION_ESCALADA: 'REVISION_CANCELACION_ESCALADA',
} as const;

export type RealtimeEventType =
  (typeof REALTIME_EVENT_TYPE)[keyof typeof REALTIME_EVENT_TYPE];

export interface AttendanceSessionUpdatedRealtimePayload {
  grupo: string;
  sesion: string;
  totalRegistros: number;
}

/** CULM-001 B.1 (HU047): el payload no lleva el motivo; el docente titular lo conoce por la respuesta HTTP. */
export interface SesionCanceladaRealtimePayload {
  grupo: string;
  sesion: string;
  tipo: 'DOCENTE' | 'FESTIVO' | 'COORDINADOR';
  fechaHoraInicioUtc: string | null;
}

/** CULM-001 / DEC-064: `fechaHoraInicio` es ISO con `Z` si el horario está confirmado, o sin zona (v1); `docente` es el nombre completo. */
export interface SesionManualCreadaRealtimePayload {
  grupo: string;
  sesion: string;
  fechaHoraInicio: string | null;
  docente: string;
}

export type {
  AsistenciaQrRegistradaPayload,
  AsistenciaQrRotadoPayload,
} from '../../models/asistencia-qr.model';

/** CULM-001 B.2: payloads de tomas (audiencia: docente titular). */
export interface TomaAbiertaRealtimePayload {
  grupo: string;
  sesion: string;
  toma: string;
  numero: number;
  modo: 'MANUAL' | 'QR';
  fechaAperturaUtc: string;
}

export interface TomaCerradaRealtimePayload {
  grupo: string;
  sesion: string;
  toma: string;
  numero: number;
  totalAusentesMarcados: number;
  /** El cierre automático del job no lo informa. */
  totalFaltantes?: number;
  automatico: boolean;
}

export interface AsistenciasTomaActualizadasRealtimePayload {
  grupo: string;
  sesion: string;
  toma: string;
  totalRegistros: number;
}

/** CULM-001 C.1: payloads de alertas y revisiones de cancelación. */
export interface AlertaInasistenciaRealtimePayload {
  grupo: string;
  alerta: string;
  estudianteGrupo: string;
  tipo: 'ADVERTENCIA' | 'PERDIDA' | string;
  porcentajeInasistencia: number;
  umbral: number;
}

export interface RevisionCancelacionCreadaRealtimePayload {
  grupo: string;
  revision: string;
  estudianteGrupo: string;
  estado: string;
}

export interface RevisionCancelacionDecididaRealtimePayload {
  grupo: string;
  revision: string;
  estudianteGrupo: string;
  decision: string;
  estado: string;
  perfilResolutor: 'COORDINADOR' | 'DECANO' | string;
}

export interface RevisionCancelacionResueltaRealtimePayload {
  grupo: string;
  revision: string;
  estudianteGrupo: string;
  decision: string;
  estado: string;
  cambioMatricula: boolean;
}

export interface RevisionCancelacionReasignadaRealtimePayload {
  grupo: string;
  revision: string;
  estudianteGrupo: string;
  perfilResolutor: 'COORDINADOR' | 'DECANO' | string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Valida la forma mínima de un `RealtimeEvent` recibido por el transporte,
 * antes de emitirlo a las features. `correlationId` puede ser `null`.
 */
export function isValidRealtimeEvent(value: unknown): value is RealtimeEvent {
  if (!isRecord(value)) return false;

  const correlationId = value['correlationId'];

  return (
    typeof value['eventId'] === 'string' &&
    typeof value['type'] === 'string' &&
    typeof value['occurredAt'] === 'string' &&
    (correlationId === null || typeof correlationId === 'string') &&
    'payload' in value
  );
}

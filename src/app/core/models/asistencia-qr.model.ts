/** CULM-001 B.2 (CONTRACT B 3.2.6, 3.2.7 y 3.8): QR de la toma y registro del estudiante. */

export interface QrToma {
  idToma: string;
  idSesion: string;
  idGrupo: string;
  pin: string;
  urlAsistencia: string;
  qrPngBase64: string;
  fechaRotacionUtc: string;
  fechaExpiracionUtc: string;
  rotacionSegundos: number;
}

export type RegistroAsistenciaQrRequest = { token: string } | { pin: string };

export interface RegistroAsistenciaQr {
  idToma: string;
  idSesion: string;
  nombreAsignatura: string;
  nombreGrupo: string;
  numeroSesion: number;
  numeroToma: number;
  yaRegistrado: boolean;
  fechaRegistroUtc?: string | null;
  mensaje?: string | null;
}

export const ASISTENCIA_QR_EVENT = {
  ROTADO: 'ASISTENCIA_QR_ROTADO',
  REGISTRADA: 'ASISTENCIA_QR_REGISTRADA',
} as const;

export interface AsistenciaQrRotadoPayload {
  grupo: string;
  sesion: string;
  toma: string;
  pin: string;
  urlAsistencia: string;
  qrPngBase64: string;
  fechaRotacionUtc: string;
  fechaExpiracionUtc: string;
  rotacionSegundos: number;
}

export interface AsistenciaQrRegistradaPayload {
  grupo: string;
  sesion: string;
  toma: string;
  estudiante: string;
  totalPresentes: number;
}

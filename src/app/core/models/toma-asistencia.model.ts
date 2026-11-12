/** CULM-001 B.2 (CONTRACT B 3.2.5): tomas de asistencia por sesion. */
import { ApiPageResponse } from '../api/models/api-page-response.model';
import { CancelacionSesion, EstadoSesion } from './sesion-estado.model';

export type ModoToma = 'MANUAL' | 'QR';
export type EstadoToma = 'ABIERTA' | 'CERRADA';
export type EstadoRegistroToma = 'AN' | 'SJC' | 'EX';

/** Forma de `ApiPageResponse` del backend. */
export type PaginaApi<T> = ApiPageResponse<T>;

export interface TomaAsistencia {
  idToma: string;
  idSesion: string;
  idGrupo: string;
  numero: number;
  modo: ModoToma;
  estado: EstadoToma;
  esImplicita: boolean;
  fechaAperturaUtc: string;
  fechaCierreUtc: string | null;
  /** Obsoleto (reparto 1/n): no usar para calcular horas; el cálculo real lo entrega `ResumenTomasEstudiante`. */
  horasToma: number;
  /** Punto de control de la toma (instante ISO con Z, recortado a la sesión). */
  fechaPuntoControlUtc: string;
  ordenPuntoControl: number;
  /** Minutos del tramo entre el punto anterior (o el inicio de la sesión) y esta toma. */
  minutosTramoAnterior: number;
  /** Minutos del tramo entre esta toma y la siguiente (o el fin de la sesión). */
  minutosTramoSiguiente: number;
  /** El backend decide si la toma se puede corregir; el cliente no lo recalcula. */
  esEditable: boolean;
  /** Hasta cuándo se puede corregir una toma cerrada; `null` si no aplica. */
  editableHastaUtc: string | null;
  totalRegistros: number;
  totalPresentes: number;
  totalAusentes: number;
  totalExcusas: number;
  tieneQrActivo: boolean;
}

/** La ventana la calcula la BD; el cliente la pinta y no la recalcula. */
export interface VentanaSesion {
  aperturaUtc: string | null;
  cierreUtc: string | null;
  abierta: boolean;
}

export interface TomasSesion {
  idSesion: string;
  estado: EstadoSesion;
  cancelacion: CancelacionSesion | null;
  ventana: VentanaSesion;
  horasSesion: number;
  maximoTomas: number;
  tomas: TomaAsistencia[];
}

export type EstadoSesionEstudiante = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA' | 'PARCIAL' | 'NO_DISPONIBLE';

/** `GET /sesiones/{id}/tomas/resumen`: minutos y estado por estudiante, calculados por el backend. */
export interface ResumenTomasEstudiante {
  estudianteId: string;
  nombreCompleto: string;
  minutosSesion: number;
  minutosAsistidos: number;
  minutosFalta: number;
  minutosExcusa: number;
  minutosSinRegistro: number;
  estado: EstadoSesionEstudiante;
  tomasAusentes: number;
}

export interface CierreToma {
  toma: TomaAsistencia;
  totalAusentesMarcados: number;
  totalFaltantes: number;
  yaEstabaCerrada: boolean;
}

export interface RegistroTomaRequest {
  estudianteId: string;
  estado: EstadoRegistroToma;
}

export interface LoteTomaRequest {
  registros: RegistroTomaRequest[];
}

export interface LoteToma {
  idToma: string;
  idSesion: string;
  totalRegistros: number;
}

export interface AsistenciaToma {
  estudianteId: string;
  nombreCompleto: string;
  estado: EstadoRegistroToma | null;
  registradoPorEstudiante: boolean;
  fechaRegistroUtc: string | null;
}

export interface FaltanteToma {
  estudianteId: string;
  nombreCompleto: string;
  tieneRegistro: boolean;
  estado: EstadoRegistroToma | null;
  marcadoAlCerrar: boolean;
}

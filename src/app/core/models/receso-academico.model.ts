/**
 * DEC-081: día de receso académico de un período (un día completo sin clase para toda la institución). Un registro es una
 * fecha y un motivo. Los datos llegan resueltos por el backend; la pantalla no calcula ni traduce nada.
 */
export interface RecesoAcademico {
  id: string;
  /** `yyyy-MM-dd`. */
  fecha: string;
  /** Texto libre, sin el prefijo «Receso académico: ». */
  motivo: string;
  sesionesCanceladas: number;
  estaAplicado: boolean;
  /** Solo el día que todavía no canceló clases se puede retirar. */
  puedeRetirarse: boolean;
}

/** Cuerpo de `POST /admin/periodos-academicos/{id}/recesos`. */
export interface RecesoAcademicoPayload {
  fecha: string;
  motivo: string;
}

/** `datos` del alta: el día creado y cuántas clases canceló en el momento. */
export interface RecesoAcademicoCreado {
  id: string;
  fecha: string;
  motivo: string;
  sesionesCanceladas: number;
  sesionesConAsistencia: number;
}

/** Día agregado al formulario de un período que todavía no existe: se registra después de crear el período. */
export type RecesoPendiente = RecesoAcademicoPayload;

export const RECESO_MOTIVO_MAXIMO = 200;

/** Resultado del registro de un día pendiente tras crear el período; el texto es el del backend. */
export interface ResultadoRecesoPendiente {
  fecha: string;
  motivo: string;
  exitoso: boolean;
  mensaje: string;
}

import { SesionManualCreadaRealtimePayload } from '../realtime/model/realtime-event.model';

/**
 * CULM-001 / DEC-064: aviso no bloqueante de una sesión creada manualmente por el docente. Compone solo datos del
 * evento (nombre del docente y fecha ya formateada en la zona efectiva); no consulta ni traduce nada.
 */
export function mensajeSesionManualCreada(
  payload: Pick<SesionManualCreadaRealtimePayload, 'docente'>,
  fechaTexto: string
): string {
  const docente = payload.docente?.trim();
  const fecha = fechaTexto.trim();
  const quien = docente ? `El docente ${docente}` : 'El docente';
  return fecha ? `${quien} creó una sesión nueva para el ${fecha}.` : `${quien} creó una sesión nueva.`;
}

export const AVISO_SESION_CANCELADA_POR_COORDINACION = 'Sesión cancelada por coordinación';
export const AVISO_SESION_MANUAL_NOTIFICADA = 'Se notificó a los estudiantes y al coordinador del programa.';

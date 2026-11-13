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
export const AVISO_SOLICITUD_SESION_REGISTRADA = 'La sesión queda pendiente hasta que el coordinador del programa la apruebe.';

/** DEC-065 (2): aviso al docente cuando la coordinación aprueba su solicitud. */
export function mensajeSolicitudAprobada(nombre: string | null | undefined): string {
  const n = nombre?.trim();
  return n ? `La coordinación aprobó la sesión extraordinaria ${n}.` : 'La coordinación aprobó la sesión extraordinaria.';
}

/** DEC-065 (2): una sesión cancelada por el coordinador puede ser un rechazo de la solicitud o una cancelación. */
export function mensajeSolicitudRechazadaOCancelada(nombre: string | null | undefined): string {
  const n = nombre?.trim();
  return n ? `La coordinación rechazó o canceló la sesión ${n}.` : 'La coordinación rechazó o canceló una sesión del grupo.';
}

/** DEC-065 (2): aviso al coordinador cuando llega una solicitud nueva. */
export function mensajeSolicitudNueva(docente: string | null | undefined): string {
  const d = docente?.trim();
  return d ? `Nueva solicitud de sesión extraordinaria de ${d}.` : 'Nueva solicitud de sesión extraordinaria.';
}

import { API_ERROR_CODE, getApiErrorCode } from './api-error.util';

/** Causa visible de un fallo de carga; permite distinguirlo de una respuesta 200 con cero elementos. */
export type LoadErrorKind = 'IDENTIFICADOR' | 'VALIDACION' | 'AUTORIZACION' | 'NO_IMPLEMENTADO' | 'SERVIDOR' | 'RED';

export interface LoadErrorState {
  kind: LoadErrorKind;
  titulo: string;
  mensaje: string;
}

const ESTADOS: Record<LoadErrorKind, Omit<LoadErrorState, 'kind'>> = {
  IDENTIFICADOR: {
    titulo: 'Identificador inválido',
    mensaje: 'No se pudo identificar la asignatura seleccionada. Vuelve a Mis Materias e inténtalo de nuevo.',
  },
  VALIDACION: {
    titulo: 'Solicitud no válida',
    mensaje: 'El servidor rechazó la consulta por datos no válidos. No significa que no existan sesiones.',
  },
  AUTORIZACION: {
    titulo: 'Sin autorización',
    mensaje: 'Tu sesión expiró o no tienes permiso para consultar esta información.',
  },
  NO_IMPLEMENTADO: {
    titulo: 'Funcionalidad no disponible',
    mensaje: 'Esta consulta aún no está habilitada en el servidor. No significa que no existan datos.',
  },
  SERVIDOR: {
    titulo: 'Servicio no disponible',
    mensaje: 'El servidor no pudo procesar la consulta. Inténtalo de nuevo en unos minutos.',
  },
  RED: {
    titulo: 'Sin conexión con el servidor',
    mensaje: 'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
  },
};

export function loadErrorState(kind: LoadErrorKind): LoadErrorState {
  return { kind, ...ESTADOS[kind] };
}

/** Clasifica por codigo semantico/status (nunca por texto): 400 validacion, 401/403 autorizacion, 501 no implementado, otros 5xx servidor, 0 red. */
export function classifyLoadError(error: unknown): LoadErrorState {
  let code = getApiErrorCode(error);
  const status = (error as { status?: unknown } | null)?.status;
  if (code === API_ERROR_CODE.UNKNOWN && typeof status === 'number') {
    if (status === 0) code = API_ERROR_CODE.NETWORK_ERROR;
    else if (status === 400) code = API_ERROR_CODE.INVALID_REQUEST;
    else if (status === 401) code = API_ERROR_CODE.UNAUTHORIZED;
    else if (status === 403) code = API_ERROR_CODE.FORBIDDEN;
    else if (status === 501) code = API_ERROR_CODE.FEATURE_UNAVAILABLE;
  }
  if (code === API_ERROR_CODE.NETWORK_ERROR) return loadErrorState('RED');
  if (code === API_ERROR_CODE.UNAUTHORIZED || code === API_ERROR_CODE.FORBIDDEN) return loadErrorState('AUTORIZACION');
  if (code === API_ERROR_CODE.FEATURE_UNAVAILABLE) return loadErrorState('NO_IMPLEMENTADO');
  if (code === API_ERROR_CODE.INVALID_REQUEST || code === API_ERROR_CODE.VALIDATION_ERROR) {
    return loadErrorState('VALIDACION');
  }
  return loadErrorState('SERVIDOR');
}

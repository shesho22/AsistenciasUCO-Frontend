import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from '../models/api-error-response.model';
import { ApiFieldError } from '../models/api-field-error.model';

const DEFAULT_ERROR_MESSAGE =
  'No fue posible completar la operación. Intente nuevamente.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiFieldError(value: unknown): value is ApiFieldError {
  return (
    isRecord(value) &&
    typeof value['field'] === 'string' &&
    typeof value['code'] === 'string' &&
    typeof value['message'] === 'string'
  );
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isRecord(value)) {
    return false;
  }

  const correlationId = value['correlationId'];
  const details = value['details'];

  return (
    typeof value['timestamp'] === 'string' &&
    typeof value['status'] === 'number' &&
    typeof value['error'] === 'string' &&
    typeof value['code'] === 'string' &&
    typeof value['message'] === 'string' &&
    typeof value['path'] === 'string' &&
    (correlationId === null || typeof correlationId === 'string') &&
    (details === undefined ||
      (Array.isArray(details) && details.every(isApiFieldError)))
  );
}

export function getApiErrorResponse(
  error: unknown
): ApiErrorResponse | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  return isApiErrorResponse(error.error) ? error.error : null;
}

export function getApiFieldErrors(error: unknown): ApiFieldError[] {
  if (error instanceof HttpErrorResponse && isRecord(error.error)) {
    const details = error.error['details'];
    if (Array.isArray(details)) {
      return details.filter(isApiFieldError);
    }
  }
  return getApiErrorResponse(error)?.details ?? [];
}

/**
 * Códigos semánticos del contrato (BACKEND_GOLDEN_PATH_CONTRACT §G). El
 * comportamiento del frontend se decide SOLO por estos códigos, nunca por el
 * texto humano de `message`, ni por DBCODE (que jamás llega al frontend).
 */
export const API_ERROR_CODE = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  FEATURE_UNAVAILABLE: 'FEATURE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  /** Sin respuesta HTTP (red caída, CORS, backend inaccesible). */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Ni envelope ni status reconocible. */
  UNKNOWN: 'UNKNOWN',
} as const;

const CODE_MESSAGES: Record<string, string> = {
  [API_ERROR_CODE.UNAUTHORIZED]:
    'Su sesión institucional ha caducado. Por favor inicie sesión nuevamente.',
  [API_ERROR_CODE.FORBIDDEN]:
    'No tiene los permisos institucionales requeridos para realizar esta acción.',
  [API_ERROR_CODE.VALIDATION_ERROR]:
    'Los datos enviados no son válidos. Verifique los campos del formulario.',
  [API_ERROR_CODE.INVALID_REQUEST]:
    'La solicitud no pudo ser interpretada. Verifique los datos e intente nuevamente.',
  [API_ERROR_CODE.RESOURCE_NOT_FOUND]:
    'El recurso solicitado no fue encontrado en el sistema.',
  [API_ERROR_CODE.CONFLICT]:
    'Existe un conflicto con el estado actual de los datos. Actualice e intente nuevamente.',
  [API_ERROR_CODE.FEATURE_UNAVAILABLE]:
    'Esta funcionalidad no está disponible por el momento.',
  [API_ERROR_CODE.INTERNAL_ERROR]:
    'Ocurrió un error en el servidor al procesar la solicitud. Por favor intente más tarde.',
  [API_ERROR_CODE.NETWORK_ERROR]:
    'No fue posible conectar con el servidor. Verifique su conexión de red.',
};

/** Códigos de negocio cuyo `message` ya es el texto institucional listo para mostrar. */
const MENSAJE_DEL_BACKEND: ReadonlySet<string> = new Set([
  API_ERROR_CODE.VALIDATION_ERROR,
  API_ERROR_CODE.INVALID_REQUEST,
  API_ERROR_CODE.FORBIDDEN,
  API_ERROR_CODE.RESOURCE_NOT_FOUND,
  API_ERROR_CODE.CONFLICT,
]);

function codeFromHttpStatus(status: number): string {
  if (status === 0) return API_ERROR_CODE.NETWORK_ERROR;
  if (status === 400) return API_ERROR_CODE.INVALID_REQUEST;
  if (status === 401) return API_ERROR_CODE.UNAUTHORIZED;
  if (status === 403) return API_ERROR_CODE.FORBIDDEN;
  if (status === 404) return API_ERROR_CODE.RESOURCE_NOT_FOUND;
  if (status === 409) return API_ERROR_CODE.CONFLICT;
  if (status === 501) return API_ERROR_CODE.FEATURE_UNAVAILABLE;
  if (status >= 500) return API_ERROR_CODE.INTERNAL_ERROR;
  return API_ERROR_CODE.UNKNOWN;
}

/**
 * Código semántico del error. Con envelope `ApiErrorResponse` manda su
 * `code`; sin envelope (p. ej. 401/403 emitidos por la cadena de seguridad
 * antes del controller, TD-021) se deriva del status HTTP, nunca del texto.
 */
export function getApiErrorCode(error: unknown): string {
  const envelope = getApiErrorResponse(error);
  if (envelope) {
    // ERR_DB_UNCLASSIFIED es la variante 500 de INTERNAL_ERROR (§G).
    return envelope.code === 'ERR_DB_UNCLASSIFIED'
      ? API_ERROR_CODE.INTERNAL_ERROR
      : envelope.code;
  }
  if (error instanceof HttpErrorResponse) {
    return codeFromHttpStatus(error.status);
  }
  return API_ERROR_CODE.UNKNOWN;
}

/** Mensaje para el usuario, decidido por `code`. */
export function getApiErrorMessage(error: unknown): string {
  const code = getApiErrorCode(error);
  const envelope = getApiErrorResponse(error);

  if (code === API_ERROR_CODE.VALIDATION_ERROR) {
    const details = getApiFieldErrors(error);
    if (details.length > 0) {
      const issues = details
        .map((d) => `Campo '${d.field}': ${d.message}`)
        .join('. ');
      return `Error en datos del formulario: ${issues}.`;
    }
  }

  // Endpoints fuera del Golden Path (sin envelope) pueden traer un texto de
  // negocio propio; se muestra tal cual, sin ramificar por su contenido.
  if (!envelope && error instanceof HttpErrorResponse && isRecord(error.error)) {
    const legacy = error.error['mensajeUsuario'] ?? error.error['message'];
    if (typeof legacy === 'string' && legacy.trim()) {
      return legacy.trim();
    }
  }

  // CULM-001 A.2: los errores de negocio (400/403/404/409) traen en `message` el texto del catálogo institucional
  // (por ejemplo SES_017, REV_007, DEC_002, SEC_002): el backend es el único que traduce, la UI solo lo presenta.
  if (envelope && MENSAJE_DEL_BACKEND.has(code) && envelope.message.trim()) {
    return envelope.message.trim();
  }

  const known = CODE_MESSAGES[code];
  if (known) {
    return known;
  }

  // Códigos de catálogo de feature (ERR_*): el backend define el mensaje.
  if (envelope && envelope.message.trim()) {
    return envelope.message.trim();
  }

  return DEFAULT_ERROR_MESSAGE;
}

export function getApiFieldError(
  error: unknown,
  field: string
): string | undefined {
  const detail = getApiFieldErrors(error).find(
    (fieldError) => fieldError.field === field
  );

  return detail?.message;
}

export function getApiCorrelationId(error: unknown): string | undefined {
  return getApiErrorResponse(error)?.correlationId ?? undefined;
}

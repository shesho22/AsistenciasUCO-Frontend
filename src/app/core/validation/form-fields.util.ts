import { isInstitutionalEmail } from './institutional-email.util';
import { validateInstitutionalEmail } from './request-form-validation.util';

/**
 * DEC-073 (revision exhaustiva de formularios): reglas de campo compartidas por los formularios. Son las mismas del
 * backend (`ValidationPatterns` / `ValidationHelper`) y de la base de datos; el frontend las valida antes de enviar para
 * que el usuario vea el error en el campo, pero el backend sigue siendo la autoridad y su `mensajeUsuario` se muestra tal
 * cual si rechaza algo.
 */

/** Longitud de las columnas de nombres de personas y entidades (`nvarchar(50)`). */
export const NAME_MAX_LENGTH = 50;

/**
 * Nombre de persona: letras (con tildes), espacios, apostrofo y guion; sin digitos ni signos; no empieza ni termina con
 * separador ni repite separadores. Igual a `ValidationPatterns.PERSON_NAME`.
 */
const PERSON_NAME = /^(?![ '’-])(?!.*[ '’-]{2})[\p{L}\p{M} '’-]+(?<![ '’-])$/u;

/** Texto seguro para nombres de entidades: letras, numeros, espacios y . , - _ ( ) / # : (sin < > ni comillas). */
const SAFE_TEXT = /^[\p{L}\p{M}\p{N} .,_()/#:-]+$/u;

const CONTROL_OR_TAB = /[\p{Cc}]/u;
const HTML_TAG_DELIMITER = /[<>]/;

export const SAFE_TEXT_FORMAT_HINT = 'letras, números, espacios y los signos . , - _ ( ) / # :';

export interface TextFieldOptions {
  /** Si es obligatorio, vacio es error; si no, vacio es valido. */
  required?: boolean;
  /** Longitud maxima (recortada). Por defecto {@link NAME_MAX_LENGTH}. */
  maxLength?: number;
  /** Longitud minima (recortada) cuando hay valor. */
  minLength?: number;
}

function normalizeSpaces(value: string): string {
  return value.trim().replace(/ {2,}/g, ' ');
}

function lengthError(label: string, trimmed: string, options: TextFieldOptions): string | null {
  const max = options.maxLength ?? NAME_MAX_LENGTH;
  if (options.minLength && trimmed.length < options.minLength) {
    return `El campo ${label} debe tener al menos ${options.minLength} caracteres.`;
  }
  if (trimmed.length > max) {
    return `El campo ${label} no puede superar ${max} caracteres.`;
  }
  return null;
}

/** Error del nombre o apellido de una persona, o `null` si es valido. */
export function getPersonNameError(
  value: string | null | undefined,
  label: string,
  options: TextFieldOptions = {}
): string | null {
  const raw = value ?? '';
  const trimmed = raw.trim();
  if (!trimmed) {
    return options.required ? `El campo ${label} es obligatorio.` : null;
  }
  const length = lengthError(label, trimmed, options);
  if (length) {
    return length;
  }
  if (CONTROL_OR_TAB.test(raw) || !PERSON_NAME.test(normalizeSpaces(raw))) {
    return `El campo ${label} solo admite letras, espacios, apóstrofo y guion (sin números ni otros signos).`;
  }
  return null;
}

/** Error del nombre de una entidad (facultad, programa, periodo, grupo, sesion, asignatura...), o `null` si es valido. */
export function getSafeTextError(
  value: string | null | undefined,
  label: string,
  options: TextFieldOptions = {}
): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return options.required ? `El campo ${label} es obligatorio.` : null;
  }
  const length = lengthError(label, trimmed, options);
  if (length) {
    return length;
  }
  if (!SAFE_TEXT.test(trimmed)) {
    return `El campo ${label} solo admite ${SAFE_TEXT_FORMAT_HINT}.`;
  }
  return null;
}

/** Texto libre (respuestas, observaciones): sin etiquetas HTML. */
export function getFreeTextError(
  value: string | null | undefined,
  label: string,
  options: TextFieldOptions & { maxLength: number }
): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return options.required ? `El campo ${label} es obligatorio.` : null;
  }
  const length = lengthError(label, trimmed, options);
  if (length) {
    return length;
  }
  if (HTML_TAG_DELIMITER.test(trimmed)) {
    return `El campo ${label} no admite los caracteres < ni >.`;
  }
  return null;
}

/**
 * Correo de decanos, coordinadores y docentes (DEC-073): formato valido y dominio institucional vigente (llega del
 * backend; no hay dominio escrito aqui). Sin dominio cargado solo se valida el formato: el backend decide.
 */
export function getStaffEmailError(
  email: string | null | undefined,
  domain: string | null | undefined
): string | null {
  const formato = validateInstitutionalEmail(email ?? '');
  if (!formato.valid) {
    return formato.error ?? 'El campo Correo Institucional no es válido.';
  }
  if (domain && !isInstitutionalEmail(email, domain)) {
    return `El correo debe ser institucional y terminar en ${domain.trim()}.`;
  }
  return null;
}

/** Creditos de una asignatura: entero de 1 a 10 (DEC-073). */
export const CREDITS_MIN = 1;
export const CREDITS_MAX = 10;

export function getCreditsError(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || `${value}`.trim() === '') {
    return 'El campo Créditos es obligatorio.';
  }
  const text = `${value}`.trim();
  if (!/^\d+$/.test(text)) {
    return 'El campo Créditos debe ser un número entero.';
  }
  const credits = Number(text);
  if (credits < CREDITS_MIN || credits > CREDITS_MAX) {
    return `El campo Créditos debe estar entre ${CREDITS_MIN} y ${CREDITS_MAX}.`;
  }
  return null;
}

/** Respuesta del docente a un reclamo (DEC-073): obligatoria al rechazar (10 a 500), opcional al aprobar (hasta 500). */
export const CLAIM_RESPONSE_REJECT_MIN = 10;
export const CLAIM_RESPONSE_MAX = 500;

export function getClaimResponseError(
  action: 'APROBADA' | 'RECHAZADA' | string,
  response: string | null | undefined
): string | null {
  const rejecting = action === 'RECHAZADA';
  return getFreeTextError(response, 'Respuesta', {
    required: rejecting,
    minLength: rejecting ? CLAIM_RESPONSE_REJECT_MIN : undefined,
    maxLength: CLAIM_RESPONSE_MAX,
  });
}

/** Nombres y apellidos de una persona (los primeros son obligatorios; los segundos, opcionales). */
export interface PersonNames {
  primerNombre?: string | null;
  segundoNombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
}

/** Primer error de los nombres y apellidos, o `null` si todos son validos. */
export function getPersonNamesError(names: PersonNames): string | null {
  return (
    getPersonNameError(names.primerNombre, 'Primer Nombre', { required: true }) ??
    getPersonNameError(names.segundoNombre, 'Segundo Nombre') ??
    getPersonNameError(names.primerApellido, 'Primer Apellido', { required: true }) ??
    getPersonNameError(names.segundoApellido, 'Segundo Apellido')
  );
}

/**
 * Validacion previa de un soporte de revision (LB-004D). Espeja el contrato del backend
 * (ContentSecurityValidator): PDF / PNG / JPEG, de 1 byte a 5 MiB, nombre de hasta 250 caracteres.
 * El backend sigue siendo la autoridad (magic bytes, ClamAV); esto solo evita peticiones inutiles.
 */
export const SOPORTE_MAX_BYTES = 5 * 1024 * 1024;
export const SOPORTE_MAX_FILENAME_LENGTH = 250;
export const SOPORTE_ACCEPT = '.pdf,.png,.jpg,.jpeg';

const CONTENT_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export type SoporteFileErrorCode =
  | 'EMPTY'
  | 'TOO_LARGE'
  | 'NAME_TOO_LONG'
  | 'TYPE_NOT_ALLOWED';

export interface SoporteFileValidation {
  valid: boolean;
  code?: SoporteFileErrorCode;
  message?: string;
}

export function validateSoporteFile(file: Pick<File, 'name' | 'size' | 'type'>): SoporteFileValidation {
  if (file.size <= 0) {
    return invalid('EMPTY', 'El archivo está vacío.');
  }
  if (file.size > SOPORTE_MAX_BYTES) {
    return invalid('TOO_LARGE', 'El archivo supera el tamaño máximo permitido de 5 MB.');
  }
  if (file.name.length > SOPORTE_MAX_FILENAME_LENGTH) {
    return invalid('NAME_TOO_LONG', 'El nombre del archivo no puede superar los 250 caracteres.');
  }
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  const expectedType = CONTENT_TYPE_BY_EXTENSION[extension];
  if (!expectedType || (file.type || '').trim().toLowerCase() !== expectedType) {
    return invalid('TYPE_NOT_ALLOWED', 'Formato no permitido. Solo se aceptan archivos PDF, PNG o JPG.');
  }
  return { valid: true };
}

function invalid(code: SoporteFileErrorCode, message: string): SoporteFileValidation {
  return { valid: false, code, message };
}

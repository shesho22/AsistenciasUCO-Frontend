const BACKEND_INTEGER_MAX = 2_147_483_647;
const ALLOWED_SPECIAL_CHARS = '!@#$%^&*()_+-=%';

export type IdentificationNumberResult =
  | { valid: true; value: number }
  | { valid: false; error: string };

export function parseIdentificationNumber(
  input: string
): IdentificationNumberResult {
  const normalized = input.trim();

  if (!normalized) {
    return {
      valid: false,
      error: 'El campo Número de Identificación es obligatorio.',
    };
  }

  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      error: 'El campo Número de Identificación debe ser un número entero positivo (solo dígitos numéricos).',
    };
  }

  if (normalized.startsWith('0')) {
    return {
      valid: false,
      error: 'El campo Número de Identificación debe ser positivo y no comenzar con cero.',
    };
  }

  if (normalized.length < 6 || normalized.length > 10) {
    return {
      valid: false,
      error: 'El campo Número de Identificación debe contener entre 6 y 10 dígitos numéricos.',
    };
  }

  const value = Number(normalized);

  if (!Number.isInteger(value) || value > BACKEND_INTEGER_MAX) {
    return {
      valid: false,
      error: 'El campo Número de Identificación excede el rango numérico permitido por el sistema.',
    };
  }

  return { valid: true, value };
}

export function getPasswordValidationError(
  password: string,
  identificationNumber: string
): string | undefined {
  if (!password) {
    return 'El campo Contraseña es obligatorio.';
  }

  if (password.length < 8) {
    return 'El campo Contraseña debe tener más de 8 caracteres.';
  }

  if (password.length > 255) {
    return 'El campo Contraseña debe tener menos de 255 caracteres.';
  }

  if (/\s/.test(password)) {
    return 'El campo Contraseña no debe contener espacios en blanco.';
  }

  if (!/\p{Lu}/u.test(password)) {
    return 'El campo Contraseña debe incluir al menos una letra mayúscula (A-Z).';
  }

  if (!/\p{Ll}/u.test(password)) {
    return 'El campo Contraseña debe incluir al menos una letra minúscula (a-z).';
  }

  if (!/\p{Nd}/u.test(password)) {
    return 'El campo Contraseña debe incluir al menos un número (0-9).';
  }

  const hasAllowedSpecialCharacter = Array.from(password).some((character) =>
    ALLOWED_SPECIAL_CHARS.includes(character)
  );

  if (!hasAllowedSpecialCharacter) {
    return 'El campo Contraseña debe incluir al menos un carácter especial permitido (!@#$%^&*()_+-=%).';
  }

  if (password === identificationNumber.trim()) {
    return 'El campo Contraseña no debe ser igual al número de identificación.';
  }

  return undefined;
}

export function validateInstitutionalEmail(email: string): { valid: boolean; error?: string } {
  const normalized = (email || '').trim();
  if (!normalized) {
    return { valid: false, error: 'El campo Correo Institucional es obligatorio.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return {
      valid: false,
      error: 'El campo Correo Institucional debe tener un formato válido (ej. usuario@uco.edu.co).',
    };
  }
  return { valid: true };
}

/**
 * IDENT-001: el correo de un estudiante nuevo debe terminar exactamente en el dominio institucional configurado.
 * Misma regla que `ufn_correo_cumple_dominio_institucional` y `CorreoInstitucionalPolicy`: un solo `@`, parte local no
 * vacia y dominio IGUAL al configurado (sin distinguir mayusculas ni espacios laterales). El dominio llega del backend
 * (`GET /configuracion/registro-estudiante`); aqui no existe ningun dominio escrito. Fail-closed ante un dominio invalido.
 */
export function isInstitutionalEmail(
  email: string | null | undefined,
  domain: string | null | undefined
): boolean {
  const configured = (domain ?? '').trim().toLowerCase();
  if (configured.length < 2 || !configured.startsWith('@') || configured.indexOf('@', 1) >= 0) {
    return false;
  }

  const normalized = (email ?? '').trim().toLowerCase();
  const at = normalized.indexOf('@');
  if (at <= 0 || normalized.indexOf('@', at + 1) >= 0) {
    return false;
  }
  return normalized.substring(at) === configured;
}

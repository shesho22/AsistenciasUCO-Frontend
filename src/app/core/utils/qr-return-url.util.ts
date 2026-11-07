import { safeInternalPath } from '../security/baseline-oidc';

/**
 * CULM-001 B.2 (NB-8): el estudiante que abre el QR sin sesion vuelve a la misma URL (con `?t=`) tras iniciar sesion.
 * La URL se guarda solo en `sessionStorage` (no es un JWT: es un token de un solo uso con vida de segundos) y nunca
 * viaja al IdP ni a `returnUrl`, para que el token no quede en los registros de Keycloak.
 */
export const QR_RETORNO_STORAGE_KEY = 'uco.asistencia-qr.retorno';

/** Vida maxima de la URL guardada: el token vence en segundos; pasado este tiempo se descarta. */
export const QR_RETORNO_VIDA_MS = 5 * 60 * 1000;

const RUTA_QR = /^\/app\/asistencia\/(?:qr|pin)(?:[?#].*)?$/;

export function esRutaAsistenciaQr(url: string): boolean {
  return RUTA_QR.test(url);
}

export function guardarRetornoQr(url: string, guardadoEn: number = Date.now()): void {
  try {
    sessionStorage.setItem(QR_RETORNO_STORAGE_KEY, JSON.stringify({ url, guardadoEn }));
  } catch {
    // Sin sessionStorage el estudiante inicia sesion y usa el PIN.
  }
}

/** Devuelve la URL guardada una sola vez (la clave se borra al leerla); `null` si no hay, venció o no es interna. */
export function consumirRetornoQr(): string | null {
  try {
    const crudo = sessionStorage.getItem(QR_RETORNO_STORAGE_KEY);
    sessionStorage.removeItem(QR_RETORNO_STORAGE_KEY);
    if (!crudo) return null;
    const valor: unknown = JSON.parse(crudo);
    if (typeof valor !== 'object' || valor === null) return null;
    const { url, guardadoEn } = valor as { url?: unknown; guardadoEn?: unknown };
    if (typeof url !== 'string' || typeof guardadoEn !== 'number') return null;
    if (Date.now() - guardadoEn > QR_RETORNO_VIDA_MS) return null;
    const interna = safeInternalPath(url, '');
    return interna && esRutaAsistenciaQr(interna) ? interna : null;
  } catch {
    return null;
  }
}

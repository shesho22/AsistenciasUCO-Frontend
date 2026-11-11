/**
 * Cliente OIDC mínimo del modo `baseline` (Security Baseline 0.1.7): Authorization Code + PKCE (S256) contra el
 * realm central, con un cliente PÚBLICO. Reglas:
 *  - Sin password grant y sin secretos en la SPA.
 *  - El access token vive solo en memoria (lo guarda AuthService); aquí nunca se persiste.
 *  - No se solicita ni se conserva refresh token ni id_token: la renovación es una re-autenticación silenciosa
 *    (prompt=none) contra la sesión SSO del IdP.
 *  - En sessionStorage solo queda, mientras dura la redirección, el estado PKCE (state + verifier + ruta interna de
 *    retorno): no son credenciales de acceso.
 */

export interface BaselineOidcConfig {
  /** Emisor del realm central, p. ej. http://keycloak.localhost:19090/realms/security-baseline. */
  issuerUrl: string;
  clientId: string;
  /** URI registrada en el cliente público (misma origen de la SPA). */
  redirectUri: string;
  /** Origen del PDP (login/logout BFF). */
  pdpUrl: string;
}

export interface PendingBaselineLogin {
  state: string;
  verifier: string;
  returnUrl: string;
  silent: boolean;
  createdAt: number;
}

export interface BaselineCallback {
  code?: string;
  state?: string;
  error?: string;
}

export interface BaselineTokenResult {
  accessToken: string;
}

const PENDING_KEY = 'uco_baseline_pkce';
const SILENT_MARKER_KEY = 'uco_baseline_silent_attempt';
/** Un intento silencioso reciente evita bucles de redirección si el IdP no responde con code ni error. */
export const SILENT_ATTEMPT_WINDOW_MS = 30_000;
const PENDING_TTL_MS = 10 * 60_000;

export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  const encoded = btoa(binary).replaceAll('+', '-').replaceAll('/', '_');
  let end = encoded.length;
  while (end > 0 && encoded[end - 1] === '=') {
    end--;
  }
  return encoded.slice(0, end);
}

export function randomUrlSafe(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

/** Solo rutas internas de la SPA: evita redirecciones abiertas con returnUrl manipulado. */
export function safeInternalPath(candidate: string | null | undefined, fallback = '/'): string {
  if (!candidate || typeof candidate !== 'string') {
    return fallback;
  }
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return fallback;
  }
  return candidate;
}

export function buildAuthorizeUrl(
  config: BaselineOidcConfig,
  params: { state: string; challenge: string; silent: boolean }
): string {
  const query = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: config.redirectUri,
    code_challenge: params.challenge,
    code_challenge_method: 'S256',
    state: params.state,
  });
  if (params.silent) {
    query.set('prompt', 'none');
  }
  return `${config.issuerUrl}/protocol/openid-connect/auth?${query.toString()}`;
}

/** Login interactivo: lo hace el BFF del PDP (aprovisiona la identidad) y vuelve a la SPA con la sesión SSO activa. */
export function buildInteractiveLoginUrl(config: BaselineOidcConfig, returnTo: string): string {
  return `${config.pdpUrl}/oauth2/authorization/keycloak?return_to=${encodeURIComponent(returnTo)}`;
}

/** Logout BFF: cierra la sesión del PDP y la sesión SSO del IdP y vuelve al origen de la SPA. */
export function buildLogoutUrl(config: BaselineOidcConfig): string {
  return `${config.pdpUrl}/api/v1/session/logout`;
}

export function parseCallback(search: string): BaselineCallback {
  const params = new URLSearchParams(search);
  const result: BaselineCallback = {};
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  if (code) result.code = code;
  if (state) result.state = state;
  if (error) result.error = error;
  return result;
}

export function savePending(pending: PendingBaselineLogin): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    if (pending.silent) {
      sessionStorage.setItem(SILENT_MARKER_KEY, String(pending.createdAt));
    }
  } catch {
    // Sin sessionStorage no se puede completar el flujo: el llamador lo trata como fallo de login.
  }
}

export function loadPending(now = Date.now()): PendingBaselineLogin | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as PendingBaselineLogin;
    if (
      typeof value?.state !== 'string' ||
      typeof value?.verifier !== 'string' ||
      typeof value?.createdAt !== 'number' ||
      now - value.createdAt > PENDING_TTL_MS
    ) {
      return null;
    }
    return { ...value, returnUrl: safeInternalPath(value.returnUrl) };
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
    sessionStorage.removeItem(SILENT_MARKER_KEY);
  } catch {
    // Ignorar si el storage no está disponible.
  }
}

/**
 * Rutas PUBLICAS de la SPA (sin sesion): el estudiante que llega desde el QR de matricula (HU176B) o desde el enlace de
 * verificacion de correo (IDENT-001) todavia puede no tener cuenta. En ellas no se intenta la re-autenticacion silenciosa
 * del arranque: esa redireccion a la pagina del IdP (prompt=none) saca al usuario de la ruta y rompe el flujo.
 */
export const PUBLIC_ROUTE_PREFIXES = ['/matricula/', '/verificar-correo'] as const;

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((prefijo) => pathname === prefijo.replace(/\/$/, '') || pathname.startsWith(prefijo));
}

export function recentSilentAttempt(now = Date.now()): boolean {
  try {
    const raw = sessionStorage.getItem(SILENT_MARKER_KEY);
    return !!raw && now - Number(raw) < SILENT_ATTEMPT_WINDOW_MS;
  } catch {
    return false;
  }
}

/** Límite de cada operación de red durante el retorno OIDC. */
export const BASELINE_HTTP_TIMEOUT_MS = 8_000;

/**
 * Resuelve la operación aunque el proveedor de fetch no honre AbortSignal.
 * El aborto reduce trabajo pendiente; Promise.race garantiza el límite para el arranque Angular.
 */
export async function withBaselineTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = BASELINE_HTTP_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('La solicitud institucional excedió el tiempo límite.'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      timeout,
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/**
 * Intercambia el authorization code por un access token. Descarta refresh_token e id_token: la SPA no los
 * conserva. Falla con Error si la respuesta no es un Bearer válido.
 */
export function exchangeCode(
  config: BaselineOidcConfig,
  code: string,
  verifier: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = BASELINE_HTTP_TIMEOUT_MS
): Promise<BaselineTokenResult> {
  return withBaselineTimeout(async (signal) => {
    const response = await fetchFn(config.issuerUrl + '/protocol/openid-connect/token', {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code,
        redirect_uri: config.redirectUri,
        code_verifier: verifier,
      }).toString(),
      signal,
    });
    if (!response.ok) {
      throw new Error('El proveedor de identidad rechazó el código de autorización.');
    }
    const body = (await response.json()) as { access_token?: unknown; token_type?: unknown };
    if (
      typeof body.access_token !== 'string' ||
      !body.access_token ||
      String(body.token_type).toLowerCase() !== 'bearer'
    ) {
      throw new Error('Respuesta de token inválida.');
    }
    return { accessToken: body.access_token };
  }, timeoutMs);
}

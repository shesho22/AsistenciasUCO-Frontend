import { consumirRetornoQr, esRutaAsistenciaQr, guardarRetornoQr } from '../utils/qr-return-url.util';
import { Injectable, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { User, UserRole } from '../models/user.model';
import { MOCK_USERS_BY_ROLE, MOCK_USERS_LIST } from '../mocks/user.mock';
import { environment } from '../../../environments/environment';
import {
  BaselineOidcConfig,
  BASELINE_HTTP_TIMEOUT_MS,
  buildAuthorizeUrl,
  buildInteractiveLoginUrl,
  buildLogoutUrl,
  clearPending,
  exchangeCode,
  loadPending,
  parseCallback,
  pkceChallenge,
  randomUrlSafe,
  isPublicRoute,
  recentSilentAttempt,
  safeInternalPath,
  savePending,
  withBaselineTimeout,
} from '../security/baseline-oidc';
import { BrowserNavigator } from '../security/browser-navigator';


/** Compatibilidad del modo legacy: el refresh token solo existe en memoria y sessionStorage.
 * El modo baseline no entra por este canal: no existe refresh token accesible desde JavaScript. */
const SESSION_REFRESH_TOKEN_KEY = 'gestio_session_refresh_token';

/** Claves residuales de versiones anteriores que pudieran quedar en el navegador del usuario. */
const LEGACY_STORAGE_KEYS = [
  'gestio_access_token',
  'gestio_refresh_token',
  'gestio_current_user',
  'gestio_asistencia_mock_role',
] as const;

/** Canal BroadcastChannel para sincronización de sesión entre pestañas sin transmitir datos sensibles. */
const AUTH_BROADCAST_CHANNEL = 'uco_auth_bus';

const API_RESOURCE_CLIENT_ID = 'asistencias-api';

const VALID_INSTITUTIONAL_ROLES: readonly UserRole[] = [
  'ADMINISTRADOR',
  'DECANO',
  'COORDINADOR',
  'DOCENTE',
  'ESTUDIANTE',
];

/**
 * Fallbacks institucionales para mensajes de autenticación.
 * La única fuente de verdad en la nube es Azure App Configuration (messages:user:AUTH_*).
 */
const AUTH_MESSAGES_FALLBACK: Record<string, string> = {
  AUTH_FIELDS_REQUIRED: 'Por favor ingresa tu usuario y contraseña.',
  AUTH_NETWORK_ERROR: 'No se pudo establecer conexión con el servidor de autenticación institucional.',
  AUTH_GENERIC_ERROR: 'Usuario o contraseña incorrectos.',
  AUTH_INVALID_CREDENTIALS: 'Credenciales inválidas. Verifica tu usuario y contraseña institucional.',
  AUTH_INVALID_RESPONSE: 'Respuesta de autenticación inválida.',
  AUTH_UNAUTHENTICATED: 'El servidor no aceptó la sesión institucional (401). Inicia sesión nuevamente.',
  AUTH_FORBIDDEN: 'La sesión fue autenticada, pero no tiene permiso para acceder (403). Contacta al administrador.',
  AUTH_NO_ROLE_ASSIGNED: 'Tu cuenta institucional no tiene un rol o identidad válidos asignados. Contacta al administrador del sistema.',
};

// Forma general de UUID (RFC 4122, cualquier versión/variante): valida que
// idUsuario sea un identificador institucional real, no una versión concreta.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface JwtTokenPayload {
  sub?: string;
  idUsuario?: string;
  email?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  numeroIdentificacion?: string | number;
  exp?: number;
  iat?: number;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: {
    [key: string]: {
      roles?: string[];
    };
  };
}

function parseJwt(token: string): JwtTokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const unpadded = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    // base64url (JWT) no lleva padding; atob() sí lo requiere.
    const base64 = unpadded.padEnd(unpadded.length + ((4 - (unpadded.length % 4)) % 4), '=');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as JwtTokenPayload;
  } catch (e) {
    console.error('Error al decodificar JWT:', e);
    return null;
  }
}

/** Identidad institucional resuelta por el backend (`GET /api/v1/auth/me`). */
interface InstitutionalIdentity {
  idUsuario: string;
  roles: UserRole[];
}

type IdentityResolution =
  | { status: 'resolved'; identity: InstitutionalIdentity }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'rejected' }
  | { status: 'unavailable' };

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  // ── Signals públicos ──────────────────────────────────────────────────────
  currentUser = signal<User | null>(null);
  token = signal<string | null>(null);
  isAuthenticated = computed(() => !!this.token());
  private mockModeSignal = signal<boolean>(environment.useMocks);
  isMockMode = computed(() => this.mockModeSignal());
  /** Mensaje de autenticación para la pantalla de login (cuenta sin rol, retorno inválido, etc.). */
  authError = signal<string | null>(null);
  /**
   * Un SECURITY_PROVIDER desconocido NO se convierte en legacy: la aplicación queda sin autenticación y la
   * pantalla de login lo informa.
   */
  securityConfigError = computed(() =>
    environment.security.provider === 'invalid'
      ? 'Configuración de seguridad inválida: SECURITY_PROVIDER debe ser "legacy" o "baseline".'
      : null
  );

  // ── Estado interno de renovación ──────────────────────────────────────────
  /**
   * Refresh token vigente en memoria. Se replica en sessionStorage
   * (SESSION_REFRESH_TOKEN_KEY) solo para restaurar la sesión tras F5; siempre
   * se modifica mediante `storeRefreshToken` para mantener ambos sincronizados.
   * NUNCA se persiste en localStorage (AGENTS.md §3.3).
   */
  private refreshTokenInMemory = signal<string | null>(null);

  /**
   * Promise de renovación en vuelo para serializar llamadas concurrentes
   * (complementado por la cola BehaviorSubject del AuthInterceptor).
   */
  private refreshInFlight: Promise<boolean> | null = null;
  private baselineRenewalStarted = false;
  private readonly navigator = inject(BrowserNavigator);

  // ── BroadcastChannel multi-pestaña ────────────────────────────────────────
  private readonly authChannel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);

  setMockMode(enabled: boolean): void {
    // Persistir ambos estados evita que un USE_MOCKS=true definido por runtime
    // reaparezca al eliminar la preferencia local durante el mismo arranque.
    localStorage.setItem('USE_MOCKS', String(enabled));
    this.mockModeSignal.set(enabled);
  }

  constructor(private router: Router) {
    // Limpieza defensiva: eliminar claves residuales de versiones anteriores.
    this.purgeLegacyStorage();
    if (this.isBaselineMode()) {
      // Una sesión BFF no admite refresh tokens accesibles desde JavaScript.
      this.storeRefreshToken(null);
    }

    // Escuchar eventos de otras pestañas (LOGOUT, SESSION_EXPIRED).
    this.authChannel.onmessage = (event: MessageEvent) => {
      const { type } = (event.data ?? {}) as { type?: string };
      if (type === 'LOGOUT' || type === 'SESSION_EXPIRED') {
        // Limpiar signals en memoria y el refresh token de ESTA pestaña (su
        // sessionStorage es propio) sin re-emitir el evento (evita bucle).
        this.token.set(null);
        this.currentUser.set(null);
        this.storeRefreshToken(null);
        const currentUrl: string = this.router.url ?? '';
        if (!currentUrl.startsWith('/login')) {
          void this.router.navigate(['/login']);
        }
      }
    };
  }

  isBaselineMode(): boolean {
    return environment.security.provider === 'baseline';
  }

  ngOnDestroy(): void {
    this.authChannel.close();
  }

  /** Refresh token de sesión persistido en sessionStorage (null si no hay o el storage no está disponible). */
  private readPersistedRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(SESSION_REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Fija (o borra, con `null`) el refresh token en memoria y en sessionStorage.
   * Si sessionStorage no está disponible la sesión sigue funcionando solo en
   * memoria (sin restauración tras F5).
   */
  private storeRefreshToken(token: string | null): void {
    this.refreshTokenInMemory.set(token);
    try {
      if (token) {
        sessionStorage.setItem(SESSION_REFRESH_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY);
      }
    } catch {
      // Storage bloqueado o lleno: continuar solo con la copia en memoria.
    }
  }

  /** Elimina del navegador toda clave sensible que pudo haber dejado una versión anterior. */
  private purgeLegacyStorage(): void {
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  }

  private resolveAuthMessage(code: string): string {
    return AUTH_MESSAGES_FALLBACK[code] || 'Error en la autenticación institucional.';
  }

  /**
   * Inicialización de sesión al arrancar la app (APP_INITIALIZER).
   *
   * En modo real: con access token vigente en memoria no hace nada. Sin él
   * (típicamente tras F5, que reinicia los signals) intenta restaurar la sesión
   * con el refresh token de memoria o, si no hay, el de sessionStorage. Si el
   * refresh falla limpia toda credencial residual y retorna false; no navega:
   * el guard resuelve la ruta si realmente no hay sesión.
   * En modo mock: usa rol inicial DOCENTE sin leer de localStorage.
   */
  async initKeycloak(): Promise<boolean> {
    if (this.mockModeSignal()) {
      const initialRole: UserRole = 'DOCENTE';
      this.loginAsMockUser(initialRole, false);
      return true;
    }

    if (environment.security.provider === 'invalid') {
      this.clearSession();
      return false;
    }

    if (this.isBaselineMode()) {
      return this.initBaselineSession();
    }

    const currentToken = this.token();
    if (currentToken) {
      const payload = parseJwt(currentToken);
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload?.exp && payload.exp > nowSeconds + 10) {
        return true;
      }
    }

    // Restaurar con el refresh token en memoria o, tras F5, con el de sessionStorage.
    const refreshToken = this.refreshTokenInMemory() || this.readPersistedRefreshToken();
    if (!refreshToken) {
      return false;
    }

    const restored = await this.refreshAccessToken(refreshToken);
    if (!restored) {
      this.token.set(null);
      this.currentUser.set(null);
      this.storeRefreshToken(null);
      return false;
    }
    return true;
  }

  /**
   * Restaura la sesión del modo baseline (Authorization Code + PKCE contra el realm central).
   *  1. Con `?code&state` (retorno del IdP) intercambia el código y deja el access token SOLO en memoria.
   *  2. Con `?error=login_required` no hay sesión SSO: el usuario ve el login.
   *  3. Sin parámetros intenta una re-autenticación silenciosa (prompt=none) contra la sesión SSO; la página se
   *     redirige y esta promesa no se resuelve. Un intento reciente evita bucles de redirección.
   * No existe refresh token en JavaScript ni se persiste ninguna credencial.
   */
  private async initBaselineSession(): Promise<boolean> {
    this.token.set(null);
    this.currentUser.set(null);
    this.storeRefreshToken(null);
    this.authError.set(null);

    const callback = parseCallback(window.location.search);
    if (callback.code || callback.error) {
      return this.completeBaselineCallback(callback);
    }

    // Rutas publicas (QR de matricula, verificacion de correo): sin sesion no se redirige al IdP; la pagina se muestra tal cual.
    if (isPublicRoute(window.location.pathname)) {
      clearPending();
      return false;
    }

    if (recentSilentAttempt()) {
      clearPending();
      return false;
    }
    try {
      await this.redirectToBaselineAuthorize(true, this.currentReturnPath());
      return false;
    } catch {
      clearPending();
      this.replaceBaselineUrl('/login');
      this.authError.set(this.resolveAuthMessage('AUTH_NETWORK_ERROR'));
      return false;
    }
  }

  /** Retorno del IdP (`?code&state` o `?error`): intercambia el código por el access token, que queda SOLO en memoria. */
  private async completeBaselineCallback(callback: ReturnType<typeof parseCallback>): Promise<boolean> {
    const pending = loadPending();
    clearPending();
    if (callback.error) {
      this.replaceBaselineUrl('/login');
      if (callback.error !== 'login_required' && callback.error !== 'interaction_required') {
        this.authError.set(this.resolveAuthMessage('AUTH_GENERIC_ERROR'));
      }
      return false;
    }
    if (!pending || !callback.code || callback.state !== pending.state) {
      this.replaceBaselineUrl('/login');
      this.authError.set(this.resolveAuthMessage('AUTH_INVALID_RESPONSE'));
      return false;
    }
    try {
      const { accessToken } = await exchangeCode(this.baselineConfig(), callback.code, pending.verifier);
      const payload = parseJwt(accessToken);
      const resolution = payload
        ? await this.fetchInstitutionalIdentity(accessToken)
        : ({ status: 'rejected' } as IdentityResolution);
      if (resolution.status === 'unavailable') {
        this.clearSession();
        clearPending();
        this.replaceBaselineUrl('/login');
        this.authError.set(this.resolveAuthMessage('AUTH_NETWORK_ERROR'));
        return false;
      }
      if (resolution.status === 'unauthenticated' || resolution.status === 'forbidden') {
        this.clearSession();
        clearPending();
        this.replaceBaselineUrl('/login');
        this.authError.set(
          this.resolveAuthMessage(
            resolution.status === 'unauthenticated' ? 'AUTH_UNAUTHENTICATED' : 'AUTH_FORBIDDEN'
          )
        );
        return false;
      }
      const user =
        payload && resolution.status === 'resolved' ? this.mapIdentityToUser(payload, resolution.identity) : null;
      if (!user) {
        this.replaceBaselineUrl('/login');
        this.authError.set(this.resolveAuthMessage('AUTH_NO_ROLE_ASSIGNED'));
        return false;
      }
      this.token.set(accessToken);
      this.currentUser.set(user);
      // El JWT de baseline no trae claims de nombre: el nombre visible se hidrata desde el perfil de la DB (HU006) sin
      // retrasar la navegacion. Si el perfil esta apagado o falla, la sesion sigue con los datos del token.
      void this.fetchProfileFromBackend(accessToken);
      // CULM-001 B.2 (NB-8): el estudiante que abrio el QR sin sesion vuelve a esa URL (clave de un solo uso).
      const retornoQr = consumirRetornoQr();
      const target = retornoQr
        ?? (pending.returnUrl === '/' || pending.returnUrl.startsWith('/login')
          ? this.homePathForRole(user.role)
          : pending.returnUrl);
      this.replaceBaselineUrl(target);
      return true;
    } catch {
      this.clearSession();
      clearPending();
      this.replaceBaselineUrl('/login');
      this.authError.set(this.resolveAuthMessage('AUTH_NETWORK_ERROR'));
      return false;
    }
  }

  /**
   * Login interactivo: lo realiza el BFF del PDP (aprovisiona la identidad del usuario en el catálogo de seguridad
   * y establece la sesión SSO central) y vuelve a la SPA, que obtiene entonces su access token por PKCE.
   * La SPA nunca recibe ni envía contraseñas.
   */
  startBaselineLogin(returnUrl?: string): void {
    if (this.securityConfigError()) {
      return;
    }
    const target = safeInternalPath(returnUrl ?? this.currentReturnPath());
    clearPending();
    const returnTo = `${window.location.origin}/login?returnUrl=${encodeURIComponent(target)}`;
    this.navigator.assign(buildInteractiveLoginUrl(this.baselineConfig(), returnTo));
  }

  private baselineConfig(): BaselineOidcConfig {
    return {
      issuerUrl: environment.security.baselineIssuerUrl,
      clientId: environment.security.baselineClientId,
      redirectUri: `${window.location.origin}/login`,
      pdpUrl: environment.security.baselineUrl,
    };
  }

  private async redirectToBaselineAuthorize(silent: boolean, returnUrl: string): Promise<void> {
    const state = randomUrlSafe(16);
    const verifier = randomUrlSafe(48);
    const challenge = await pkceChallenge(verifier);
    // La URL del QR (con su token) solo se conserva en sessionStorage; nunca viaja al IdP.
    if (esRutaAsistenciaQr(returnUrl)) guardarRetornoQr(returnUrl);
    savePending({ state, verifier, returnUrl: safeInternalPath(returnUrl), silent, createdAt: Date.now() });
    this.navigator.assign(buildAuthorizeUrl(this.baselineConfig(), { state, challenge, silent }));
  }

  /** Ruta interna actual de la SPA; en /login conserva el `returnUrl` solicitado. */
  private currentReturnPath(): string {
    const path = window.location.pathname || '/';
    if (path.startsWith('/login')) {
      return safeInternalPath(new URLSearchParams(window.location.search).get('returnUrl'));
    }
    return safeInternalPath(`${path}${window.location.search}`);
  }

  private replaceBaselineUrl(path: string): void {
    try {
      window.history.replaceState({}, '', safeInternalPath(path));
    } catch {
      // Sin History API la navegación del router corrige la URL.
    }
  }

  private homePathForRole(role: UserRole): string {
    switch (role) {
      case 'ADMINISTRADOR':
      case 'ADMIN':
        return '/app/admin/decanos';
      case 'DECANO':
        return '/app/decano/mi-facultad/coordinadores';
      case 'COORDINADOR':
        return '/app/coordinador/programa/docentes';
      case 'DOCENTE':
        return '/app/docente/grupos';
      case 'ESTUDIANTE':
        return '/app/estudiante/horarios';
      default:
        return '/app/dashboard';
    }
  }

  async loginWithCredentials(usernameInput: string, passwordInput: string): Promise<User> {
    if (environment.security.provider === 'invalid') {
      throw new Error(this.securityConfigError() ?? 'Configuración de seguridad inválida.');
    }

    if (this.isBaselineMode()) {
      // El modo baseline no acepta password grant ni recibe credenciales en la SPA.
      this.startBaselineLogin();
      throw new Error('Redirigiendo al inicio de sesión institucional.');
    }

    const username = (usernameInput || '').trim();
    const password = passwordInput || '';

    if (!username || !password) {
      throw new Error(this.resolveAuthMessage('AUTH_FIELDS_REQUIRED'));
    }

    if (this.mockModeSignal()) {
      const foundMock = MOCK_USERS_LIST.find(
        (u) =>
          u.email.toLowerCase() === username.toLowerCase() ||
          u.role.toLowerCase() === username.toLowerCase()
      );
      const roleToUse: UserRole = foundMock ? foundMock.role : 'DOCENTE';
      this.loginAsMockUser(roleToUse, true);
      return this.currentUser()!;
    }

    const keycloakUrl = environment.keycloak.url.replace(/\/+$/, '');
    const tokenEndpoint = `${keycloakUrl}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      client_id: environment.keycloak.clientId,
      grant_type: 'password',
      username: username,
      password: password,
      scope: 'openid email profile',
    });

    let response: Response;
    try {
      response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
    } catch (networkError) {
      console.error('Error de red al conectar con el servidor de autenticación institucional:', networkError);
      throw new Error(this.resolveAuthMessage('AUTH_NETWORK_ERROR'));
    }

    if (!response.ok) {
      let errorCode = 'AUTH_GENERIC_ERROR';
      try {
        const errorJson = await response.json();
        // En OAuth 2.0 (RFC 6749 §5.2), 'invalid_grant' es el estándar inmutable para credenciales inválidas.
        // Se evalúa el código formal y nunca cadenas libres en inglés ('Invalid user credentials').
        if (errorJson?.error === 'invalid_grant') {
          errorCode = 'AUTH_INVALID_CREDENTIALS';
        }
      } catch {
        // Ignorar error al parsear cuerpo
      }
      throw new Error(this.resolveAuthMessage(errorCode));
    }

    const tokenData = await response.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;

    const payload = parseJwt(accessToken);
    if (!payload) {
      throw new Error(this.resolveAuthMessage('AUTH_INVALID_RESPONSE'));
    }

    const user = this.mapPayloadToUser(payload);
    if (!user) {
      throw new Error(this.resolveAuthMessage('AUTH_NO_ROLE_ASSIGNED'));
    }

    // Access token y usuario SOLO en memoria — NUNCA en localStorage (AGENTS.md §3.3).
    // El refresh token va a memoria + sessionStorage (restauración tras F5). Si
    // Keycloak no lo devuelve no se fabrica uno, y se descarta cualquier residual.
    this.token.set(accessToken);
    this.currentUser.set(user);
    this.storeRefreshToken(refreshToken ?? null);

    await this.fetchProfileFromBackend(accessToken);

    this.navigateForRole(user.role);
    return this.currentUser() || user;
  }

  async refreshAccessToken(refreshTokenStr?: string): Promise<boolean> {
    if (this.isBaselineMode()) {
      return false;
    }

    // Prioridad: parámetro explícito > signal en memoria. NUNCA localStorage.
    // (La restauración tras F5 la orquesta initKeycloak pasando el de sessionStorage.)
    const refreshToken = refreshTokenStr || this.refreshTokenInMemory();
    if (!refreshToken) return false;

    const keycloakUrl = environment.keycloak.url.replace(/\/+$/, '');
    const tokenEndpoint = `${keycloakUrl}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      client_id: environment.keycloak.clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        return false;
      }

      const tokenData = await response.json();
      const accessToken: string = tokenData.access_token;
      const newRefreshToken: string = tokenData.refresh_token || refreshToken;

      const payload = parseJwt(accessToken);
      if (!payload) return false;

      const user = this.mapPayloadToUser(payload);
      if (!user) return false;

      // Access token y usuario en memoria; el refresh token (rotado o el vigente
      // si Keycloak no rota) también en sessionStorage. Nada en localStorage.
      this.token.set(accessToken);
      this.currentUser.set(user);
      this.storeRefreshToken(newRefreshToken);

      void this.fetchProfileFromBackend(accessToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resuelve un access token utilizable para llamadas autenticadas (p.ej. el
   * transporte realtime), refrescándolo si está próximo a expirar. Nunca lee
   * localStorage directamente fuera de este servicio.
   */
  async getValidAccessToken(minValiditySeconds = 30): Promise<string | null> {
    if (this.mockModeSignal()) {
      return null;
    }

    const currentToken = this.token();
    if (!currentToken) {
      return null;
    }

    const payload = parseJwt(currentToken);
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (payload?.exp && payload.exp > nowSeconds + minValiditySeconds) {
      return currentToken;
    }

    if (this.isBaselineMode()) {
      // Sin refresh token en JavaScript: el access token por expirar se renueva con una re-autenticación silenciosa
      // contra la sesión SSO (la página se redirige y vuelve a la misma ruta). Si la sesión SSO ya no existe, el
      // retorno `login_required` deja al usuario en el login.
      if (!this.baselineRenewalStarted) {
        this.baselineRenewalStarted = true;
        void this.redirectToBaselineAuthorize(true, this.currentReturnPath());
      }
      return null;
    }

    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refreshAccessToken().finally(() => {
        this.refreshInFlight = null;
      });
    }

    const refreshed = await this.refreshInFlight;
    return refreshed ? this.token() : null;
  }

  loginAsMockUser(role: UserRole, navigateToApp: boolean = true): void {
    const selectedUser = MOCK_USERS_BY_ROLE[role] || MOCK_USERS_BY_ROLE.DOCENTE;
    this.currentUser.set(selectedUser);
    const mockToken = `mock-jwt-token-${role.toLowerCase()}-${selectedUser.id}`;
    this.token.set(mockToken);

    if (navigateToApp) {
      this.navigateForRole(role);
    }
  }

  navigateForRole(role: UserRole): void {
    switch (role) {
      case 'ADMINISTRADOR':
      case 'ADMIN':
        void this.router.navigate(['/app/admin/decanos']);
        break;
      case 'DECANO':
        void this.router.navigate(['/app/decano/mi-facultad/coordinadores']);
        break;
      case 'COORDINADOR':
        void this.router.navigate(['/app/coordinador/programa/docentes']);
        break;
      case 'DOCENTE':
        void this.router.navigate(['/app/docente/grupos']);
        break;
      case 'ESTUDIANTE':
        void this.router.navigate(['/app/estudiante/horarios']);
        break;
      default:
        void this.router.navigate(['/app/dashboard']);
        break;
    }
  }

  login(): Observable<ApiResponse<User | null>> {
    return of({
      idTransaccion: 'tx-login-info',
      exitoso: true,
      mensajeUsuario: 'Utiliza el formulario de inicio de sesión de Angular.',
      datos: this.currentUser(),
    });
  }

  async logout(): Promise<void> {
    if (this.isBaselineMode()) {
      this.clearSession(true);
      clearPending();
      // El endpoint oficial invalida la sesión BFF del PDP y la sesión SSO central, y vuelve a la SPA.
      this.navigator.assign(buildLogoutUrl(this.baselineConfig()));
      return;
    }
    this.clearSession(true);
    void this.router.navigate(['/login']);
  }

  clearSession(broadcast = false): void {
    this.token.set(null);
    this.currentUser.set(null);
    this.storeRefreshToken(null);
    // Limpieza defensiva de claves que pudieran haber quedado de versiones anteriores.
    this.purgeLegacyStorage();

    if (broadcast) {
      try {
        this.authChannel.postMessage({ type: 'LOGOUT' });
      } catch {
        // Ignorar si el canal no está disponible.
      }
    }
  }

  /** Expira la sesión definitivamente: limpia estado, notifica otras pestañas y redirige al login. */
  notifySessionExpired(): void {
    this.token.set(null);
    this.currentUser.set(null);
    this.storeRefreshToken(null);
    this.purgeLegacyStorage();
    try {
      this.authChannel.postMessage({ type: 'SESSION_EXPIRED' });
    } catch {
      // Ignorar si el canal no está disponible.
    }
    if (!(this.router.url ?? '').startsWith('/login')) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url ?? '/' },
      });
    }
  }


  async fetchProfileFromBackend(token?: string): Promise<User | null> {
    if (this.mockModeSignal()) {
      return this.currentUser();
    }

    const authToken = token || this.token();
    if (!authToken) return null;

    try {
      const res = await fetch(`${environment.apiUrl}/usuarios/perfil`, {
        // API Bearer-only: no se adjuntan cookies del navegador.
        credentials: 'omit',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      const dbData = json.datos;
      if (!dbData) return null;

      const current = this.currentUser();
      if (!current) return null;

      // Nombre visible: el DTO del perfil (HU006) lo entrega como `nombreCompleto`. En modo baseline el JWT no trae
      // claims de nombre, asi que sin esto la interfaz se queda con el texto generico de respaldo.
      const nombreVisible =
        dbData.nombreCompleto ||
        dbData.name ||
        [dbData.primerNombre, dbData.primerApellido].filter(Boolean).join(' ') ||
        current.name;

      const syncedUser: User = {
        ...current,
        primerNombre: dbData.primerNombre || current.primerNombre,
        segundoNombre: dbData.segundoNombre || current.segundoNombre,
        primerApellido: dbData.primerApellido || current.primerApellido,
        segundoApellido: dbData.segundoApellido || current.segundoApellido,
        numeroIdentificacion: dbData.numeroIdentificacion || current.numeroIdentificacion,
        name: nombreVisible,
        email: dbData.email || dbData.correo || current.email,
        status: dbData.estado || current.status,
      };

      this.currentUser.set(syncedUser);
      // Perfil sincronizado solo en signal de memoria — sin localStorage.
      return syncedUser;
    } catch (e) {
      console.warn('No se pudo hidratar el perfil desde el backend:', e);
      return null;
    }
  }

  /**
   * Consulta al backend la identidad institucional del Bearer. El backend es quien vincula (la primera vez, por
   * correo verificado) `issuer + subject → Usuario.id` y devuelve el UUID y los roles efectivos: la SPA no exige
   * `idUsuario` en el token ni envía UUID o correo alguno. Un 401/403 o una respuesta inválida es un rechazo; un
   * fallo de red o un 5xx indica que el servicio no está disponible (no se concede sesión en ningún caso).
   */
  private async fetchInstitutionalIdentity(accessToken: string): Promise<IdentityResolution> {
    try {
      return await withBaselineTimeout(async (signal) => {
        const response = await fetch(environment.apiUrl + '/auth/me', {
          // API Bearer-only: no se adjuntan cookies del navegador.
          credentials: 'omit',
          headers: { Authorization: 'Bearer ' + accessToken },
          signal,
        });
        if (response.status >= 500) {
          return { status: 'unavailable' };
        }
        if (response.status === 401) {
          return { status: 'unauthenticated' };
        }
        if (response.status === 403) {
          return { status: 'forbidden' };
        }
        if (!response.ok) {
          return { status: 'rejected' };
        }
        try {
          const datos = (await response.json())?.datos;
          const roles = Array.isArray(datos?.roles)
            ? VALID_INSTITUTIONAL_ROLES.filter((role) => datos.roles.includes(role))
            : [];
          if (!isValidUuid(datos?.idUsuario) || roles.length === 0) {
            return { status: 'rejected' };
          }
          return { status: 'resolved', identity: { idUsuario: datos.idUsuario, roles } };
        } catch {
          return { status: 'rejected' };
        }
      }, BASELINE_HTTP_TIMEOUT_MS);
    } catch {
      return { status: 'unavailable' };
    }
  }
  /**
   * Construye el `User` con la identidad institucional del backend. Del JWT solo se leen datos de presentación
   * (nombre, correo): ni el UUID ni los roles salen del token. El rol principal es el de mayor jerarquía según
   * `VALID_INSTITUTIONAL_ROLES` y `roles` conserva todos los efectivos.
   */
  private mapIdentityToUser(payload: JwtTokenPayload, identity: InstitutionalIdentity): User | null {
    const primaryRole = VALID_INSTITUTIONAL_ROLES.find((r) => identity.roles.includes(r));
    if (!primaryRole) {
      return null;
    }
    return { ...this.buildUser(payload, identity.idUsuario, primaryRole), roles: [...identity.roles] };
  }

  /**
   * Mapea el JWT institucional a un `User`. Únicamente
   * `resource_access["asistencias-api"].roles` es fuente válida de rol RBAC
   * (contrato del backend); `realm_access` y el client del frontend
   * (`asistencias-uco-frontend`) se ignoran deliberadamente. Sin rol
   * institucional válido o sin `idUsuario` UUID, la sesión se considera
   * inválida (devuelve `null`) en lugar de asumir un rol/identidad por defecto.
   */
  private mapPayloadToUser(payload: JwtTokenPayload): User | null {
    const apiRoles: string[] = payload.resource_access?.[API_RESOURCE_CLIENT_ID]?.roles || [];
    const primaryRole = VALID_INSTITUTIONAL_ROLES.find((r) => apiRoles.includes(r));

    if (!primaryRole) {
      return null;
    }

    if (!isValidUuid(payload.idUsuario)) {
      return null;
    }

    return this.buildUser(payload, payload.idUsuario, primaryRole);
  }

  private buildUser(payload: JwtTokenPayload, id: string, primaryRole: UserRole): User {
    const fullName = [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
      payload.name ||
      // Nunca el usuario tecnico (preferred_username): hasta hidratar el perfil se muestra un marcador neutro.
      'Usuario Institucional';

    return {
      id,
      primerNombre: payload.given_name || fullName.split(' ')[0] || '',
      primerApellido: payload.family_name || fullName.split(' ')[1] || '',
      name: fullName,
      email: payload.email || `${payload.preferred_username || 'usuario'}@uco.edu.co`,
      role: primaryRole,
      institutionName: 'Universidad Católica de Oriente',
      department: this.getDepartmentForRole(primaryRole),
      status: 'active',
      numeroIdentificacion: payload.numeroIdentificacion,
    };
  }

  private getDepartmentForRole(role: UserRole): string {
    switch (role) {
      case 'ADMINISTRADOR':
      case 'ADMIN':
        return 'Administración Institucional';
      case 'DECANO':
        return 'Facultad de Ingeniería';
      case 'COORDINADOR':
        return 'Ingeniería de Sistemas';
      case 'DOCENTE':
        return 'Docencia Académica';
      case 'ESTUDIANTE':
        return 'Comunidad Estudiantil';
      default:
        return 'Comunidad Académica';
    }
  }
}

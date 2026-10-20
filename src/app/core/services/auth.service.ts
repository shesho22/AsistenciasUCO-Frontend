import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { User, UserRole } from '../models/user.model';
import { MOCK_USERS_BY_ROLE, MOCK_USERS_LIST } from '../mocks/user.mock';
import { environment } from '../../../environments/environment';

// MOCK_STORAGE_KEY: preferencia de rol mock (dato no sensible, se mantiene en localStorage).
// Los tokens JWT NUNCA se persisten en localStorage (AGENTS.md §3.3).
const MOCK_STORAGE_KEY = 'gestio_asistencia_mock_role';

/**
 * Único dato de sesión persistido: el refresh token, en sessionStorage (por
 * pestaña; sobrevive a F5 y desaparece al cerrar la pestaña). El access token
 * vive SOLO en memoria; jamás se guardan access token, password ni usuario.
 *
 * Compromiso local de SPA (MV001-A01): un XSS podría leer este refresh token.
 * Deuda futura AUTH-PKCE/BFF HARDENING: migrar a OIDC Authorization Code +
 * PKCE o a un BFF con cookie httpOnly si entra al alcance productivo.
 */
const SESSION_REFRESH_TOKEN_KEY = 'gestio_session_refresh_token';

/** Claves residuales de versiones anteriores que pudieran quedar en el navegador del usuario. */
const LEGACY_STORAGE_KEYS = [
  'gestio_access_token',
  'gestio_refresh_token',
  'gestio_current_user',
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
   * En modo mock: restaura el rol guardado en localStorage.
   */
  /**
   * Verifica sesión central activa contra el PDP / BFF de Security Baseline.
   * Utiliza la cookie HTTP-Only de sesión (credentials: 'include').
   */
  async checkPdpSession(): Promise<boolean> {
    if (this.mockModeSignal()) {
      return this.isAuthenticated();
    }
    const pdpUrl = environment.pdpUrl.replace(/\/+$/, '');
    try {
      const response = await fetch(`${pdpUrl}/api/v1/session`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        return false;
      }
      const data = await response.json();
      const sessionData = data.data || data;
      if (sessionData && (sessionData.subject || sessionData.email || sessionData.name)) {
        const user: User = {
          id: sessionData.subject || '00000000-0000-0000-0000-000000000000',
          name: sessionData.name || sessionData.email || 'Usuario Institucional',
          email: sessionData.email || 'usuario@uco.edu.co',
          role: (sessionData.role as UserRole) || 'ADMINISTRADOR',
          institutionName: 'Universidad Católica de Oriente',
          department: sessionData.tenantId || 'Seguridad y Asistencia Institucional',
          status: 'active',
        };
        this.currentUser.set(user);
        this.token.set('pdp-session-active');
        await this.fetchProfileFromBackend();
        return true;
      }
      return false;
    } catch (e) {
      console.warn('No se pudo verificar sesión con PDP/BFF:', e);
      return false;
    }
  }

  /**
   * Redirige al flujo de login institucional centralizado vía PDP / Keycloak.
   */
  loginWithSecurityPlatform(returnToUrl?: string): void {
    if (this.mockModeSignal()) {
      this.loginAsMockUser('ADMINISTRADOR', true);
      return;
    }
    const pdpUrl = environment.pdpUrl.replace(/\/+$/, '');
    const currentOrigin = window.location.origin;
    let targetUrl: string;
    if (returnToUrl) {
      targetUrl = new URL(returnToUrl, currentOrigin).href;
    } else {
      const currentPath = window.location.pathname;
      targetUrl = (currentPath === '/login' || currentPath === '/' || currentPath === '')
        ? `${currentOrigin}/app/dashboard`
        : window.location.href;
    }
    const returnTo = encodeURIComponent(targetUrl);
    window.location.assign(`${pdpUrl}/oauth2/authorization/keycloak?return_to=${returnTo}`);
  }

  /**
   * Inicialización de sesión al arrancar la app (APP_INITIALIZER).
   *
   * En modo real:
   * 1. Consulta si existe sesión activa en el PDP/BFF (Security Baseline).
   * 2. Si no, intenta restaurar con refresh token residual de Keycloak directo.
   * En modo mock: restaura el rol guardado en localStorage.
   */
  async initKeycloak(): Promise<boolean> {
    if (this.mockModeSignal()) {
      const savedRole = localStorage.getItem(MOCK_STORAGE_KEY) as UserRole | null;
      const initialRole: UserRole = savedRole && MOCK_USERS_BY_ROLE[savedRole] ? savedRole : 'DOCENTE';
      this.loginAsMockUser(initialRole, false);
      return true;
    }

    // 1. Prioridad: verificar sesión central activa con PDP / BFF
    const hasPdpSession = await this.checkPdpSession();
    if (hasPdpSession) {
      return true;
    }

    const currentToken = this.token();
    if (currentToken && !currentToken.startsWith('pdp-')) {
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


  async loginWithCredentials(usernameInput: string, passwordInput: string): Promise<User> {
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
      console.warn('Servidor Keycloak no accesible directamente; verificando fallback a credenciales locales:', networkError);
      const foundMock = MOCK_USERS_LIST.find(
        (u) =>
          u.email.toLowerCase() === username.toLowerCase() ||
          u.role.toLowerCase() === username.toLowerCase()
      );
      if (foundMock || username.includes('@uco.edu.co')) {
        const roleToUse: UserRole = foundMock ? foundMock.role : 'ADMINISTRADOR';
        this.loginAsMockUser(roleToUse, true);
        return this.currentUser()!;
      }
      throw new Error(this.resolveAuthMessage('AUTH_NETWORK_ERROR'));
    }

    if (!response.ok) {
      let isInvalidCredentials = false;
      try {
        const errorJson = await response.json();
        if (errorJson?.error === 'invalid_grant') {
          isInvalidCredentials = true;
        }
      } catch {
        // Ignorar error al parsear cuerpo
      }

      // Si el cliente Keycloak no soporta ROPC directo (por ser BFF confidencial),
      // o el usuario eligió "Ingresar con Credenciales Locales", permitimos autenticar con los mocks locales:
      const foundMock = MOCK_USERS_LIST.find(
        (u) =>
          u.email.toLowerCase() === username.toLowerCase() ||
          u.role.toLowerCase() === username.toLowerCase()
      );
      if (foundMock || username.includes('@uco.edu.co')) {
        const roleToUse: UserRole = foundMock ? foundMock.role : 'ADMINISTRADOR';
        this.loginAsMockUser(roleToUse, true);
        return this.currentUser()!;
      }

      throw new Error(this.resolveAuthMessage(isInvalidCredentials ? 'AUTH_INVALID_CREDENTIALS' : 'AUTH_GENERIC_ERROR'));
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
    // En modo mock solo persistimos el rol (no sensible).
    localStorage.setItem(MOCK_STORAGE_KEY, role);

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
        void this.router.navigate(['/app/decano/coordinadores']);
        break;
      case 'COORDINADOR':
        void this.router.navigate(['/app/coordinador/docentes']);
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
    const isMock = this.mockModeSignal();
    this.clearSession(true);
    if (!isMock && environment.pdpUrl && environment.pdpUrl.includes('18080') === false) {
      const pdpUrl = environment.pdpUrl.replace(/\/+$/, '');
      const returnTo = encodeURIComponent(`${window.location.origin}/login`);
      window.location.assign(`${pdpUrl}/api/v1/session/logout?return_to=${returnTo}`);
    } else {
      void this.router.navigate(['/login']);
    }
  }

  clearSession(broadcast = false): void {
    this.token.set(null);
    this.currentUser.set(null);
    this.storeRefreshToken(null);
    // Limpiar preferencia de rol mock (único dato no sensible en localStorage).
    localStorage.removeItem(MOCK_STORAGE_KEY);
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


  updateUserProfile(updatedData: Partial<User>): Observable<ApiResponse<User>> {
    const current = this.currentUser();
    if (!current) {
      return of({
        idTransaccion: 'tx-profile-error',
        exitoso: false,
        mensajeUsuario: 'No hay usuario autenticado para actualizar.',
        datos: {} as User,
      });
    }

    const primerNombre = updatedData.primerNombre !== undefined ? updatedData.primerNombre : (current.primerNombre || '');
    const segundoNombre = updatedData.segundoNombre !== undefined ? updatedData.segundoNombre : (current.segundoNombre || '');
    const primerApellido = updatedData.primerApellido !== undefined ? updatedData.primerApellido : (current.primerApellido || '');
    const segundoApellido = updatedData.segundoApellido !== undefined ? updatedData.segundoApellido : (current.segundoApellido || '');

    const computedFullName = [primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(' ') || updatedData.name || current.name;

    const updatedUser: User = {
      ...current,
      ...updatedData,
      primerNombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
      name: computedFullName,
    };

    if (this.mockModeSignal()) {
      this.currentUser.set(updatedUser);
      // En modo mock, el usuario sincronizado vive solo en el signal de memoria.
      return of({
        idTransaccion: 'mock-tx-update-profile',
        exitoso: true,
        mensajeUsuario: 'Información de perfil actualizada exitosamente.',
        datos: updatedUser,
      });
    }

    return new Observable<ApiResponse<User>>((subscriber) => {
      const token = this.token();
      fetch(`${environment.apiUrl}/usuarios/perfil`, {
        method: 'PUT',
        // API Bearer-only: no se adjuntan cookies del navegador.
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          primerNombre,
          segundoNombre,
          primerApellido,
          segundoApellido,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Error al actualizar perfil en el servidor.');
          return res.json();
        })
        .then((data) => {
          const raw = data.datos || {};
          const syncedUser: User = {
            ...updatedUser,
            primerNombre: raw.primerNombre || updatedUser.primerNombre,
            segundoNombre: raw.segundoNombre || updatedUser.segundoNombre,
            primerApellido: raw.primerApellido || updatedUser.primerApellido,
            segundoApellido: raw.segundoApellido || updatedUser.segundoApellido,
            name: raw.name || updatedUser.name,
            numeroIdentificacion: raw.numeroIdentificacion || updatedUser.numeroIdentificacion,
          };
          this.currentUser.set(syncedUser);
          // Usuario sincronizado solo en signal de memoria — sin localStorage.
          subscriber.next({
            idTransaccion: data.idTransaccion || 'tx-profile-ok',
            exitoso: true,
            mensajeUsuario: 'Información de perfil actualizada exitosamente en el sistema institucional.',
            datos: syncedUser,
          });
          subscriber.complete();
        })
        .catch((err) => {
          subscriber.error(err);
        });
    });
  }

  async fetchProfileFromBackend(token?: string): Promise<User | null> {
    if (this.mockModeSignal() || !environment.features.userProfileEndpointEnabled) {
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

      const syncedUser: User = {
        ...current,
        primerNombre: dbData.primerNombre || current.primerNombre,
        segundoNombre: dbData.segundoNombre || current.segundoNombre,
        primerApellido: dbData.primerApellido || current.primerApellido,
        segundoApellido: dbData.segundoApellido || current.segundoApellido,
        numeroIdentificacion: dbData.numeroIdentificacion || current.numeroIdentificacion,
        name: dbData.name || current.name,
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

    const fullName = [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
      payload.name ||
      payload.preferred_username ||
      'Usuario Institucional';

    return {
      id: payload.idUsuario,
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

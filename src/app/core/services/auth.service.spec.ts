import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { BrowserNavigator } from '../security/browser-navigator';
import { BASELINE_HTTP_TIMEOUT_MS, loadPending, savePending } from '../security/baseline-oidc';
import { guardarRetornoQr, QR_RETORNO_STORAGE_KEY } from '../utils/qr-return-url.util';

function base64UrlEncode(json: object): string {
  // UTF-8 safe base64 (parseJwt reverses this exact encoding via atob + decodeURIComponent).
  const utf8Latin1 = unescape(encodeURIComponent(JSON.stringify(json)));
  const base64 = btoa(utf8Latin1);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncode({ alg: 'RS256', typ: 'JWT' });
  const body = base64UrlEncode(payload);
  return `${header}.${body}.signature`;
}

const VALID_UUID = 'a1b2c3d4-e5f6-4789-9abc-1234567890ab';

/** Única clave de sessionStorage permitida: refresh token de sesión (compromiso local SPA). */
const SESSION_REFRESH_KEY = 'gestio_session_refresh_token';

/** Serializa todo el contenido de un Storage para aserciones de "no contiene X". */
function dumpStorage(storage: Storage): string {
  const entries: Record<string, string | null> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)!;
    entries[key] = storage.getItem(key);
  }
  return JSON.stringify(entries);
}

async function waitUntil(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitUntil: timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

function basePayload(overrides: Record<string, unknown> = {}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    sub: 'keycloak-sub-1',
    idUsuario: VALID_UUID,
    email: 'docente@uco.edu.co',
    given_name: 'Ana',
    family_name: 'Gómez',
    exp: nowSeconds + 3600,
    iat: nowSeconds,
    resource_access: {
      'asistencias-api': { roles: ['DOCENTE'] },
    },
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let routerSpy: jasmine.SpyObj<Router>;
  let navigatorSpy: jasmine.SpyObj<BrowserNavigator>;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    navigatorSpy = jasmine.createSpyObj<BrowserNavigator>('BrowserNavigator', ['assign']);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: BrowserNavigator, useValue: navigatorSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    service.setMockMode(false);
    fetchSpy = spyOn(window, 'fetch');
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (window.env) {
      window.env.SECURITY_PROVIDER = 'legacy';
    }
  });

  function mockTokenResponse(payload: Record<string, unknown>, refreshToken = 'refresh-1') {
    fetchSpy.and.resolveTo({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: makeJwt(payload),
          refresh_token: refreshToken,
        }),
    } as Response);
  }

  describe('mapeo de roles institucionales', () => {
    it('acepta un rol presente en resource_access["asistencias-api"].roles', async () => {
      mockTokenResponse(basePayload({ resource_access: { 'asistencias-api': { roles: ['DOCENTE'] } } }));

      const user = await service.loginWithCredentials('docente@uco.edu.co', 'pass');

      expect(user.role).toBe('DOCENTE');
    });

    it('rechaza un rol presente solo en realm_access', async () => {
      mockTokenResponse(
        basePayload({
          resource_access: { 'asistencias-api': { roles: [] } },
          realm_access: { roles: ['DOCENTE'] },
        })
      );

      await expectAsync(
        service.loginWithCredentials('docente@uco.edu.co', 'pass')
      ).toBeRejected();
    });

    it('rechaza un rol presente solo en el client del frontend (asistencias-uco-frontend)', async () => {
      mockTokenResponse(
        basePayload({
          resource_access: {
            'asistencias-api': { roles: [] },
            'asistencias-uco-frontend': { roles: ['DOCENTE'] },
          },
        })
      );

      await expectAsync(
        service.loginWithCredentials('docente@uco.edu.co', 'pass')
      ).toBeRejected();
    });

    it('ignora un rol técnico desconocido y rechaza la sesión si no hay otro válido', async () => {
      mockTokenResponse(
        basePayload({ resource_access: { 'asistencias-api': { roles: ['ROL_DESCONOCIDO'] } } })
      );

      await expectAsync(
        service.loginWithCredentials('docente@uco.edu.co', 'pass')
      ).toBeRejected();
    });

    it('nunca cae por defecto en DOCENTE cuando no hay rol institucional válido', async () => {
      mockTokenResponse(basePayload({ resource_access: { 'asistencias-api': { roles: [] } } }));

      await expectAsync(
        service.loginWithCredentials('docente@uco.edu.co', 'pass')
      ).toBeRejected();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('validación de idUsuario', () => {
    it('acepta un idUsuario UUID válido', async () => {
      mockTokenResponse(basePayload({ idUsuario: VALID_UUID }));

      const user = await service.loginWithCredentials('docente@uco.edu.co', 'pass');

      expect(user.id).toBe(VALID_UUID);
    });

    it('rechaza la sesión si idUsuario está ausente', async () => {
      const payload = basePayload();
      delete (payload as Record<string, unknown>)['idUsuario'];
      mockTokenResponse(payload);

      await expectAsync(
        service.loginWithCredentials('docente@uco.edu.co', 'pass')
      ).toBeRejected();
    });

    it('rechaza la sesión si idUsuario no es un UUID válido', async () => {
      mockTokenResponse(basePayload({ idUsuario: 'user-default' }));

      await expectAsync(
        service.loginWithCredentials('docente@uco.edu.co', 'pass')
      ).toBeRejected();
    });

    it('no usa sub como sustituto de idUsuario', async () => {
      mockTokenResponse(basePayload({ idUsuario: undefined, sub: 'keycloak-sub-only' }));

      await expectAsync(
        service.loginWithCredentials('docente@uco.edu.co', 'pass')
      ).toBeRejected();
    });
  });

  describe('refresh de token', () => {
    it('refreshAccessToken exitoso guarda el nuevo access token en memoria y no en localStorage', async () => {
      mockTokenResponse(basePayload(), 'refresh-new');

      const result = await service.refreshAccessToken('refresh-old');

      expect(result).toBeTrue();
      expect(service.token()).toBeTruthy();
      expect(localStorage.getItem('gestio_refresh_token')).toBeNull();
      expect(localStorage.getItem('gestio_access_token')).toBeNull();
    });

    it('refreshAccessToken fallido (HTTP no ok) devuelve false', async () => {
      fetchSpy.and.resolveTo({ ok: false, json: () => Promise.resolve({}) } as Response);

      const result = await service.refreshAccessToken('refresh-old');

      expect(result).toBeFalse();
    });

    it('refreshAccessToken sin refresh token disponible devuelve false sin llamar a fetch', async () => {
      const result = await service.refreshAccessToken();

      expect(result).toBeFalse();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('getValidAccessToken', () => {
    it('en modo mock siempre devuelve null', async () => {
      service.setMockMode(true);

      const token = await service.getValidAccessToken();

      expect(token).toBeNull();
    });

    it('sin sesión iniciada devuelve null', async () => {
      const token = await service.getValidAccessToken();

      expect(token).toBeNull();
    });

    it('con token vigente lo devuelve sin refrescar', async () => {
      mockTokenResponse(basePayload());
      await service.loginWithCredentials('docente@uco.edu.co', 'pass');
      fetchSpy.calls.reset();

      const token = await service.getValidAccessToken(30);

      expect(token).toBeTruthy();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('con token próximo a expirar intenta refrescarlo', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      mockTokenResponse(basePayload({ exp: nowSeconds + 10 }));
      await service.loginWithCredentials('docente@uco.edu.co', 'pass');

      mockTokenResponse(basePayload({ exp: nowSeconds + 3600 }));
      const token = await service.getValidAccessToken(30);

      expect(token).toBeTruthy();
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  describe('modo baseline (Authorization Code + PKCE, sin refresh token en JavaScript)', () => {
    const PDP = 'http://baseline.test';
    const ISSUER = 'http://idp.test/realms/security-baseline';

    beforeEach(() => {
      window.env = {
        ...(window.env || {}),
        SECURITY_PROVIDER: 'baseline',
        SECURITY_BASELINE_URL: PDP,
        SECURITY_BASELINE_ISSUER_URL: ISSUER,
        SECURITY_BASELINE_CLIENT_ID: 'asistencias-uco-spa',
      };
      window.history.replaceState({}, '', '/');
    });

    afterEach(() => {
      window.history.replaceState({}, '', '/');
    });

    function pendingLogin(returnUrl = '/app/docente/grupos'): string {
      const state = 'state-123';
      savePending({ state, verifier: 'verifier-abc', returnUrl, silent: true, createdAt: Date.now() });
      return state;
    }

    type IdentityReply = { status: number; datos?: unknown; invalidJson?: boolean } | 'network-error';

    const IDENTITY_OK: IdentityReply = { status: 200, datos: { idUsuario: VALID_UUID, roles: ['DOCENTE'] } };

    /** Token endpoint del IdP y `GET /auth/me` del backend, resueltos por URL. */
    function tokenEndpointResponse(payload: Record<string, unknown>, identity: IdentityReply = IDENTITY_OK) {
      fetchSpy.and.callFake((url: string) => {
        if (url.endsWith('/auth/me')) {
          if (identity === 'network-error') {
            return Promise.reject(new TypeError('Failed to fetch'));
          }
          return Promise.resolve({
            ok: identity.status >= 200 && identity.status < 300,
            status: identity.status,
            json: () =>
              identity.invalidJson
                ? Promise.reject(new SyntaxError('Unexpected token'))
                : Promise.resolve({ exitoso: true, datos: identity.datos }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: makeJwt(payload),
              token_type: 'Bearer',
              // El IdP podría devolverlos: la SPA debe descartarlos.
              refresh_token: 'refresh-que-no-debe-guardarse',
              id_token: 'id-token-que-no-debe-guardarse',
            }),
        } as Response);
      });
    }

    async function completeCallback(): Promise<boolean> {
      const state = pendingLogin();
      window.history.replaceState({}, '', `/login?code=code-1&state=${state}`);
      return service.initKeycloak();
    }

    it('callback válido: intercambia el código con PKCE y deja el access token solo en memoria', async () => {
      const state = pendingLogin();
      window.history.replaceState({}, '', `/login?code=code-1&state=${state}`);
      tokenEndpointResponse(basePayload());

      const restored = await service.initKeycloak();

      expect(restored).toBeTrue();
      expect(service.currentUser()?.role).toBe('DOCENTE');
      expect(service.currentUser()?.id).toBe(VALID_UUID);
      expect(service.isAuthenticated()).toBeTrue();
      const [url, init] = fetchSpy.calls.first().args as [string, RequestInit];
      expect(url).toBe(`${ISSUER}/protocol/openid-connect/token`);
      expect(init.credentials).toBe('omit');
      const body = new URLSearchParams(String(init.body));
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code_verifier')).toBe('verifier-abc');
      expect(body.has('client_secret')).toBeFalse();
      expect(body.has('password')).toBeFalse();
      const persisted = dumpStorage(localStorage) + dumpStorage(sessionStorage);
      expect(persisted).not.toContain('refresh-que-no-debe-guardarse');
      expect(persisted).not.toContain('id-token-que-no-debe-guardarse');
      expect(persisted).not.toContain(service.token()!);
      expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBeNull();
      expect(window.location.search).toBe('');
      expect(window.location.pathname).toBe('/app/docente/grupos');
    });

    it('callback válido con el perfil habilitado: el nombre visible sale del perfil de la DB, porque el JWT no trae claims de nombre', async () => {
      const features = environment.features as { userProfileEndpointEnabled: boolean };
      const flagOriginal = features.userProfileEndpointEnabled;
      features.userProfileEndpointEnabled = true;
      try {
        const payload = basePayload();
        for (const claim of ['given_name', 'family_name', 'name', 'preferred_username']) {
          delete (payload as Record<string, unknown>)[claim];
        }
        fetchSpy.and.callFake(((url: string) => {
          if (url.endsWith('/usuarios/perfil')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () =>
                Promise.resolve({ datos: { primerNombre: 'Sergio', primerApellido: 'Test', nombreCompleto: 'Sergio Test' } }),
            } as Response);
          }
          if (url.endsWith('/auth/me')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ exitoso: true, datos: { idUsuario: VALID_UUID, roles: ['ESTUDIANTE'] } }),
            } as Response);
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: makeJwt(payload), token_type: 'Bearer' }),
          } as Response);
        }) as typeof fetch);

        expect(await completeCallback()).toBeTrue();
        await new Promise((resolve) => setTimeout(resolve));

        expect(service.currentUser()?.name).toBe('Sergio Test');
        const llamadas = fetchSpy.calls.allArgs().map((args) => String(args[0]));
        expect(llamadas.some((u) => u.endsWith('/usuarios/perfil'))).toBeTrue();
      } finally {
        features.userProfileEndpointEnabled = flagOriginal;
      }
    });

    it('callback válido con el perfil apagado: no consulta /usuarios/perfil', async () => {
      const features = environment.features as { userProfileEndpointEnabled: boolean };
      const flagOriginal = features.userProfileEndpointEnabled;
      features.userProfileEndpointEnabled = false;
      try {
        tokenEndpointResponse(basePayload());

        expect(await completeCallback()).toBeTrue();
        await new Promise((resolve) => setTimeout(resolve));

        const llamadas = fetchSpy.calls.allArgs().map((args) => String(args[0]));
        expect(llamadas.some((u) => u.endsWith('/usuarios/perfil'))).toBeFalse();
      } finally {
        features.userProfileEndpointEnabled = flagOriginal;
      }
    });

    it('state que no coincide: rechaza sin intercambiar el código', async () => {
      pendingLogin();
      window.history.replaceState({}, '', '/login?code=code-1&state=otro-state');

      expect(await service.initKeycloak()).toBeFalse();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(service.token()).toBeNull();
      expect(service.authError()).toBeTruthy();
    });

    it('callback sin estado PKCE pendiente (p. ej. enlace forjado) no autentica', async () => {
      window.history.replaceState({}, '', '/login?code=code-1&state=cualquiera');

      expect(await service.initKeycloak()).toBeFalse();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('login_required: no hay sesión SSO, el usuario ve el login sin error', async () => {
      pendingLogin();
      window.history.replaceState({}, '', '/login?error=login_required&state=state-123');

      expect(await service.initKeycloak()).toBeFalse();
      expect(service.authError()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(window.location.search).toBe('');
    });

    it('primera vinculación: sin claim idUsuario en el JWT el UUID institucional lo entrega el backend', async () => {
      const payload = basePayload();
      delete (payload as Record<string, unknown>)['idUsuario'];
      tokenEndpointResponse(payload);

      expect(await completeCallback()).toBeTrue();

      expect(service.currentUser()?.id).toBe(VALID_UUID);
      expect(service.currentUser()?.role).toBe('DOCENTE');
      const identityCall = fetchSpy.calls.mostRecent().args as [string, RequestInit];
      expect(identityCall[0]).toBe(`${environment.apiUrl}/auth/me`);
      expect(identityCall[1].credentials).toBe('omit');
      expect((identityCall[1].headers as Record<string, string>)['Authorization']).toBe(`Bearer ${service.token()}`);
      expect(identityCall[1].method).toBeUndefined();
      expect(identityCall[1].body).toBeUndefined();
      expect(identityCall[0]).not.toContain(VALID_UUID);
      expect(identityCall[0]).not.toContain('docente@uco.edu.co');
    });

    it('un claim idUsuario del token nunca sustituye al UUID que resuelve el backend', async () => {
      const otroUuid = 'ffffffff-e5f6-4789-9abc-1234567890ab';
      tokenEndpointResponse(basePayload({ idUsuario: otroUuid }));

      expect(await completeCallback()).toBeTrue();

      expect(service.currentUser()?.id).toBe(VALID_UUID);
    });

    it('rol efectivo y UUID salen del backend aunque el token traiga otros roles', async () => {
      tokenEndpointResponse(
        basePayload({ resource_access: { 'asistencias-api': { roles: ['ADMINISTRADOR'] } } }),
        { status: 200, datos: { idUsuario: VALID_UUID, roles: ['ESTUDIANTE'] } }
      );

      expect(await completeCallback()).toBeTrue();

      expect(service.currentUser()?.role).toBe('ESTUDIANTE');
      expect(service.currentUser()?.roles).toEqual(['ESTUDIANTE']);
    });

    it('varios roles efectivos: rol principal por jerarquía y todos conservados', async () => {
      tokenEndpointResponse(basePayload(), {
        status: 200,
        datos: { idUsuario: VALID_UUID, roles: ['ESTUDIANTE', 'COORDINADOR', 'DOCENTE', 'ROL_AJENO'] },
      });

      expect(await completeCallback()).toBeTrue();

      expect(service.currentUser()?.role).toBe('COORDINADOR');
      expect(service.currentUser()?.roles).toEqual(['COORDINADOR', 'DOCENTE', 'ESTUDIANTE']);
    });

    it('el backend rechaza la identidad (401/403): no hay sesión y se informa cuenta sin acceso', async () => {
      for (const status of [401, 403]) {
        tokenEndpointResponse(basePayload(), { status });

        expect(await completeCallback()).toBeFalse();
        expect(service.token()).toBeNull();
        expect(service.currentUser()).toBeNull();
        expect(service.authError()).toContain(status === 401 ? '(401)' : '(403)');
        expect(dumpStorage(localStorage) + dumpStorage(sessionStorage)).not.toContain('eyJ');
      }
    });

    it('respuesta de identidad sin roles, con UUID inválido o malformada no inicia sesión', async () => {
      const respuestas: IdentityReply[] = [
        { status: 200, datos: { idUsuario: VALID_UUID, roles: [] } },
        { status: 200, datos: { idUsuario: VALID_UUID, roles: ['ROL_AJENO'] } },
        { status: 200, datos: { idUsuario: 'no-es-uuid', roles: ['DOCENTE'] } },
        { status: 200, datos: { roles: ['DOCENTE'] } },
        { status: 200, datos: { idUsuario: VALID_UUID, roles: 'DOCENTE' } },
        { status: 200 },
        { status: 200, invalidJson: true },
      ];
      for (const respuesta of respuestas) {
        tokenEndpointResponse(basePayload(), respuesta);

        expect(await completeCallback()).toBeFalse();
        expect(service.token()).toBeNull();
        expect(service.currentUser()).toBeNull();
        expect(service.authError()).toContain('rol o identidad');
      }
    });

    it('backend o red no disponibles (5xx / error de red): sin sesión y mensaje de conectividad', async () => {
      for (const reply of [{ status: 503 }, 'network-error'] as IdentityReply[]) {
        tokenEndpointResponse(basePayload(), reply);

        expect(await completeCallback()).toBeFalse();
        expect(service.token()).toBeNull();
        expect(service.currentUser()).toBeNull();
        expect(service.authError()).toContain('conexión');
      }
    });

    it('restauración tras F5: el callback silencioso reconstruye usuario y roles desde el backend', async () => {
      const payload = basePayload();
      delete (payload as Record<string, unknown>)['idUsuario'];
      tokenEndpointResponse(payload, {
        status: 200,
        datos: { idUsuario: VALID_UUID, roles: ['DOCENTE', 'ESTUDIANTE'] },
      });
      savePending({
        state: 'state-f5',
        verifier: 'verifier-f5',
        returnUrl: '/app/docente/grupos',
        silent: true,
        createdAt: Date.now(),
      });
      window.history.replaceState({}, '', '/app/docente/grupos?code=code-f5&state=state-f5');

      expect(await service.initKeycloak()).toBeTrue();

      expect(service.currentUser()?.id).toBe(VALID_UUID);
      expect(service.currentUser()?.roles).toEqual(['DOCENTE', 'ESTUDIANTE']);
      expect(window.location.pathname).toBe('/app/docente/grupos');
      expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBeNull();
    });

    it('token con payload ilegible no consulta al backend', async () => {
      fetchSpy.and.callFake(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: 'no-es-un-jwt', refresh_token: 'x' }),
        } as Response)
      );

      expect(await completeCallback()).toBeFalse();

      expect(fetchSpy.calls.allArgs().some(([url]) => String(url).endsWith('/auth/me'))).toBeFalse();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('callback con /auth/me detenido agota el tiempo, limpia credenciales y deja el login reintentable', fakeAsync(() => {
      const state = pendingLogin();
      window.history.replaceState({}, '', '/login?code=code-timeout&state=' + state);
      let identitySignal: AbortSignal | undefined;
      fetchSpy.and.callFake((url: string, init?: RequestInit) => {
        if (url.endsWith('/auth/me')) {
          identitySignal = init?.signal as AbortSignal | undefined;
          return new Promise<Response>(() => undefined);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            access_token: makeJwt(basePayload()),
            token_type: 'Bearer',
          }),
        } as Response);
      });
      let initialized: boolean | undefined;
      void service.initKeycloak().then((result) => (initialized = result));

      flushMicrotasks();
      tick(BASELINE_HTTP_TIMEOUT_MS);
      flushMicrotasks();

      expect(initialized).toBeFalse();
      expect(identitySignal?.aborted).toBeTrue();
      expect(service.token()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(service.authError()).toContain('conexión');
      expect(loadPending()).toBeNull();
      expect(window.location.pathname).toBe('/login');
      expect(window.location.search).toBe('');
      expect(dumpStorage(localStorage) + dumpStorage(sessionStorage)).not.toContain('eyJ');
    }));
    it('sin callback inicia una re-autenticación silenciosa (prompt=none, S256) sin bloquear el arranque', async () => {
      window.history.replaceState({}, '', '/app/docente/grupos');
      expect(await service.initKeycloak()).toBeFalse();
      const target = new URL(navigatorSpy.assign.calls.mostRecent().args[0]);
      expect(target.origin + target.pathname).toBe(`${ISSUER.replace('/realms/security-baseline', '')}/realms/security-baseline/protocol/openid-connect/auth`);
      expect(target.searchParams.get('prompt')).toBe('none');
      expect(target.searchParams.get('code_challenge_method')).toBe('S256');
      expect(target.searchParams.get('response_type')).toBe('code');
      expect(target.searchParams.get('client_id')).toBe('asistencias-uco-spa');
      expect(target.searchParams.has('client_secret')).toBeFalse();
      const pending = loadPending();
      expect(pending?.returnUrl).toBe('/app/docente/grupos');
      expect(pending?.state).toBe(target.searchParams.get('state') ?? undefined);

    });

    it('B2-F-22 NB-8: el login interactivo no envia al IdP la URL de retorno del QR ni su token', () => {
      guardarRetornoQr('/app/asistencia/qr?t=TOKEN-SECRETO');
      window.history.replaceState({}, '', '/login');

      service.startBaselineLogin();

      const enviado = navigatorSpy.assign.calls.mostRecent().args[0] as string;
      expect(enviado).not.toContain('TOKEN-SECRETO');
      expect(decodeURIComponent(enviado)).not.toContain('asistencia/qr');
      sessionStorage.removeItem(QR_RETORNO_STORAGE_KEY);
    });

    it('B2-F-22 NB-8: tras el login vuelve a la URL del QR con ?t= y borra la clave', async () => {
      guardarRetornoQr('/app/asistencia/qr?t=TOKEN-SECRETO');
      const state = 'state-nb8';
      savePending({ state, verifier: 'verifier-abc', returnUrl: '/', silent: false, createdAt: Date.now() });
      window.history.replaceState({}, '', `/login?code=code-1&state=${state}`);
      tokenEndpointResponse(basePayload());

      expect(await service.initKeycloak()).toBeTrue();

      expect(window.location.pathname + window.location.search).toBe('/app/asistencia/qr?t=TOKEN-SECRETO');
      expect(sessionStorage.getItem(QR_RETORNO_STORAGE_KEY)).toBeNull();
    });

    it('HU176B: en una ruta publica (QR de matrícula, verificación de correo) no redirige al IdP y deja ver la página', async () => {
      for (const ruta of ['/matricula/qr?t=ABC', '/matricula/pin', '/verificar-correo']) {
        navigatorSpy.assign.calls.reset();
        window.history.replaceState({}, '', ruta);

        expect(await service.initKeycloak()).toBeFalse();

        expect(navigatorSpy.assign).not.toHaveBeenCalled();
        expect(window.location.pathname + window.location.search).toBe(ruta);
        expect(loadPending()).toBeNull();
        expect(service.isAuthenticated()).toBeFalse();
      }
    });

    it('HU176B: una ruta que solo se parece a una pública (p. ej. /app/matricula/x) sigue usando la re-autenticación silenciosa', async () => {
      window.history.replaceState({}, '', '/app/matricula/x');

      expect(await service.initKeycloak()).toBeFalse();

      expect(new URL(navigatorSpy.assign.calls.mostRecent().args[0]).searchParams.get('prompt')).toBe('none');
    });

    it('un intento silencioso reciente no vuelve a redirigir (evita bucles)', async () => {
      pendingLogin();

      expect(await service.initKeycloak()).toBeFalse();
      expect(navigatorSpy.assign).not.toHaveBeenCalled();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('un currentUser obsoleto no mantiene la sesión: solo un access token en memoria autentica', () => {
      service.currentUser.set({ id: VALID_UUID, name: 'Ana', email: 'ana@uco.edu.co', role: 'DOCENTE' } as never);
      service.token.set(null);

      expect(service.isAuthenticated()).toBeFalse();
    });

    it('access token por expirar: re-autenticación silenciosa y devuelve null (nunca refresh token)', async () => {
      service.token.set(makeJwt(basePayload({ exp: Math.floor(Date.now() / 1000) + 5 })));
      window.history.replaceState({}, '', '/app/docente/grupos');

      expect(await service.getValidAccessToken(30)).toBeNull();
      await waitUntil(() => navigatorSpy.assign.calls.count() === 1);
      expect(new URL(navigatorSpy.assign.calls.mostRecent().args[0]).searchParams.get('prompt')).toBe('none');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(await service.refreshAccessToken('cualquiera')).toBeFalse();
    });

    it('login interactivo: delega en el BFF del PDP con return_to a la SPA y limpia PKCE abandonado', () => {
      pendingLogin();
      service.startBaselineLogin('/app/docente/grupos');

      expect(loadPending()).toBeNull();

      const target = new URL(navigatorSpy.assign.calls.mostRecent().args[0]);
      expect(target.origin).toBe(PDP);
      expect(target.pathname).toBe('/oauth2/authorization/keycloak');
      const returnTo = new URL(target.searchParams.get('return_to')!);
      expect(returnTo.origin).toBe(window.location.origin);
      expect(returnTo.pathname).toBe('/login');
      expect(returnTo.searchParams.get('returnUrl')).toBe('/app/docente/grupos');
      expect(target.search).not.toContain('password');
    });

    it('returnUrl externo o con esquema se descarta (sin redirecciones abiertas)', () => {
      for (const malicious of ['https://evil.example/x', '//evil.example', '/\\evil.example']) {
        service.startBaselineLogin(malicious);
        const target = new URL(navigatorSpy.assign.calls.mostRecent().args[0]);
        const returnTo = new URL(target.searchParams.get('return_to')!);
        expect(returnTo.searchParams.get('returnUrl')).toBe('/');
      }
    });

    it('loginWithCredentials nunca usa password grant en baseline', async () => {
      await expectAsync(service.loginWithCredentials('a@uco.edu.co', 'secreto')).toBeRejected();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(navigatorSpy.assign).toHaveBeenCalledTimes(1);
    });

    it('logout cierra la sesión BFF del PDP y limpia la memoria', async () => {
      service.token.set(makeJwt(basePayload()));
      service.currentUser.set({ id: VALID_UUID, name: 'Ana', email: 'ana@uco.edu.co', role: 'DOCENTE' } as never);

      await service.logout();

      expect(service.token()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(navigatorSpy.assign).toHaveBeenCalledWith(`${PDP}/api/v1/session/logout`);
    });
  });

  describe('SECURITY_PROVIDER inválido (fail-closed, nunca legacy silencioso)', () => {
    it('queda sin autenticación y rechaza el login', async () => {
      window.env = { ...(window.env || {}), SECURITY_PROVIDER: 'baselin' };

      expect(service.securityConfigError()).toContain('SECURITY_PROVIDER');
      expect(await service.initKeycloak()).toBeFalse();
      await expectAsync(service.loginWithCredentials('a@uco.edu.co', 'secreto')).toBeRejected();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('un valor ausente o vacío equivale al legacy explícito por defecto', () => {
      window.env = { ...(window.env || {}), SECURITY_PROVIDER: '' };
      expect(environment.security.provider).toBe('legacy');
    });

    it('el proveedor no se puede elegir desde localStorage', () => {
      window.env = { ...(window.env || {}), SECURITY_PROVIDER: 'legacy' };
      localStorage.setItem('SECURITY_PROVIDER', 'baseline');
      expect(environment.security.provider).toBe('legacy');
    });
  });

  describe('modo mock', () => {
    it('no rompe: initKeycloak inicia sesión con un usuario mock', async () => {
      service.setMockMode(true);

      const result = await service.initKeycloak();

      expect(result).toBeTrue();
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.currentUser()?.role).toBeTruthy();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('loginWithCredentials en modo mock no llama a fetch', async () => {
      service.setMockMode(true);

      const user = await service.loginWithCredentials('DOCENTE', 'cualquiera');

      expect(user).toBeTruthy();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('loginWithCredentials maneja error OAuth2 "invalid_grant" devolviendo mensaje amigable institucional', async () => {
      fetchSpy.and.resolveTo({
        ok: false,
        json: () => Promise.resolve({ error: 'invalid_grant', error_description: 'Cualquier texto volátil en inglés o español' }),
      } as Response);

      await expectAsync(
        service.loginWithCredentials('docente@uco.edu.co', 'wrong-pass')
      ).toBeRejectedWithError('Credenciales inválidas. Verifica tu usuario y contraseña institucional.');
    });

    it('loginWithCredentials maneja error OAuth2 genérico devolviendo mensaje de contingencia', async () => {
      fetchSpy.and.resolveTo({
        ok: false,
        json: () => Promise.resolve({ error: 'server_error' }),
      } as Response);

      await expectAsync(
        service.loginWithCredentials('docente@uco.edu.co', 'pass')
      ).toBeRejectedWithError('Usuario o contraseña incorrectos.');
    });

    it('setMockMode persiste la preferencia en localStorage', () => {
      service.setMockMode(true);
      expect(localStorage.getItem('USE_MOCKS')).toBe('true');

      service.setMockMode(false);
      expect(localStorage.getItem('USE_MOCKS')).toBe('false');
    });
  });

  describe('initKeycloak (gestión de sesión segura en memoria)', () => {
    it('sin token en memoria devuelve false', async () => {
      const result = await service.initKeycloak();
      expect(result).toBeFalse();
    });

    it('con token vigente en memoria mantiene la sesión', async () => {
      mockTokenResponse(basePayload());
      await service.loginWithCredentials('docente@uco.edu.co', 'pass');

      const result = await service.initKeycloak();

      expect(result).toBeTrue();
      expect(service.currentUser()?.name).toBe('Ana Gómez');
    });

    it('no lee ni restaura tokens desde localStorage (seguridad OWASP/AGENTS.md)', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const payload = basePayload({ exp: nowSeconds + 3600 });
      localStorage.setItem('gestio_access_token', makeJwt(payload));

      const result = await service.initKeycloak();

      expect(result).toBeFalse();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('purga credenciales legacy residuales de versiones anteriores', () => {
      localStorage.setItem('gestio_access_token', 'legacy-token');
      localStorage.setItem('gestio_refresh_token', 'legacy-refresh');
      localStorage.setItem('gestio_current_user', '{"id":"123"}');

      service.clearSession();

      expect(localStorage.getItem('gestio_access_token')).toBeNull();
      expect(localStorage.getItem('gestio_refresh_token')).toBeNull();
      expect(localStorage.getItem('gestio_current_user')).toBeNull();
    });
  });

  describe('sesión restaurable tras F5 (MV001-A01)', () => {
    function tokenEndpointCalls(): [string, RequestInit][] {
      return (fetchSpy.calls.allArgs() as [string, RequestInit][]).filter(([url]) =>
        String(url).includes('/protocol/openid-connect/token')
      );
    }

    /** Simula F5: Angular se reconstruye (signals nuevos) pero sessionStorage sobrevive. */
    function simulateReload(): AuthService {
      TestBed.resetTestingModule();
      routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
      TestBed.configureTestingModule({
        providers: [{ provide: Router, useValue: routerSpy }],
      });
      const reloaded = TestBed.inject(AuthService);
      reloaded.setMockMode(false);
      return reloaded;
    }

    describe('login', () => {
      it('A. guarda el refresh token en sessionStorage y nunca el access token', async () => {
        mockTokenResponse(basePayload(), 'refresh-login');

        await service.loginWithCredentials('docente@uco.edu.co', 'secret-pass');

        const accessToken = service.token()!;
        expect(accessToken).toBeTruthy();
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBe('refresh-login');
        expect(sessionStorage.length).toBe(1);
        expect(dumpStorage(sessionStorage)).not.toContain(accessToken);
        expect(dumpStorage(localStorage)).not.toContain(accessToken);
        expect(dumpStorage(localStorage)).not.toContain('refresh-login');
      });

      it('no persiste password ni usuario actual en ningún storage', async () => {
        mockTokenResponse(basePayload(), 'refresh-login');

        await service.loginWithCredentials('docente@uco.edu.co', 'secret-pass');

        for (const storage of [sessionStorage, localStorage]) {
          expect(dumpStorage(storage)).not.toContain('secret-pass');
          expect(dumpStorage(storage)).not.toContain('Ana');
          expect(dumpStorage(storage)).not.toContain(VALID_UUID);
        }
      });

      it('si Keycloak no devuelve refresh token, no fabrica uno', async () => {
        fetchSpy.and.resolveTo({
          ok: true,
          json: () => Promise.resolve({ access_token: makeJwt(basePayload()) }),
        } as Response);

        await service.loginWithCredentials('docente@uco.edu.co', 'pass');

        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBeNull();
      });

      it('un login sin refresh token descarta el refresh token residual de otra sesión', async () => {
        sessionStorage.setItem(SESSION_REFRESH_KEY, 'refresh-de-otro-usuario');
        fetchSpy.and.resolveTo({
          ok: true,
          json: () => Promise.resolve({ access_token: makeJwt(basePayload()) }),
        } as Response);

        await service.loginWithCredentials('docente@uco.edu.co', 'pass');

        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBeNull();
      });
    });

    describe('initKeycloak tras F5', () => {
      it('B. restaura la sesión con el refresh token de sessionStorage', async () => {
        mockTokenResponse(basePayload(), 'refresh-1');
        await service.loginWithCredentials('docente@uco.edu.co', 'pass');

        const reloaded = simulateReload();
        expect(reloaded.token()).toBeNull();
        expect(reloaded.currentUser()).toBeNull();

        fetchSpy.calls.reset();
        mockTokenResponse(basePayload(), 'refresh-1');
        const restored = await reloaded.initKeycloak();

        expect(restored).toBeTrue();
        expect(reloaded.isAuthenticated()).toBeTrue();
        expect(reloaded.token()).toBeTruthy();
        expect(reloaded.currentUser()?.role).toBe('DOCENTE');
        expect(reloaded.currentUser()?.id).toBe(VALID_UUID);

        const calls = tokenEndpointCalls();
        expect(calls.length).toBe(1);
        const body = String(calls[0][1].body);
        expect(body).toContain('grant_type=refresh_token');
        expect(body).toContain('refresh_token=refresh-1');
      });

      it('no navega manualmente: deja que el guard resuelva la ruta', async () => {
        sessionStorage.setItem(SESSION_REFRESH_KEY, 'refresh-1');
        const reloaded = simulateReload();
        mockTokenResponse(basePayload(), 'refresh-1');

        await reloaded.initKeycloak();

        expect(routerSpy.navigate).not.toHaveBeenCalled();
      });

      it('con access token vigente en memoria no llama al refresh', async () => {
        mockTokenResponse(basePayload(), 'refresh-1');
        await service.loginWithCredentials('docente@uco.edu.co', 'pass');
        fetchSpy.calls.reset();

        const result = await service.initKeycloak();

        expect(result).toBeTrue();
        expect(tokenEndpointCalls().length).toBe(0);
      });

      it('C. refresh token inválido: devuelve false, limpia sessionStorage y memoria', async () => {
        sessionStorage.setItem(SESSION_REFRESH_KEY, 'refresh-revocado');
        const reloaded = simulateReload();
        fetchSpy.and.resolveTo({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'invalid_grant' }),
        } as Response);

        const restored = await reloaded.initKeycloak();

        expect(restored).toBeFalse();
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBeNull();
        expect(reloaded.token()).toBeNull();
        expect(reloaded.currentUser()).toBeNull();
        fetchSpy.calls.reset();
        expect(await reloaded.refreshAccessToken()).toBeFalse();
        expect(fetchSpy).not.toHaveBeenCalled();
      });

      it('un fallo de red al restaurar devuelve false y no deja credenciales residuales', async () => {
        sessionStorage.setItem(SESSION_REFRESH_KEY, 'refresh-1');
        const reloaded = simulateReload();
        fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));

        const restored = await reloaded.initKeycloak();

        expect(restored).toBeFalse();
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBeNull();
      });

      it('un refresh cuyo JWT no trae rol institucional válido falla y limpia', async () => {
        sessionStorage.setItem(SESSION_REFRESH_KEY, 'refresh-1');
        const reloaded = simulateReload();
        mockTokenResponse(
          basePayload({ resource_access: { 'asistencias-api': { roles: [] } } }),
          'refresh-2'
        );

        const restored = await reloaded.initKeycloak();

        expect(restored).toBeFalse();
        expect(reloaded.isAuthenticated()).toBeFalse();
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBeNull();
      });

      it('sin access token ni refresh token devuelve false sin llamar a Keycloak', async () => {
        const result = await service.initKeycloak();

        expect(result).toBeFalse();
        expect(fetchSpy).not.toHaveBeenCalled();
      });

      it('nunca restaura un access token desde sessionStorage', async () => {
        const nowSeconds = Math.floor(Date.now() / 1000);
        sessionStorage.setItem('gestio_access_token', makeJwt(basePayload({ exp: nowSeconds + 3600 })));
        const reloaded = simulateReload();

        const restored = await reloaded.initKeycloak();

        expect(restored).toBeFalse();
        expect(reloaded.isAuthenticated()).toBeFalse();
      });

      it('con sessionStorage no disponible (getItem lanza) devuelve false sin romper el arranque', async () => {
        const original = Storage.prototype.getItem;
        spyOn(Storage.prototype, 'getItem').and.callFake(function (this: Storage, key: string) {
          if (this === sessionStorage) {
            throw new DOMException('denied', 'SecurityError');
          }
          return original.call(this, key);
        });

        await expectAsync(service.initKeycloak()).toBeResolvedTo(false);
      });
    });

    describe('rotación del refresh token', () => {
      it('D. un refresh token rotado sustituye al anterior en sessionStorage', async () => {
        mockTokenResponse(basePayload(), 'refresh-1');
        await service.loginWithCredentials('docente@uco.edu.co', 'pass');

        mockTokenResponse(basePayload(), 'refresh-2');
        const result = await service.refreshAccessToken();

        expect(result).toBeTrue();
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBe('refresh-2');
      });

      it('el siguiente refresh usa el refresh token rotado', async () => {
        mockTokenResponse(basePayload(), 'refresh-1');
        await service.loginWithCredentials('docente@uco.edu.co', 'pass');
        mockTokenResponse(basePayload(), 'refresh-2');
        await service.refreshAccessToken();
        fetchSpy.calls.reset();
        mockTokenResponse(basePayload(), 'refresh-3');

        await service.refreshAccessToken();

        expect(String(tokenEndpointCalls()[0][1].body)).toContain('refresh_token=refresh-2');
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBe('refresh-3');
      });

      it('si Keycloak no rota, conserva el refresh token vigente en sessionStorage', async () => {
        mockTokenResponse(basePayload(), 'refresh-1');
        await service.loginWithCredentials('docente@uco.edu.co', 'pass');
        fetchSpy.and.resolveTo({
          ok: true,
          json: () => Promise.resolve({ access_token: makeJwt(basePayload()) }),
        } as Response);

        const result = await service.refreshAccessToken();

        expect(result).toBeTrue();
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBe('refresh-1');
      });

      it('la restauración tras F5 también persiste el refresh token rotado', async () => {
        sessionStorage.setItem(SESSION_REFRESH_KEY, 'refresh-1');
        const reloaded = simulateReload();
        mockTokenResponse(basePayload(), 'refresh-2');

        await reloaded.initKeycloak();

        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBe('refresh-2');
      });

      it('un refresh explícito exitoso persiste el token devuelto', async () => {
        mockTokenResponse(basePayload(), 'refresh-new');

        await service.refreshAccessToken('refresh-old');

        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBe('refresh-new');
      });

      it('un refresh fallido no altera el refresh token persistido', async () => {
        mockTokenResponse(basePayload(), 'refresh-1');
        await service.loginWithCredentials('docente@uco.edu.co', 'pass');
        fetchSpy.and.resolveTo({ ok: false, json: () => Promise.resolve({}) } as Response);

        const result = await service.refreshAccessToken();

        expect(result).toBeFalse();
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBe('refresh-1');
      });
    });

    describe('limpieza de credenciales', () => {
      async function loginReal(): Promise<void> {
        mockTokenResponse(basePayload(), 'refresh-1');
        await service.loginWithCredentials('docente@uco.edu.co', 'pass');
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBe('refresh-1');
      }

      async function expectNoRefreshTokenLeft(): Promise<void> {
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBeNull();
        fetchSpy.calls.reset();
        expect(await service.refreshAccessToken()).toBeFalse();
        expect(fetchSpy).not.toHaveBeenCalled();
      }

      it('E. logout limpia sessionStorage y memoria', async () => {
        await loginReal();

        await service.logout();

        expect(service.isAuthenticated()).toBeFalse();
        await expectNoRefreshTokenLeft();
      });

      it('F. notifySessionExpired limpia sessionStorage y memoria', async () => {
        await loginReal();

        service.notifySessionExpired();

        expect(service.isAuthenticated()).toBeFalse();
        await expectNoRefreshTokenLeft();
      });

      it('G. clearSession limpia sessionStorage y memoria', async () => {
        await loginReal();

        service.clearSession();

        await expectNoRefreshTokenLeft();
      });

      it('G2. clearSession con broadcast limpia sessionStorage y memoria', async () => {
        await loginReal();

        service.clearSession(true);

        await expectNoRefreshTokenLeft();
      });

      for (const type of ['LOGOUT', 'SESSION_EXPIRED']) {
        it(`la pestaña receptora de ${type} queda sin refresh token persistido`, async () => {
          await loginReal();
          const otherTab = new BroadcastChannel('uco_auth_bus');

          otherTab.postMessage({ type });
          await waitUntil(() => service.token() === null);
          otherTab.close();

          expect(service.currentUser()).toBeNull();
          await expectNoRefreshTokenLeft();
        });
      }

      it('un mensaje de broadcast ajeno no cierra la sesión ni borra el refresh token', async () => {
        await loginReal();
        const otherTab = new BroadcastChannel('uco_auth_bus');

        otherTab.postMessage({ type: 'OTRO' });
        await new Promise((resolve) => setTimeout(resolve, 50));
        otherTab.close();

        expect(service.isAuthenticated()).toBeTrue();
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBe('refresh-1');
      });

      it('con sessionStorage no disponible el login funciona en memoria y el cierre no lanza', async () => {
        const original = Storage.prototype.setItem;
        spyOn(Storage.prototype, 'setItem').and.callFake(function (this: Storage, k: string, v: string) {
          if (this === sessionStorage) {
            throw new DOMException('quota', 'QuotaExceededError');
          }
          return original.call(this, k, v);
        });
        const originalRemove = Storage.prototype.removeItem;
        spyOn(Storage.prototype, 'removeItem').and.callFake(function (this: Storage, k: string) {
          if (this === sessionStorage) {
            throw new DOMException('denied', 'SecurityError');
          }
          return originalRemove.call(this, k);
        });
        mockTokenResponse(basePayload(), 'refresh-1');

        await service.loginWithCredentials('docente@uco.edu.co', 'pass');
        expect(service.isAuthenticated()).toBeTrue();

        expect(() => service.clearSession()).not.toThrow();
        expect(service.isAuthenticated()).toBeFalse();
      });
    });

    describe('H. JWT fuera de localStorage', () => {
      it('ni login, ni refresh, ni restauración dejan JWT ni refresh token en localStorage', async () => {
        mockTokenResponse(basePayload(), 'refresh-1');
        await service.loginWithCredentials('docente@uco.edu.co', 'pass');
        mockTokenResponse(basePayload(), 'refresh-2');
        await service.refreshAccessToken();
        const reloaded = simulateReload();
        mockTokenResponse(basePayload(), 'refresh-3');
        await reloaded.initKeycloak();

        expect(localStorage.getItem('gestio_access_token')).toBeNull();
        expect(localStorage.getItem('gestio_refresh_token')).toBeNull();
        expect(localStorage.getItem('gestio_current_user')).toBeNull();
        expect(localStorage.getItem(SESSION_REFRESH_KEY)).toBeNull();
        expect(dumpStorage(localStorage)).not.toContain('refresh-');
        expect(dumpStorage(localStorage)).not.toContain(reloaded.token()!);
        expect(dumpStorage(sessionStorage)).not.toContain(reloaded.token()!);
      });

      it('las claves residuales legacy se siguen purgando al arrancar', () => {
        localStorage.setItem('gestio_access_token', 'legacy');
        localStorage.setItem('gestio_refresh_token', 'legacy');
        const reloaded = simulateReload();

        expect(reloaded).toBeTruthy();
        expect(localStorage.getItem('gestio_access_token')).toBeNull();
        expect(localStorage.getItem('gestio_refresh_token')).toBeNull();
      });
    });

    describe('TD-049: GET /usuarios/perfil 501 (OUT_OF_GOLDEN_PATH, NON_BLOCKING)', () => {
      function profileUnavailable(): void {
        fetchSpy.and.callFake(async (input: RequestInfo | URL) => {
          if (String(input).includes('/protocol/openid-connect/token')) {
            return {
              ok: true,
              json: () =>
                Promise.resolve({ access_token: makeJwt(basePayload()), refresh_token: 'refresh-1' }),
            } as Response;
          }
          return {
            ok: false,
            status: 501,
            json: () => Promise.resolve({ code: 'FEATURE_UNAVAILABLE' }),
          } as Response;
        });
      }

      it('el login no se interrumpe y la identidad sale de los claims del JWT', async () => {
        profileUnavailable();

        const user = await service.loginWithCredentials('docente@uco.edu.co', 'pass');

        expect(user.role).toBe('DOCENTE');
        expect(user.name).toBe('Ana Gómez');
        expect(service.isAuthenticated()).toBeTrue();
        expect(sessionStorage.getItem(SESSION_REFRESH_KEY)).toBe('refresh-1');
      });

      it('el login no solicita /usuarios/perfil mientras el endpoint esté deshabilitado', async () => {
        profileUnavailable();

        await service.loginWithCredentials('docente@uco.edu.co', 'pass');

        const urls = fetchSpy.calls.allArgs().map(([input]) => String(input));
        expect(urls.some((url) => url.includes('/usuarios/perfil'))).toBeFalse();
      });

      it('la restauración tras F5 no depende del perfil', async () => {
        sessionStorage.setItem(SESSION_REFRESH_KEY, 'refresh-1');
        const reloaded = simulateReload();
        profileUnavailable();

        const restored = await reloaded.initKeycloak();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(restored).toBeTrue();
        expect(reloaded.isAuthenticated()).toBeTrue();
        expect(reloaded.currentUser()?.role).toBe('DOCENTE');
      });
    });
  });

  describe('navegación por rol', () => {
    it('navega a la ruta correcta para cada rol institucional', () => {
      service.navigateForRole('ADMINISTRADOR');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/admin/decanos']);

      service.navigateForRole('DECANO');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/decano/coordinadores']);

      service.navigateForRole('COORDINADOR');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/docentes']);

      service.navigateForRole('DOCENTE');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/docente/grupos']);

      service.navigateForRole('ESTUDIANTE');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/estudiante/horarios']);
    });
  });

  describe('logout / clearSession', () => {
    it('logout limpia la sesión y navega a /login', async () => {
      service.setMockMode(true);
      await service.loginWithCredentials('DOCENTE', 'x');

      await service.logout();

      expect(service.isAuthenticated()).toBeFalse();
      expect(service.currentUser()).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('clearSession elimina todas las claves de localStorage', () => {
      localStorage.setItem('gestio_access_token', 'x');
      localStorage.setItem('gestio_refresh_token', 'y');
      localStorage.setItem('gestio_current_user', '{}');
      localStorage.setItem('gestio_asistencia_mock_role', 'DOCENTE');

      service.clearSession();

      expect(localStorage.getItem('gestio_access_token')).toBeNull();
      expect(localStorage.getItem('gestio_refresh_token')).toBeNull();
      expect(localStorage.getItem('gestio_current_user')).toBeNull();
      expect(localStorage.getItem('gestio_asistencia_mock_role')).toBeNull();
    });
  });

  describe('login()', () => {
    it('devuelve un ApiResponse informativo con el usuario actual', (done) => {
      service.login().subscribe((res) => {
        expect(res.exitoso).toBeTrue();
        expect(res.datos).toBeNull();
        done();
      });
    });
  });

  describe('perfil de solo consulta (A2-F-05)', () => {
    it('AuthService no expone updateUserProfile ni hace PUT a /usuarios/perfil', () => {
      expect('updateUserProfile' in service).toBeFalse();
    });
  });

  describe('fetchProfileFromBackend', () => {
    const features = environment.features as { userProfileEndpointEnabled: boolean };
    let profileFlag: boolean;

    beforeEach(() => {
      profileFlag = features.userProfileEndpointEnabled;
      features.userProfileEndpointEnabled = true;
    });

    afterEach(() => {
      features.userProfileEndpointEnabled = profileFlag;
    });

    it('con userProfileEndpointEnabled apagado no llama a /usuarios/perfil (backend responde 501)', async () => {
      mockTokenResponse(basePayload());
      await service.loginWithCredentials('docente@uco.edu.co', 'pass');
      features.userProfileEndpointEnabled = false;
      fetchSpy.calls.reset();

      const result = await service.fetchProfileFromBackend();

      expect(result).toBe(service.currentUser());
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('el flag userProfileEndpointEnabled está apagado por defecto', () => {
      expect(profileFlag).toBeFalse();
    });

    it('F-ADM-016: loginAsMockUser no persiste el rol mock en localStorage', () => {
      localStorage.removeItem('gestio_asistencia_mock_role');
      service.setMockMode(true);
      service.loginAsMockUser('DOCENTE', false);
      expect(localStorage.getItem('gestio_asistencia_mock_role')).toBeNull();
    });

    it('en modo mock devuelve el usuario actual sin llamar a fetch', async () => {
      service.setMockMode(true);
      service.loginAsMockUser('DOCENTE', false);
      fetchSpy.calls.reset();

      const result = await service.fetchProfileFromBackend();

      expect(result).toBe(service.currentUser());
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sin token devuelve null', async () => {
      const result = await service.fetchProfileFromBackend();
      expect(result).toBeNull();
    });

    it('con HTTP no ok devuelve null', async () => {
      mockTokenResponse(basePayload());
      await service.loginWithCredentials('docente@uco.edu.co', 'pass');
      fetchSpy.and.resolveTo({ ok: false } as Response);

      const result = await service.fetchProfileFromBackend();

      expect(result).toBeNull();
    });

    it('ante un error de red devuelve null sin lanzar', async () => {
      mockTokenResponse(basePayload());
      await service.loginWithCredentials('docente@uco.edu.co', 'pass');
      fetchSpy.and.rejectWith(new Error('network down'));

      const result = await service.fetchProfileFromBackend();

      expect(result).toBeNull();
    });

    it('toma el nombre visible de nombreCompleto del perfil (DTO de HU006), no de un campo "name" inexistente', async () => {
      mockTokenResponse(basePayload());
      await service.loginWithCredentials('docente@uco.edu.co', 'pass');
      fetchSpy.and.resolveTo({
        ok: true,
        json: () =>
          Promise.resolve({ datos: { primerNombre: 'Sergio', primerApellido: 'Test', nombreCompleto: 'Sergio Test' } }),
      } as Response);

      const result = await service.fetchProfileFromBackend();

      expect(result?.name).toBe('Sergio Test');
      expect(service.currentUser()?.name).toBe('Sergio Test');
    });

    it('sin nombreCompleto compone el nombre visible con primerNombre y primerApellido del perfil', async () => {
      mockTokenResponse(basePayload());
      await service.loginWithCredentials('docente@uco.edu.co', 'pass');
      fetchSpy.and.resolveTo({
        ok: true,
        json: () => Promise.resolve({ datos: { primerNombre: 'Ana', primerApellido: 'Gomez' } }),
      } as Response);

      const result = await service.fetchProfileFromBackend();

      expect(result?.name).toBe('Ana Gomez');
    });

    it('sincroniza campos del perfil recibido del backend', async () => {
      mockTokenResponse(basePayload());
      await service.loginWithCredentials('docente@uco.edu.co', 'pass');
      fetchSpy.and.resolveTo({
        ok: true,
        json: () =>
          Promise.resolve({ datos: { primerNombre: 'Sincronizado', numeroIdentificacion: '123' } }),
      } as Response);

      const result = await service.fetchProfileFromBackend();

      expect(result?.primerNombre).toBe('Sincronizado');
      const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
      expect(url).toContain('/usuarios/perfil');
      expect(init.credentials).toBe('omit');
      expect((init.headers as Record<string, string>)['Authorization']).toMatch(/^Bearer /);
    });

    it('conserva los valores actuales cuando el backend no envía todos los campos', async () => {
      mockTokenResponse(basePayload());
      await service.loginWithCredentials('docente@uco.edu.co', 'pass');
      const before = service.currentUser()!;
      fetchSpy.and.resolveTo({
        ok: true,
        json: () => Promise.resolve({ datos: {} }),
      } as Response);

      const result = await service.fetchProfileFromBackend();

      expect(result?.primerNombre).toBe(before.primerNombre);
      expect(result?.email).toBe(before.email);
    });

    it('devuelve null si el backend responde sin datos', async () => {
      mockTokenResponse(basePayload());
      await service.loginWithCredentials('docente@uco.edu.co', 'pass');
      fetchSpy.and.resolveTo({ ok: true, json: () => Promise.resolve({}) } as Response);

      const result = await service.fetchProfileFromBackend();

      expect(result).toBeNull();
    });
  });

  describe('mapPayloadToUser: fallbacks de nombre/email', () => {
    it('usa payload.name si no hay given_name/family_name', async () => {
      mockTokenResponse(
        basePayload({ given_name: undefined, family_name: undefined, name: 'Nombre Completo' })
      );

      const user = await service.loginWithCredentials('docente@uco.edu.co', 'pass');

      expect(user.name).toBe('Nombre Completo');
    });

    it('usa preferred_username si no hay name ni given_name/family_name', async () => {
      mockTokenResponse(
        basePayload({
          given_name: undefined,
          family_name: undefined,
          name: undefined,
          preferred_username: 'jdocente',
        })
      );

      const user = await service.loginWithCredentials('docente@uco.edu.co', 'pass');

      expect(user.name).toBe('jdocente');
    });

    it('usa preferred_username para construir el email cuando el token no trae email', async () => {
      mockTokenResponse(basePayload({ email: undefined, preferred_username: 'jdocente' }));

      const user = await service.loginWithCredentials('docente@uco.edu.co', 'pass');

      expect(user.email).toBe('jdocente@uco.edu.co');
    });

    it('usa un nombre por defecto si el token no trae ningún dato de nombre', async () => {
      mockTokenResponse(
        basePayload({
          given_name: undefined,
          family_name: undefined,
          name: undefined,
          preferred_username: undefined,
        })
      );

      const user = await service.loginWithCredentials('docente@uco.edu.co', 'pass');

      expect(user.name).toBe('Usuario Institucional');
    });
  });

  describe('refreshAccessToken: fallback de refresh_token', () => {
    it('si la respuesta no incluye refresh_token nuevo, conserva el anterior en memoria y no en localStorage', async () => {
      fetchSpy.and.resolveTo({
        ok: true,
        json: () => Promise.resolve({ access_token: makeJwt(basePayload()) }),
      } as Response);

      const result = await service.refreshAccessToken('refresh-original');

      expect(result).toBeTrue();
      expect(service.token()).toBeTruthy();
      expect(localStorage.getItem('gestio_refresh_token')).toBeNull();
    });
  });
});

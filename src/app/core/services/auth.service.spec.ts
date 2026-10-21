import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

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
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: routerSpy }],
    });

    service = TestBed.inject(AuthService);
    service.setMockMode(false);
    fetchSpy = spyOn(window, 'fetch');
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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

  describe('updateUserProfile', () => {
    it('sin usuario autenticado devuelve un ApiResponse fallido', (done) => {
      service.updateUserProfile({ primerNombre: 'X' }).subscribe((res) => {
        expect(res.exitoso).toBeFalse();
        done();
      });
    });

    it('en modo mock actualiza el usuario localmente', (done) => {
      service.setMockMode(true);
      service.loginAsMockUser('DOCENTE', false);

      service.updateUserProfile({ primerNombre: 'Nuevo' }).subscribe((res) => {
        expect(res.exitoso).toBeTrue();
        expect(res.datos.primerNombre).toBe('Nuevo');
        expect(service.currentUser()?.primerNombre).toBe('Nuevo');
        done();
      });
    });

    it('en modo real hace PUT al backend y sincroniza la respuesta', (done) => {
      mockTokenResponse(basePayload());
      service.loginWithCredentials('docente@uco.edu.co', 'pass').then(() => {
        fetchSpy.and.resolveTo({
          ok: true,
          json: () =>
            Promise.resolve({
              idTransaccion: 'tx-1',
              datos: { primerNombre: 'Actualizado' },
            }),
        } as Response);

        service.updateUserProfile({ primerNombre: 'Nuevo' }).subscribe((res) => {
          expect(res.exitoso).toBeTrue();
          expect(res.datos.primerNombre).toBe('Actualizado');
          const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
          expect(url).toContain('/usuarios/perfil');
          expect(init.method).toBe('PUT');
          expect(init.credentials).toBe('omit');
          expect((init.headers as Record<string, string>)['Authorization']).toMatch(/^Bearer /);
          done();
        });
      });
    });

    it('en modo real propaga el error si el backend responde con fallo', (done) => {
      mockTokenResponse(basePayload());
      service.loginWithCredentials('docente@uco.edu.co', 'pass').then(() => {
        fetchSpy.and.resolveTo({ ok: false } as Response);

        service.updateUserProfile({ primerNombre: 'Nuevo' }).subscribe({
          error: (err) => {
            expect(err).toBeTruthy();
            done();
          },
        });
      });
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

  describe('updateUserProfile: fallbacks de campos', () => {
    it('sin overrides conserva los campos individuales actuales', (done) => {
      service.setMockMode(true);
      service.loginAsMockUser('DOCENTE', false);
      const before = service.currentUser()!;

      service.updateUserProfile({}).subscribe((res) => {
        expect(res.datos.primerNombre).toBe(before.primerNombre || '');
        expect(res.datos.primerApellido).toBe(before.primerApellido || '');
        done();
      });
    });

    it('con segundoNombre y segundoApellido provistos, los usa en el nombre completo', (done) => {
      service.setMockMode(true);
      service.loginAsMockUser('DOCENTE', false);

      service
        .updateUserProfile({ segundoNombre: 'Del Carmen', segundoApellido: 'Restrepo' })
        .subscribe((res) => {
          expect(res.datos.segundoNombre).toBe('Del Carmen');
          expect(res.datos.segundoApellido).toBe('Restrepo');
          expect(res.datos.name).toContain('Del Carmen');
          done();
        });
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

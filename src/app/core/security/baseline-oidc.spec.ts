import {
  BASELINE_HTTP_TIMEOUT_MS,
  BaselineOidcConfig,
  SILENT_ATTEMPT_WINDOW_MS,
  base64Url,
  buildAuthorizeUrl,
  buildInteractiveLoginUrl,
  buildLogoutUrl,
  clearPending,
  exchangeCode,
  loadPending,
  parseCallback,
  pkceChallenge,
  randomUrlSafe,
  recentSilentAttempt,
  safeInternalPath,
  savePending,
} from './baseline-oidc';

const CONFIG: BaselineOidcConfig = {
  issuerUrl: 'http://idp.test/realms/security-baseline',
  clientId: 'asistencias-uco-spa',
  redirectUri: 'http://app.test/login',
  pdpUrl: 'http://pdp.test',
};

describe('baseline-oidc', () => {
  afterEach(() => sessionStorage.clear());

  it('PKCE S256 coincide con el vector de la RFC 7636', async () => {
    expect(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    );
  });

  it('base64Url y randomUrlSafe producen texto URL-safe sin relleno', () => {
    expect(base64Url(new Uint8Array([251, 255, 254]))).toBe('-__-');
    expect(randomUrlSafe(48)).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(randomUrlSafe(16)).not.toBe(randomUrlSafe(16));
  });

  it('la URL de autorización es Authorization Code + PKCE de un cliente público (sin secretos)', () => {
    const url = new URL(buildAuthorizeUrl(CONFIG, { state: 's1', challenge: 'c1', silent: false }));
    expect(url.origin + url.pathname).toBe('http://idp.test/realms/security-baseline/protocol/openid-connect/auth');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge')).toBe('c1');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe(CONFIG.redirectUri);
    expect(url.searchParams.has('prompt')).toBeFalse();
    expect(url.search).not.toMatch(/secret|password|refresh/i);
    expect(new URL(buildAuthorizeUrl(CONFIG, { state: 's', challenge: 'c', silent: true })).searchParams.get('prompt')).toBe('none');
  });

  it('login interactivo y logout apuntan al BFF del PDP', () => {
    const login = new URL(buildInteractiveLoginUrl(CONFIG, 'http://app.test/login?returnUrl=%2Fx'));
    expect(login.origin + login.pathname).toBe('http://pdp.test/oauth2/authorization/keycloak');
    expect(login.searchParams.get('return_to')).toBe('http://app.test/login?returnUrl=%2Fx');
    expect(buildLogoutUrl(CONFIG)).toBe('http://pdp.test/api/v1/session/logout');
  });

  it('parseCallback extrae solo code, state y error', () => {
    expect(parseCallback('?code=abc&state=xyz&session_state=1&iss=x')).toEqual({ code: 'abc', state: 'xyz' });
    expect(parseCallback('?error=login_required&state=xyz')).toEqual({ error: 'login_required', state: 'xyz' });
    expect(parseCallback('')).toEqual({});
  });

  it('safeInternalPath solo admite rutas internas', () => {
    expect(safeInternalPath('/app/docente/grupos?x=1')).toBe('/app/docente/grupos?x=1');
    for (const malicious of ['https://evil.example', '//evil.example', '/\\evil', 'javascript:alert(1)', '', null, undefined]) {
      expect(safeInternalPath(malicious as string)).toBe('/');
    }
    expect(safeInternalPath('nope', '/login')).toBe('/login');
  });

  it('el estado pendiente solo guarda state, verifier y ruta; caduca y se sanea', () => {
    const now = Date.now();
    savePending({ state: 's', verifier: 'v', returnUrl: '/app/x', silent: true, createdAt: now });
    expect(loadPending(now)?.returnUrl).toBe('/app/x');
    expect(recentSilentAttempt(now)).toBeTrue();
    expect(recentSilentAttempt(now + SILENT_ATTEMPT_WINDOW_MS + 1)).toBeFalse();
    expect(loadPending(now + 11 * 60_000)).toBeNull();

    savePending({ state: 's', verifier: 'v', returnUrl: 'https://evil.example', silent: false, createdAt: now });
    expect(loadPending(now)?.returnUrl).toBe('/');

    clearPending();
    expect(loadPending(now)).toBeNull();
    expect(recentSilentAttempt(now)).toBeFalse();
  });

  describe('exchangeCode', () => {
    function reply(ok: boolean, body: unknown): typeof fetch {
      return (() => Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response)) as typeof fetch;
    }

    it('devuelve solo el access token y descarta refresh_token e id_token', async () => {
      const result = await exchangeCode(
        CONFIG,
        'code',
        'verifier',
        reply(true, { access_token: 'AT', token_type: 'Bearer', refresh_token: 'RT', id_token: 'IT' })
      );
      expect(result).toEqual({ accessToken: 'AT' });
    });

    it('rechaza respuestas fallidas o que no son Bearer', async () => {
      await expectAsync(exchangeCode(CONFIG, 'c', 'v', reply(false, {}))).toBeRejected();
      await expectAsync(exchangeCode(CONFIG, 'c', 'v', reply(true, { access_token: 'AT', token_type: 'mac' }))).toBeRejected();
      await expectAsync(exchangeCode(CONFIG, 'c', 'v', reply(true, { token_type: 'Bearer' }))).toBeRejected();
    });

    it('aborta un intercambio OIDC que no responde y rechaza al vencer el tiempo límite', async () => {
      let signal: AbortSignal | undefined;
      const stalledFetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
        signal = init?.signal as AbortSignal | undefined;
        return new Promise<Response>(() => undefined);
      }) as typeof fetch;

      await expectAsync(exchangeCode(CONFIG, 'c', 'v', stalledFetch, 10)).toBeRejected();

      expect(signal).toBeDefined();
      expect(signal?.aborted).toBeTrue();
      expect(BASELINE_HTTP_TIMEOUT_MS).toBeGreaterThan(0);
    });
  });
});

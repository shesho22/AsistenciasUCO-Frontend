import { environment } from '../../../environments/environment';

describe('Session V2 local default', () => {
  let previousRuntimeEnv: typeof window.env;

  afterEach(() => {
    localStorage.removeItem('USE_SESSIONS_V2');
    if (previousRuntimeEnv === undefined) delete window['env'];
    else window['env'] = previousRuntimeEnv;
  });

  it('ignora el opt-out histórico de localStorage y mantiene UTC V2', () => {
    localStorage.setItem('USE_SESSIONS_V2', 'false');

    expect(environment.useSessionsV2).toBeTrue();
  });

  it('ignora también un valor runtime falso y mantiene UTC V2', () => {
    previousRuntimeEnv = window['env'];
    // USE_SESSIONS_V2 ya no existe en RuntimeEnv: se prueba que un valor heredado se ignora.
    window.env = { ...(previousRuntimeEnv ?? {}), ...({ USE_SESSIONS_V2: 'false' } as Record<string, string>) };

    expect(environment.useSessionsV2).toBeTrue();
  });
});

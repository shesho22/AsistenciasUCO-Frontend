import { TestBed } from '@angular/core/testing';
import { computed } from '@angular/core';
import { CatalogoMensajesUiService, ClienteMensajesUi, fabricaClienteMensajesUi } from './catalogo-mensajes-ui.service';
import { reiniciarCatalogoMensajesUi } from './catalogo-mensajes-ui';
import { MENSAJES_UI, mensajeUi } from './mensajes-ui';
import { CODIGOS_REMOTOS_MENSAJES_UI } from './mensajes-ui-codigos-remotos';

describe('CatalogoMensajesUiService (VAL MSG-06)', () => {
  const envOriginal = window.env;
  let respuestas: Record<string, { content: string; source: 'api' | 'cache' | 'fallback' }>;
  let cliente: jasmine.SpyObj<ClienteMensajesUi>;
  let crear: jasmine.Spy;

  /** Deja correr las promesas del cliente y la microtarea que avisa a las vistas. */
  const asentar = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };

  function configurar(ids: { app?: string; env?: string }): CatalogoMensajesUiService {
    window.env = {
      ...envOriginal,
      MESSAGEUCOLAB_API_BASE_URL: '/messageucolab',
      MESSAGEUCOLAB_APPLICATION_ID: ids.app ?? '',
      MESSAGEUCOLAB_ENVIRONMENT_ID: ids.env ?? '',
    };
    return TestBed.inject(CatalogoMensajesUiService);
  }

  beforeEach(() => {
    reiniciarCatalogoMensajesUi();
    respuestas = {};
    cliente = jasmine.createSpyObj<ClienteMensajesUi>('ClienteMensajesUi', ['get']);
    cliente.get.and.callFake(async (codigo: string) => respuestas[codigo] ?? { content: codigo, source: 'fallback' });
    crear = spyOn(fabricaClienteMensajesUi, 'crear').and.resolveTo(cliente);
  });

  afterEach(() => {
    window.env = envOriginal;
    reiniciarCatalogoMensajesUi();
  });

  it('sin aplicacion y ambiente configurados no pide nada y usa los textos locales', async () => {
    expect(configurar({ app: 'app-1' }).iniciar()).toBeFalse();
    expect(mensajeUi('API_ERROR_DEFAULT')).toBe(MENSAJES_UI.API_ERROR_DEFAULT);
    await asentar();
    expect(crear).not.toHaveBeenCalled();
  });

  it('pide el texto por su codigo remoto con la ruta publica y lo usa desde que llega', async () => {
    respuestas[CODIGOS_REMOTOS_MENSAJES_UI.API_ERROR_DEFAULT] = { content: 'Texto desde MessageUcoLab.', source: 'api' };
    expect(configurar({ app: 'app-1', env: 'env-1' }).iniciar()).toBeTrue();

    expect(mensajeUi('API_ERROR_DEFAULT')).toBe(MENSAJES_UI.API_ERROR_DEFAULT);
    await asentar();

    expect(crear).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ apiBaseUrl: '/messageucolab', applicationId: 'app-1', environmentId: 'env-1' })
    );
    expect(cliente.get).toHaveBeenCalledOnceWith('UI012');
    expect(mensajeUi('API_ERROR_DEFAULT')).toBe('Texto desde MessageUcoLab.');
  });

  it('llena los marcadores del texto del catalogo con los parametros', async () => {
    respuestas[CODIGOS_REMOTOS_MENSAJES_UI.UI_ERROR_REFERENCIA] = { content: 'Referencia del fallo: {id}', source: 'api' };
    configurar({ app: 'a', env: 'e' }).iniciar();
    mensajeUi('UI_ERROR_REFERENCIA', { id: 'x' });
    await asentar();
    expect(mensajeUi('UI_ERROR_REFERENCIA', { id: 'corr-1' })).toBe('Referencia del fallo: corr-1');
  });

  it('un computed que muestra el texto se actualiza solo cuando llega el del catalogo', async () => {
    respuestas[CODIGOS_REMOTOS_MENSAJES_UI.UI_ADMIN_DECANOS_003] = { content: 'Estado del decano actualizado.', source: 'api' };
    configurar({ app: 'a', env: 'e' }).iniciar();
    const texto = TestBed.runInInjectionContext(() => computed(() => mensajeUi('UI_ADMIN_DECANOS_003')));

    expect(texto()).toBe(MENSAJES_UI.UI_ADMIN_DECANOS_003);
    await asentar();
    expect(texto()).toBe('Estado del decano actualizado.');
  });

  it('pide cada codigo una sola vez aunque la interfaz lo use muchas veces', async () => {
    configurar({ app: 'a', env: 'e' }).iniciar();
    mensajeUi('API_ERROR_CONFLICT');
    mensajeUi('API_ERROR_CONFLICT');
    await asentar();
    mensajeUi('API_ERROR_CONFLICT');
    await asentar();
    expect(crear).toHaveBeenCalledTimes(1);
    expect(cliente.get).toHaveBeenCalledOnceWith(CODIGOS_REMOTOS_MENSAJES_UI.API_ERROR_CONFLICT);
  });

  it('si MessageUcoLab no responde (respaldo del cliente) conserva el texto local', async () => {
    configurar({ app: 'a', env: 'e' }).iniciar();
    mensajeUi('API_ERROR_NETWORK_ERROR');
    await asentar();
    expect(mensajeUi('API_ERROR_NETWORK_ERROR')).toBe(MENSAJES_UI.API_ERROR_NETWORK_ERROR);
  });

  it('si el cliente no se puede descargar conserva el texto local sin romper', async () => {
    crear.and.rejectWith(new Error('chunk no disponible'));
    configurar({ app: 'a', env: 'e' }).iniciar();
    mensajeUi('API_ERROR_FORBIDDEN');
    await asentar();
    expect(mensajeUi('API_ERROR_FORBIDDEN')).toBe(MENSAJES_UI.API_ERROR_FORBIDDEN);
  });

  it('un texto vacio del catalogo no reemplaza al local', async () => {
    respuestas[CODIGOS_REMOTOS_MENSAJES_UI.API_ERROR_CONFLICT] = { content: '   ', source: 'api' };
    configurar({ app: 'a', env: 'e' }).iniciar();
    mensajeUi('API_ERROR_CONFLICT');
    await asentar();
    expect(mensajeUi('API_ERROR_CONFLICT')).toBe(MENSAJES_UI.API_ERROR_CONFLICT);
  });

  it('el onError del cliente deja una advertencia con el codigo', async () => {
    configurar({ app: 'a', env: 'e' }).iniciar();
    mensajeUi('API_ERROR_DEFAULT');
    await asentar();
    const opciones = crear.calls.mostRecent().args[0] as { onError: (e: unknown, c: string) => void };
    const aviso = spyOn(console, 'warn');
    opciones.onError(new Error('x'), 'MSG_UI012');
    expect(aviso).toHaveBeenCalledWith('[MensajesUi] MSG_UI012: se usa el texto local.', jasmine.any(Error));
  });

  it('la fabrica real carga el cliente del minifront', async () => {
    crear.and.callThrough();
    const real = await fabricaClienteMensajesUi.crear({ apiBaseUrl: '/messageucolab', applicationId: 'a', environmentId: 'e' });
    expect(typeof real.get).toBe('function');
  });
});

import { TestBed } from '@angular/core/testing';
import { EnvironmentInjector, computed } from '@angular/core';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { iniciarCatalogoMensajesUi } from '../../app.config';
import { CatalogoMensajesUiService } from './catalogo-mensajes-ui.service';
import { reiniciarCatalogoMensajesUi } from './catalogo-mensajes-ui';
import { MENSAJES_UI, mensajeUi } from './mensajes-ui';
import { CODIGOS_REMOTOS_MENSAJES_UI } from './mensajes-ui-codigos-remotos';
import { getApiErrorMessage } from '../api/errors/api-error.util';
import { avisoSolicitudSesionRegistrada } from '../models/sesion-manual.util';
import { BYPASS_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';
import { environment } from '../../../environments/environment';

describe('CatalogoMensajesUiService (VAL MSG-06 / INT-003)', () => {
  const envOriginal = window.env;
  let http: HttpTestingController;

  /** Deja correr las promesas de la respuesta y la microtarea que avisa a las vistas. */
  const asentar = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };

  const url = (remoto: string) => `${environment.apiUrl}/public/mensajes-interfaz/${remoto}`;

  /** Responde la peticion del codigo remoto con el texto del catalogo. */
  function responder(remoto: string, contenido: string): void {
    http.expectOne(url(remoto)).flush({ exitoso: true, datos: { codigo: remoto, contenido } });
  }

  function configurar(encendido: string | undefined): CatalogoMensajesUiService {
    window.env = { ...envOriginal, MENSAJES_UI_DESDE_CATALOGO: encendido };
    return TestBed.inject(CatalogoMensajesUiService);
  }

  beforeEach(() => {
    reiniciarCatalogoMensajesUi();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    window.env = envOriginal;
    reiniciarCatalogoMensajesUi();
  });

  it('apagado (o sin la variable) no pide nada y usa los textos locales', async () => {
    expect(configurar(undefined).iniciar()).toBeFalse();
    expect(mensajeUi('API_ERROR_DEFAULT')).toBe(MENSAJES_UI.API_ERROR_DEFAULT);
    await asentar();
    http.expectNone(() => true);
    expect(configurar('false').iniciar()).toBeFalse();
    http.verify();
  });

  it('pide el texto al Backend por su codigo remoto, sin aviso global, y lo usa desde que llega', async () => {
    expect(configurar('true').iniciar()).toBeTrue();

    expect(mensajeUi('API_ERROR_DEFAULT')).toBe(MENSAJES_UI.API_ERROR_DEFAULT);
    const peticion = http.expectOne(url('UI012'));
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.context.get(BYPASS_GLOBAL_ERROR_TOAST)).toBeTrue();
    peticion.flush({ exitoso: true, datos: { codigo: 'UI012', contenido: 'Texto desde el catalogo.' } });
    await asentar();

    expect(mensajeUi('API_ERROR_DEFAULT')).toBe('Texto desde el catalogo.');
    http.verify();
  });

  it('acepta el valor de la variable sin importar mayusculas ni espacios', () => {
    expect(configurar(' TRUE ').iniciar()).toBeTrue();
  });

  it('llena los marcadores del texto del catalogo con los parametros', async () => {
    configurar('true').iniciar();
    mensajeUi('UI_ERROR_REFERENCIA', { id: 'x' });
    responder(CODIGOS_REMOTOS_MENSAJES_UI.UI_ERROR_REFERENCIA, 'Referencia del fallo: {id}');
    await asentar();
    expect(mensajeUi('UI_ERROR_REFERENCIA', { id: 'corr-1' })).toBe('Referencia del fallo: corr-1');
  });

  it('un computed que muestra el texto se actualiza solo cuando llega el del catalogo', async () => {
    configurar('true').iniciar();
    const texto = TestBed.runInInjectionContext(() => computed(() => mensajeUi('UI_ADMIN_DECANOS_003')));

    expect(texto()).toBe(MENSAJES_UI.UI_ADMIN_DECANOS_003);
    responder(CODIGOS_REMOTOS_MENSAJES_UI.UI_ADMIN_DECANOS_003, 'Estado del decano actualizado.');
    await asentar();
    expect(texto()).toBe('Estado del decano actualizado.');
  });

  it('pide cada codigo una sola vez aunque la interfaz lo use muchas veces', async () => {
    configurar('true').iniciar();
    mensajeUi('API_ERROR_CONFLICT');
    mensajeUi('API_ERROR_CONFLICT');
    http.expectOne(url(CODIGOS_REMOTOS_MENSAJES_UI.API_ERROR_CONFLICT)).flush(
      { message: 'no existe' },
      { status: 404, statusText: 'Not Found' }
    );
    await asentar();
    mensajeUi('API_ERROR_CONFLICT');
    await asentar();
    http.verify();
    expect(mensajeUi('API_ERROR_CONFLICT')).toBe(MENSAJES_UI.API_ERROR_CONFLICT);
  });

  it('si el Backend no responde conserva el texto local', async () => {
    configurar('true').iniciar();
    mensajeUi('API_ERROR_NETWORK_ERROR');
    http.expectOne(url(CODIGOS_REMOTOS_MENSAJES_UI.API_ERROR_NETWORK_ERROR)).error(new ProgressEvent('error'));
    await asentar();
    expect(mensajeUi('API_ERROR_NETWORK_ERROR')).toBe(MENSAJES_UI.API_ERROR_NETWORK_ERROR);
  });

  it('una respuesta sin texto o no exitosa no reemplaza al local', async () => {
    configurar('true').iniciar();
    mensajeUi('API_ERROR_CONFLICT');
    mensajeUi('API_ERROR_FORBIDDEN');
    mensajeUi('API_ERROR_DEFAULT');
    responder(CODIGOS_REMOTOS_MENSAJES_UI.API_ERROR_CONFLICT, '   ');
    http.expectOne(url(CODIGOS_REMOTOS_MENSAJES_UI.API_ERROR_FORBIDDEN)).flush({ exitoso: false, datos: null });
    http.expectOne(url(CODIGOS_REMOTOS_MENSAJES_UI.API_ERROR_DEFAULT)).flush(null);
    await asentar();
    expect(mensajeUi('API_ERROR_CONFLICT')).toBe(MENSAJES_UI.API_ERROR_CONFLICT);
    expect(mensajeUi('API_ERROR_FORBIDDEN')).toBe(MENSAJES_UI.API_ERROR_FORBIDDEN);
    expect(mensajeUi('API_ERROR_DEFAULT')).toBe(MENSAJES_UI.API_ERROR_DEFAULT);
  });

  it('los textos de error de la API y los avisos compartidos se leen al usarse y toman el del catalogo', async () => {
    configurar('true').iniciar();
    const sinRed = new HttpErrorResponse({ status: 0 });

    expect(getApiErrorMessage(sinRed)).toBe(MENSAJES_UI.API_ERROR_NETWORK_ERROR);
    expect(getApiErrorMessage('fallo sin forma')).toBe(MENSAJES_UI.API_ERROR_DEFAULT);
    expect(avisoSolicitudSesionRegistrada()).toBe(MENSAJES_UI.UI_SESION_SOLICITUD_REGISTRADA);
    responder(CODIGOS_REMOTOS_MENSAJES_UI.API_ERROR_NETWORK_ERROR, 'Sin conexion con el servidor (catalogo).');
    responder(CODIGOS_REMOTOS_MENSAJES_UI.API_ERROR_DEFAULT, 'Fallo general desde el catalogo.');
    responder(CODIGOS_REMOTOS_MENSAJES_UI.UI_SESION_SOLICITUD_REGISTRADA, 'Solicitud registrada (catalogo).');
    await asentar();

    expect(getApiErrorMessage(sinRed)).toBe('Sin conexion con el servidor (catalogo).');
    expect(getApiErrorMessage('fallo sin forma')).toBe('Fallo general desde el catalogo.');
    expect(avisoSolicitudSesionRegistrada()).toBe('Solicitud registrada (catalogo).');
  });

  describe('iniciarCatalogoMensajesUi (APP_INITIALIZER, VAL EST-10)', () => {
    it('apagado no descarga ni inicia el servicio', async () => {
      window.env = { ...envOriginal, MENSAJES_UI_DESDE_CATALOGO: 'false' };
      const iniciar = spyOn(CatalogoMensajesUiService.prototype, 'iniciar');
      iniciarCatalogoMensajesUi(TestBed.inject(EnvironmentInjector))();
      await asentar();
      expect(iniciar).not.toHaveBeenCalled();
    });

    it('encendido carga el servicio en diferido y lo inicia', async () => {
      window.env = { ...envOriginal, MENSAJES_UI_DESDE_CATALOGO: 'true' };
      const iniciar = spyOn(CatalogoMensajesUiService.prototype, 'iniciar').and.returnValue(true);
      iniciarCatalogoMensajesUi(TestBed.inject(EnvironmentInjector))();
      for (let i = 0; i < 20 && iniciar.calls.count() === 0; i++) await new Promise((r) => setTimeout(r, 0));
      expect(iniciar).toHaveBeenCalledTimes(1);
    });
  });
});

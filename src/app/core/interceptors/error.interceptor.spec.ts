import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { ToastService } from '../../shared/components/toast/toast.component';
import { mensajeUi } from '../messages/mensajes-ui';
import { BYPASS_GLOBAL_ERROR_TOAST } from './error.interceptor';
import { getApiErrorMessage, marcarErrorPresentado } from '../api/errors/api-error.util';
import { HttpContext, HttpErrorResponse } from '@angular/common/http';

describe('errorInterceptor decide por code', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;

  const envelope = (status: number, code: string, message: string) => ({
    timestamp: '2026-09-24T10:00:00Z',
    status,
    error: 'x',
    code,
    message,
    path: '/api/v1/probe',
    correlationId: 'c-1',
  });

  beforeEach(() => {
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toast },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('code FORBIDDEN muestra acceso denegado', () => {
    client.get('/probe').subscribe({ error: () => undefined });
    http.expectOne('/probe').flush(envelope(403, 'FORBIDDEN', 'lo que sea'), { status: 403, statusText: 'Forbidden' });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('403 sin envelope (cadena de seguridad) también se trata como FORBIDDEN', () => {
    client.get('/probe').subscribe({ error: () => undefined });
    http.expectOne('/probe').flush(null, { status: 403, statusText: 'Forbidden' });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('un mensaje que dice "permiso" con otro code NO dispara el toast de acceso denegado', fakeAsync(() => {
    client.get('/probe').subscribe({ error: () => undefined });
    http.expectOne('/probe').flush(
      envelope(400, 'VALIDATION_ERROR', 'No tiene permiso ni acceso denegado'),
      { status: 400, statusText: 'Bad Request' }
    );
    tick();
    // TD-120: el 400 sin manejar muestra su mensaje del backend, nunca el aviso de acceso denegado.
    expect(toast.error).not.toHaveBeenCalledWith(mensajeUi('UI_ERROR_INTERCEPTOR_001'), jasmine.anything());
  }));

  describe('TD-120: respaldo global para 400/409/422', () => {
    const textoNegocio = 'Ya existe un periodo con ese codigo.';

    it('un 409 que ninguna pantalla manejo muestra el mensaje del backend sin referencia si el id no es seguro', fakeAsync(() => {
      client.post('/probe', {}).subscribe({ error: () => undefined });
      http.expectOne('/probe').flush(envelope(409, 'CONFLICT', textoNegocio), { status: 409, statusText: 'Conflict' });
      expect(toast.error).not.toHaveBeenCalled();
      tick();
      expect(toast.error).toHaveBeenCalledOnceWith(textoNegocio, null);
    }));

    for (const status of [400, 422]) {
      it(`un ${status} sin manejar muestra el mensaje del backend`, fakeAsync(() => {
        client.post('/probe', {}).subscribe({ error: () => undefined });
        http.expectOne('/probe').flush(envelope(status, 'INVALID_REQUEST', textoNegocio), { status, statusText: 'x' });
        tick();
        expect(toast.error).toHaveBeenCalledOnceWith(textoNegocio, null);
      }));
    }

    it('no duplica cuando la pantalla ya leyo el mensaje para presentarlo', fakeAsync(() => {
      client.post('/probe', {}).subscribe({ error: (e: unknown) => getApiErrorMessage(e) });
      http.expectOne('/probe').flush(envelope(409, 'CONFLICT', textoNegocio), { status: 409, statusText: 'Conflict' });
      tick();
      expect(toast.error).not.toHaveBeenCalled();
    }));

    it('no duplica cuando la pantalla lo marca de forma explicita', fakeAsync(() => {
      client.post('/probe', {}).subscribe({ error: (e: unknown) => marcarErrorPresentado(e) });
      http.expectOne('/probe').flush(envelope(422, 'VALIDATION_ERROR', textoNegocio), { status: 422, statusText: 'x' });
      tick();
      expect(toast.error).not.toHaveBeenCalled();
    }));

    it('no muestra nada si la peticion declara BYPASS_GLOBAL_ERROR_TOAST', fakeAsync(() => {
      client
        .post('/probe', {}, { context: new HttpContext().set(BYPASS_GLOBAL_ERROR_TOAST, true) })
        .subscribe({ error: () => undefined });
      http.expectOne('/probe').flush(envelope(409, 'CONFLICT', textoNegocio), { status: 409, statusText: 'Conflict' });
      tick();
      expect(toast.error).not.toHaveBeenCalled();
    }));

    it('no muestra nada sin envelope ApiErrorResponse', fakeAsync(() => {
      client.post('/probe', {}).subscribe({ error: () => undefined });
      http.expectOne('/probe').flush(null, { status: 409, statusText: 'Conflict' });
      tick();
      expect(toast.error).not.toHaveBeenCalled();
    }));

    it('el 401 es de autenticacion y no muestra aviso', fakeAsync(() => {
      client.get('/probe').subscribe({ error: () => undefined });
      http.expectOne('/probe').flush(envelope(401, 'UNAUTHORIZED', 'Sesion vencida'), { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(toast.error).not.toHaveBeenCalled();
    }));

    it('conserva el comportamiento de 403 y 5xx sin esperar al respaldo', fakeAsync(() => {
      client.get('/a').subscribe({ error: () => undefined });
      http.expectOne('/a').flush(envelope(403, 'FORBIDDEN', 'x'), { status: 403, statusText: 'Forbidden' });
      client.get('/b').subscribe({ error: () => undefined });
      http.expectOne('/b').flush(envelope(500, 'INTERNAL_ERROR', 'x'), { status: 500, statusText: 'Server Error' });
      expect(toast.error).toHaveBeenCalledTimes(2);
      tick();
      expect(toast.error).toHaveBeenCalledTimes(2);
    }));

    it('el error entregado al suscriptor sigue siendo el HttpErrorResponse original', fakeAsync(() => {
      let recibido: unknown;
      client.post('/probe', {}).subscribe({ error: (e: unknown) => (recibido = e) });
      http.expectOne('/probe').flush(envelope(409, 'CONFLICT', textoNegocio), { status: 409, statusText: 'Conflict' });
      tick();
      expect(recibido instanceof HttpErrorResponse).toBeTrue();
    }));
  });

  describe('VAL OBS-14: referencia de correlacion en el aviso', () => {
    it('un 5xx con envelope muestra el texto semantico del catalogo y su correlationId', () => {
      client.get('/probe').subscribe({ error: () => undefined });
      http.expectOne('/probe').flush(
        { ...envelope(500, 'INTERNAL_ERROR', 'Falla institucional.'), correlationId: 'corr-5xx-0001' },
        { status: 500, statusText: 'Server Error' }
      );
      expect(toast.error).toHaveBeenCalledOnceWith(mensajeUi('API_ERROR_INTERNAL_ERROR'), 'corr-5xx-0001');
    });

    it('un 403 sin envelope toma la referencia de la cabecera X-Correlation-Id', () => {
      client.get('/probe').subscribe({ error: () => undefined });
      http.expectOne('/probe').flush(null, {
        status: 403,
        statusText: 'Forbidden',
        headers: { 'X-Correlation-Id': 'corr-borde-0002' },
      });
      expect(toast.error).toHaveBeenCalledOnceWith(jasmine.any(String), 'corr-borde-0002');
    });

    it('sin correlationId en cuerpo ni cabecera el aviso va sin referencia', () => {
      client.get('/probe').subscribe({ error: () => undefined });
      http.expectOne('/probe').flush(null, { status: 503, statusText: 'Unavailable' });
      expect(toast.error).toHaveBeenCalledOnceWith(jasmine.any(String), null);
    });
  });
});

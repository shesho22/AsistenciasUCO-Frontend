import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { ToastService } from '../../shared/components/toast/toast.component';
import { mensajeUi } from '../messages/mensajes-ui';

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

  it('un mensaje que dice "permiso" con otro code NO dispara el toast de acceso denegado', () => {
    client.get('/probe').subscribe({ error: () => undefined });
    http.expectOne('/probe').flush(
      envelope(400, 'VALIDATION_ERROR', 'No tiene permiso ni acceso denegado'),
      { status: 400, statusText: 'Bad Request' }
    );
    expect(toast.error).not.toHaveBeenCalled();
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

import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { ToastService } from '../../shared/components/toast/toast.component';

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
});

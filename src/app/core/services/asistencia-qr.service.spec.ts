import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AsistenciaQrService } from './asistencia-qr.service';

describe('AsistenciaQrService (CULM-001 B.2, CONTRACT 3.2.6 y 3.2.7)', () => {
  let service: AsistenciaQrService;
  let http: HttpTestingController;
  const api = () => environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AsistenciaQrService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AsistenciaQrService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('B2-F-02 abrirQr hace POST /tomas/{id}/qr sin cuerpo', () => {
    service.abrirQr('t-1').subscribe();
    const req = http.expectOne(`${api()}/tomas/t-1/qr`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ exitoso: true, datos: { pin: '482913' } });
  });

  it('B2-F-02 rotarQr hace POST /tomas/{id}/qr/rotacion', () => {
    service.rotarQr('t-1').subscribe();
    const req = http.expectOne(`${api()}/tomas/t-1/qr/rotacion`);
    expect(req.request.method).toBe('POST');
    req.flush({ exitoso: true, datos: { pin: '111111' } });
  });

  it('B2-F-02 cerrarQr hace DELETE /tomas/{id}/qr', () => {
    service.cerrarQr('t-1').subscribe();
    const req = http.expectOne(`${api()}/tomas/t-1/qr`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ exitoso: true, mensaje: 'ok' });
  });

  it('B2-F-02 registrarPorToken envia exactamente { token }', () => {
    const token = 'abc'.repeat(14) + 'a';
    service.registrarPorToken(token).subscribe();
    const req = http.expectOne(`${api()}/estudiante/asistencia-qr`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token });
    expect(Object.keys(req.request.body)).toEqual(['token']);
    req.flush({ exitoso: true, datos: {} });
  });

  it('B2-F-02 registrarPorPin envia exactamente { pin }', () => {
    service.registrarPorPin('482913').subscribe();
    const req = http.expectOne(`${api()}/estudiante/asistencia-qr`);
    expect(req.request.body).toEqual({ pin: '482913' });
    expect(Object.keys(req.request.body)).toEqual(['pin']);
    req.flush({ exitoso: true, datos: {} });
  });

  for (const status of [400, 403, 404, 409, 429]) {
    it(`B2-F-02 propaga sin traducir el error ${status} del backend en registrarPorPin`, () => {
      let error: HttpErrorResponse | undefined;
      service.registrarPorPin('482913').subscribe({ error: (e) => (error = e) });
      http
        .expectOne(`${api()}/estudiante/asistencia-qr`)
        .flush({ code: 'AQR_011', message: 'Mensaje del backend' }, { status, statusText: 'x' });
      expect(error?.status).toBe(status);
      expect(error?.error.message).toBe('Mensaje del backend');
    });
  }
});

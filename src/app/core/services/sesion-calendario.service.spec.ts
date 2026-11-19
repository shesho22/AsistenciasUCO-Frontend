import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SesionCalendarioService } from './sesion-calendario.service';
import { environment } from '../../../environments/environment';

describe('SesionCalendarioService (ATA D7)', () => {
  let service: SesionCalendarioService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    service = TestBed.inject(SesionCalendarioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('el estudiante consulta su calendario con desde y hasta', () => {
    let total = -1;
    service.consultar('ESTUDIANTE', '2026-11-16', '2026-11-22').subscribe((r) => (total = r.datos.length));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/estudiante/sesiones/calendario`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('desde')).toBe('2026-11-16');
    expect(req.request.params.get('hasta')).toBe('2026-11-22');
    req.flush({ exitoso: true, datos: [{}, {}] });
    expect(total).toBe(2);
  });

  it('el docente consulta su propio calendario', () => {
    service.consultar('DOCENTE', '2026-11-16', '2026-11-22').subscribe();
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/docente/sesiones/calendario`);
    expect(req.request.params.get('desde')).toBe('2026-11-16');
    req.flush({ exitoso: true, datos: [] });
  });

  it('propaga el 400 CAL_001 con el mensaje del backend', () => {
    let mensaje = '';
    service.consultar('DOCENTE', '2026-11-22', '2026-11-16').subscribe({ error: (e) => (mensaje = e.error.message as string) });
    http.expectOne((r) => r.url === `${environment.apiUrl}/docente/sesiones/calendario`).flush(
      { code: 'CAL_001', message: 'El rango no es válido.' },
      { status: 400, statusText: 'Bad Request' }
    );
    expect(mensaje).toBe('El rango no es válido.');
  });
});

import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminFestivosService } from './admin-festivos.service';

describe('AdminFestivosService (CULM-001 B.1, pantalla 3.7)', () => {
  let service: AdminFestivosService;
  let http: HttpTestingController;
  const base = () => `${environment.apiUrl}/admin/festivos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminFestivosService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminFestivosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('B1-F-29 consultar(anio) hace GET /admin/festivos?anio= y devuelve la respuesta del backend', () => {
    let respuesta: unknown;
    service.consultar(2026).subscribe((r) => (respuesta = r));

    const req = http.expectOne((r) => r.url === base());
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('anio')).toBe('2026');
    expect(req.request.params.has('incluirInactivos')).toBeFalse();
    const body = { exitoso: true, datos: { anio: 2026, festivos: [], totalFestivos: 0 } };
    req.flush(body);

    expect(respuesta).toEqual(body);
  });

  it('B1-F-29 recargar(anio) hace POST /admin/festivos/{anio}/recarga sin cuerpo', () => {
    let respuesta: unknown;
    service.recargar(2026).subscribe((r) => (respuesta = r));

    const req = http.expectOne(`${base()}/2026/recarga`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ exitoso: true, datos: { anio: 2026 } });

    expect(respuesta).toEqual({ exitoso: true, datos: { anio: 2026 } });
  });

  it('B1-F-29 sesionesConAsistencia hace GET paginado con pagina y tamano', () => {
    let respuesta: unknown;
    service.sesionesConAsistencia(2026, 2, 20).subscribe((r) => (respuesta = r));

    const req = http.expectOne((r) => r.url === `${base()}/2026/sesiones-con-asistencia`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamano')).toBe('20');
    const body = { exitoso: true, elementos: [], numeroPagina: 2, tamanoPagina: 20, totalElementos: 0, totalPaginas: 0 };
    req.flush(body);

    expect(respuesta).toEqual(body);
  });

  it('B1-F-29 propaga los errores del backend sin traducirlos (400 FES_001, 403, 500 FES_009)', () => {
    for (const [status, code, message] of [
      [400, 'FES_001', 'El año indicado no es válido.'],
      [403, 'SEC_002', 'No tiene permisos para esta operación.'],
      [500, 'FES_009', 'No fue posible obtener los festivos.'],
    ] as const) {
      let error: { status: number; error: { message: string } } | undefined;
      service.recargar(1800).subscribe({ error: (e) => (error = e) });
      http.expectOne(`${base()}/1800/recarga`).flush(
        { timestamp: 't', status, error: 'x', code, message, path: '/p', correlationId: null },
        { status, statusText: 'x' }
      );
      expect(error?.status).toBe(status);
      expect(error?.error.message).toBe(message);
    }
  });
});

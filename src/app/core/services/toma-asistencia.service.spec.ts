import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TomaAsistenciaService } from './toma-asistencia.service';

describe('TomaAsistenciaService (CULM-001 B.2, CONTRACT 3.2.5)', () => {
  let service: TomaAsistenciaService;
  let http: HttpTestingController;
  const api = () => environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TomaAsistenciaService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(TomaAsistenciaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('B2-F-01 abrirToma hace POST /sesiones/{id}/tomas con { modo } exacto', () => {
    let respuesta: unknown;
    service.abrirToma('ses-1', 'QR').subscribe((r) => (respuesta = r));

    const req = http.expectOne(`${api()}/sesiones/ses-1/tomas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ modo: 'QR' });
    const body = { exitoso: true, datos: { idToma: 't-1', modo: 'QR' } };
    req.flush(body);
    expect(respuesta).toEqual(body);
  });

  it('B2-F-01 consultarTomas hace GET /sesiones/{id}/tomas', () => {
    service.consultarTomas('ses-1').subscribe();
    const req = http.expectOne(`${api()}/sesiones/ses-1/tomas`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: { tomas: [] } });
  });

  it('B2-F-01 cerrarToma envia { marcarAusentes } con true, false o null', () => {
    for (const valor of [true, false, null]) {
      service.cerrarToma('t-1', valor).subscribe();
      const req = http.expectOne(`${api()}/tomas/t-1/cierre`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ marcarAusentes: valor });
      req.flush({ exitoso: true, datos: {} });
    }
  });

  it('B2-F-01 registrarAsistencias envia el lote { registros } a /tomas/{id}/asistencias', () => {
    const registros = [{ estudianteId: 'e-1', estado: 'AN' as const }];
    service.registrarAsistencias('t-1', registros).subscribe();
    const req = http.expectOne(`${api()}/tomas/t-1/asistencias`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ registros });
    req.flush({ exitoso: true, datos: { idToma: 't-1', idSesion: 's', totalRegistros: 1 } });
  });

  it('B2-F-01 consultarAsistencias y consultarFaltantes son GET paginados', () => {
    service.consultarAsistencias('t-1', 2, 25).subscribe();
    const a = http.expectOne((r) => r.url === `${api()}/tomas/t-1/asistencias`);
    expect(a.request.method).toBe('GET');
    expect(a.request.params.get('pagina')).toBe('2');
    expect(a.request.params.get('tamano')).toBe('25');
    a.flush({ exitoso: true, elementos: [], numeroPagina: 2, tamanoPagina: 25, totalElementos: 0, totalPaginas: 0 });

    service.consultarFaltantes('t-1', 1, 50).subscribe();
    const f = http.expectOne((r) => r.url === `${api()}/tomas/t-1/faltantes`);
    expect(f.request.method).toBe('GET');
    expect(f.request.params.get('pagina')).toBe('1');
    expect(f.request.params.get('tamano')).toBe('50');
    f.flush({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 50, totalElementos: 0, totalPaginas: 0 });
  });

  for (const status of [400, 403, 404, 409]) {
    it(`B2-F-01 propaga sin traducir el error ${status} del backend en abrirToma`, () => {
      let error: HttpErrorResponse | undefined;
      service.abrirToma('ses-1', 'MANUAL').subscribe({ error: (e) => (error = e) });
      http
        .expectOne(`${api()}/sesiones/ses-1/tomas`)
        .flush({ code: 'TOM_003', message: 'Mensaje del backend' }, { status, statusText: 'x' });
      expect(error?.status).toBe(status);
      expect(error?.error.message).toBe('Mensaje del backend');
    });
  }
});

describe('TomaAsistenciaService: resumen de la sesión (puntos de control)', () => {
  it('consultarResumenSesion hace GET /sesiones/{id}/tomas/resumen', () => {
    TestBed.configureTestingModule({
      providers: [TomaAsistenciaService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    const service = TestBed.inject(TomaAsistenciaService);
    const http = TestBed.inject(HttpTestingController);
    let datos: unknown;
    service.consultarResumenSesion('ses-1').subscribe((r) => (datos = r.datos));
    const req = http.expectOne(`${environment.apiUrl}/sesiones/ses-1/tomas/resumen`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [{ estudianteId: 'e-1', estado: 'PARCIAL', minutosAsistidos: 40, minutosSesion: 120 }] });
    expect(datos).toEqual([{ estudianteId: 'e-1', estado: 'PARCIAL', minutosAsistidos: 40, minutosSesion: 120 }]);
    http.verify();
  });
});

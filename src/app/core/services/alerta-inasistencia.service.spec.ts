import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AlertaInasistenciaService } from './alerta-inasistencia.service';
import { environment } from '../../../environments/environment';
import { AlertaInasistencia } from '../models/alerta-inasistencia.model';
import { ApiPageResponse } from '../api/models/api-page-response.model';

describe('AlertaInasistenciaService (CULM-001 C.1)', () => {
  let service: AlertaInasistenciaService;
  let httpMock: HttpTestingController;

  const mockAlerta: AlertaInasistencia = {
    id: 'alt-1',
    tipo: 'ADVERTENCIA',
    nombreTipo: 'Riesgo de pérdida por inasistencia',
    estado: 'VIGENTE',
    mensaje: 'Llevas 16.00% de inasistencia en Bases de datos. Si llegas al 20.00% podrías perder la asignatura.',
    porcentajeCruce: 16,
    porcentajeActual: 16,
    umbral: 15,
    umbralPerdida: 20,
    horasFalta: 4,
    horasDictadas: 25,
    fechaCruceUtc: '2026-11-08T10:00:00Z',
    leida: false,
    fechaLecturaUtc: null,
    grupo: { id: 'grp-1', codigo: 1, nombre: 'G01' },
    asignatura: { id: 'asig-1', nombre: 'Bases de datos' },
    estadoMatricula: 'A',
  };

  const mockResponse: ApiPageResponse<AlertaInasistencia> = {
    exitoso: true,
    elementos: [mockAlerta],
    numeroPagina: 1,
    tamanoPagina: 20,
    totalElementos: 1,
    totalPaginas: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AlertaInasistenciaService],
    });
    service = TestBed.inject(AlertaInasistenciaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('C-F-01 consultar() realiza GET /api/v1/estudiante/alertas con parámetros', () => {
    service
      .consultar({ soloVigentes: true, grupoId: 'grp-1', pagina: 1, tamano: 10 })
      .subscribe((res) => {
        expect(res.elementos.length).toBe(1);
        expect(res.elementos[0].id).toBe('alt-1');
      });

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/estudiante/alertas`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('soloVigentes')).toBe('true');
    expect(req.request.params.get('grupoId')).toBe('grp-1');
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('10');
    req.flush(mockResponse);
  });

  it('C-F-02 contarVigentes() pide soloVigentes=true y tamano=1 y devuelve totalElementos', () => {
    service.contarVigentes().subscribe((total) => {
      expect(total).toBe(1);
    });

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/estudiante/alertas`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('soloVigentes')).toBe('true');
    expect(req.request.params.get('tamano')).toBe('1');
    req.flush(mockResponse);
  });

  it('C-F-03 contarNoLeidas() pide soloNoLeidas=true y tamano=1 y devuelve totalElementos', () => {
    service.contarNoLeidas().subscribe((total) => {
      expect(total).toBe(1);
    });

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/estudiante/alertas`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('soloNoLeidas')).toBe('true');
    expect(req.request.params.get('tamano')).toBe('1');
    req.flush(mockResponse);
  });

  it('C-F-04 propaga errores HTTP de la API', () => {
    let errorActual: unknown;
    service.consultar().subscribe({
      next: () => fail('no debió responder éxito'),
      error: (err) => {
        errorActual = err;
      },
    });

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/estudiante/alertas`);
    req.flush({ code: 'SEC_002', message: 'No tienes acceso al grupo.' }, { status: 403, statusText: 'Forbidden' });
    expect(errorActual).toBeTruthy();
  });
});

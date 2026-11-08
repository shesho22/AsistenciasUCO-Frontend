import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RevisionCancelacionService } from './revision-cancelacion.service';
import { environment } from '../../../environments/environment';
import { RevisionCancelacion } from '../models/revision-cancelacion.model';
import { ApiPageResponse } from '../api/models/api-page-response.model';
import { ApiDataResponse } from '../api/models/api-data-response.model';

describe('RevisionCancelacionService (CULM-001 C.1)', () => {
  let service: RevisionCancelacionService;
  let httpMock: HttpTestingController;

  const mockRevision: RevisionCancelacion = {
    id: 'rev-1',
    estado: 'PROPUESTA',
    nombreEstado: 'Propuesta de cancelación',
    requiereAccionDocente: false,
    requiereAccionResolutor: true,
    esResolutorActual: true,
    accionesPermitidas: ['APROBAR', 'RECHAZAR'],
    perfilResolutorActual: 'COORDINADOR',
    fechaEscalamientoUtc: null,
    estudiante: { id: 'est-1', nombreCompleto: 'Estudiante Ejemplo' },
    estadoMatricula: 'A',
    grupo: { id: 'grp-1', codigo: 1, nombre: 'G01' },
    asignatura: { id: 'asig-1', nombre: 'Bases de datos' },
    docente: { id: 'doc-1', nombreCompleto: 'Docente Titular' },
    programa: { id: 'prg-1', nombre: 'Ingeniería de Sistemas' },
    porcentajeCreacion: 21.43,
    porcentajeActual: 22.5,
    umbralPerdida: 20,
    horasFalta: 9,
    horasDictadas: 40,
    fechaCreacionUtc: '2026-11-08T10:00:00Z',
    decisionDocente: 'PROPONER',
    motivoDocente: 'Inasistencias reiteradas sin justificación',
    fechaDecisionDocenteUtc: '2026-11-08T10:05:00Z',
    decisionResolucion: null,
    motivoResolucion: null,
    resolutor: null,
    fechaResolucionUtc: null,
  };

  const mockPage: ApiPageResponse<RevisionCancelacion> = {
    exitoso: true,
    elementos: [mockRevision],
    numeroPagina: 1,
    tamanoPagina: 20,
    totalElementos: 1,
    totalPaginas: 1,
  };

  const mockData: ApiDataResponse<RevisionCancelacion> = {
    exitoso: true,
    datos: mockRevision,
    mensajeUsuario: 'Decisión registrada',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RevisionCancelacionService],
    });
    service = TestBed.inject(RevisionCancelacionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('C-F-05 decidir() hace PATCH /api/v1/docente/revisiones-cancelacion/{id}', () => {
    service.decidir('rev-1', { decision: 'PROPONER', motivo: 'Superó el 20%' }).subscribe((res) => {
      expect(res.datos.id).toBe('rev-1');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/docente/revisiones-cancelacion/rev-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ decision: 'PROPONER', motivo: 'Superó el 20%' });
    req.flush(mockData);
  });

  it('C-F-06 consultarCoordinador() hace GET /api/v1/coordinador/revisiones-cancelacion con filtros', () => {
    service.consultarCoordinador({ soloPendientes: true, programaId: 'prg-1', pagina: 1, tamano: 20 }).subscribe((res) => {
      expect(res.elementos.length).toBe(1);
    });

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/coordinador/revisiones-cancelacion`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('soloPendientes')).toBe('true');
    expect(req.request.params.get('programaId')).toBe('prg-1');
    req.flush(mockPage);
  });

  it('C-F-07 resolverCoordinador() hace PATCH /api/v1/coordinador/revisiones-cancelacion/{id}', () => {
    service.resolverCoordinador('rev-1', { decision: 'APROBAR', motivo: 'Confirmado por coordinación' }).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/coordinador/revisiones-cancelacion/rev-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ decision: 'APROBAR', motivo: 'Confirmado por coordinación' });
    req.flush(mockData);
  });

  it('C-F-08 consultarDecano() hace GET /api/v1/decano/revisiones-cancelacion con filtros', () => {
    service.consultarDecano({ soloPendientes: true, pagina: 1, tamano: 10 }).subscribe((res) => {
      expect(res.elementos.length).toBe(1);
    });

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/decano/revisiones-cancelacion`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('soloPendientes')).toBe('true');
    req.flush(mockPage);
  });

  it('C-F-09 resolverDecano() hace PATCH /api/v1/decano/revisiones-cancelacion/{id}', () => {
    service.resolverDecano('rev-1', { decision: 'RECHAZAR', motivo: 'Se otorga plazo especial' }).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/decano/revisiones-cancelacion/rev-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ decision: 'RECHAZAR', motivo: 'Se otorga plazo especial' });
    req.flush(mockData);
  });

  it('C-F-10 contarPendientes("COORDINADOR") y contarPendientes("DECANO") consultan el endpoint correspondiente', () => {
    service.contarPendientes('COORDINADOR').subscribe((total) => {
      expect(total).toBe(1);
    });
    const reqCoord = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/coordinador/revisiones-cancelacion`);
    expect(reqCoord.request.params.get('soloPendientes')).toBe('true');
    expect(reqCoord.request.params.get('tamano')).toBe('1');
    reqCoord.flush(mockPage);

    service.contarPendientes('DECANO').subscribe((total) => {
      expect(total).toBe(1);
    });
    const reqDec = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/decano/revisiones-cancelacion`);
    expect(reqDec.request.params.get('soloPendientes')).toBe('true');
    expect(reqDec.request.params.get('tamano')).toBe('1');
    reqDec.flush(mockPage);
  });

  it('C-F-11 propaga errores 409 con el mensaje del backend', () => {
    let errorCapturado: unknown;
    service.resolverCoordinador('rev-1', { decision: 'APROBAR', motivo: 'Aprobado' }).subscribe({
      next: () => fail('no debió responder éxito'),
      error: (err) => {
        errorCapturado = err;
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/coordinador/revisiones-cancelacion/rev-1`);
    req.flush(
      { code: 'RCN_006', message: 'El estudiante ya no supera el límite de inasistencia.' },
      { status: 409, statusText: 'Conflict' }
    );
    expect(errorCapturado).toBeTruthy();
  });
});

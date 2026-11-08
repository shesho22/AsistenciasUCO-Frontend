import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminIndicatorsService } from './admin-indicators.service';
import { environment } from '../../../environments/environment';
import { ComparativaFacultad, KpisInstitucion, PuntoTendencia } from '../models/admin-indicators.model';

describe('AdminIndicatorsService', () => {
  let service: AdminIndicatorsService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/admin`;

  const kpis: KpisInstitucion = {
    idInstitucion: 'i-1', nombreInstitucion: 'Universidad', idPeriodoAcademico: 'per-1', nombrePeriodoAcademico: '2026-2',
    totalFacultades: 3, totalProgramas: 4, totalEstudiantes: 6, estudiantesRegulares: 2, estudiantesRiesgo: 1, estudiantesPerdida: 3, tasaRetencion: 50,
    sesionesEjecutadas: 35, faltasSinJustaCausa: 6, porcentajeAusentismo: 17.14, porcentajeAsistencia: 82.86,
    sesionesVencidas: 12, sesionesConRegistro: 11, porcentajeCumplimiento: 91.67,
    estudiantesConMatriculaActiva: 6, estudiantesRegistrados: 7, docentesConGrupoActivo: 1, docentesRegistrados: 2, umbralAdvertencia: 15, umbralPerdida: 20,
  };
  const facultad: ComparativaFacultad = {
    idFacultad: 'f-1', nombreFacultad: 'Ingenieria', estaActivaFacultad: true, totalProgramas: 3, totalEstudiantes: 6, estudiantesRiesgo: 1, estudiantesPerdida: 3,
    tasaRetencion: 50, sesionesEjecutadas: 35, faltasSinJustaCausa: 6, porcentajeAusentismo: 17.14, horasDictadas: 120, horasFalta: 18,
  };
  const punto: PuntoTendencia = { inicioIntervalo: '2026-03-02', finIntervalo: '2026-03-08', sesionesEjecutadas: 20, faltasSinJustaCausa: 3, porcentajeAusentismo: 15, horasDictadasEstudiante: 100, horasFalta: 15 };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminIndicatorsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consultarKpis publica las cifras sin transformarlas y envía el período solo si se indica', () => {
    service.consultarKpis('per-1').subscribe();
    expect(service.cargando()).toBeTrue();
    const req = http.expectOne((r) => r.url === `${base}/indicadores`);
    expect(req.request.params.get('idPeriodoAcademico')).toBe('per-1');
    req.flush({ exitoso: true, datos: kpis });
    expect(service.kpis()).toEqual(kpis);
    expect(service.cargando()).toBeFalse();

    service.consultarKpis().subscribe();
    const sin = http.expectOne((r) => r.url === `${base}/indicadores`);
    expect(sin.request.params.keys()).toEqual([]);
    sin.flush({ exitoso: true, datos: { ...kpis, porcentajeAusentismo: null, porcentajeCumplimiento: null } });
    expect(service.kpis()?.porcentajeAusentismo).toBeNull();
    expect(service.kpis()?.porcentajeCumplimiento).toBeNull();
  });

  it('consultarKpis propaga el error sin tocar el estado y apaga cargando', () => {
    let fallo: { status?: number } | undefined;
    service.consultarKpis().subscribe({ error: (e) => (fallo = e) });
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ message: 'x' }, { status: 403, statusText: 'Forbidden' });
    expect(fallo?.status).toBe(403);
    expect(service.kpis()).toBeNull();
    expect(service.cargando()).toBeFalse();
  });

  it('consultarComparativa publica las filas tal cual y propaga errores', () => {
    service.consultarComparativa('per-1').subscribe();
    const req = http.expectOne((r) => r.url === `${base}/comparativa-facultades`);
    expect(req.request.params.get('idPeriodoAcademico')).toBe('per-1');
    req.flush({ exitoso: true, datos: [facultad, { ...facultad, idFacultad: 'f-3', tasaRetencion: null, porcentajeAusentismo: null }] });
    expect(service.comparativa().length).toBe(2);
    expect(service.comparativa()[1].porcentajeAusentismo).toBeNull();

    let fallo: { status?: number } | undefined;
    service.consultarComparativa().subscribe({ error: (e) => (fallo = e) });
    const sin = http.expectOne((r) => r.url === `${base}/comparativa-facultades`);
    expect(sin.request.params.keys()).toEqual([]);
    sin.flush({ message: 'x' }, { status: 403, statusText: 'Forbidden' });
    expect(fallo?.status).toBe(403);
    expect(service.comparativa().length).toBe(2);
  });

  it('consultarTendencia envía exactamente la granularidad indicada y publica los puntos', () => {
    for (const g of ['SEMANA', 'MES'] as const) {
      service.consultarTendencia(g, 'per-1').subscribe();
      const req = http.expectOne((r) => r.url === `${base}/tendencia-ausentismo`);
      expect(req.request.params.get('granularidad')).toBe(g);
      expect(req.request.params.get('idPeriodoAcademico')).toBe('per-1');
      req.flush({ exitoso: true, datos: [punto, { ...punto, inicioIntervalo: '2026-03-09', porcentajeAusentismo: null }] });
      expect(service.tendencia().length).toBe(2);
      expect(service.tendencia()[1].porcentajeAusentismo).toBeNull();
    }

    service.consultarTendencia().subscribe();
    const sin = http.expectOne((r) => r.url === `${base}/tendencia-ausentismo`);
    expect(sin.request.params.keys()).toEqual([]);
    sin.flush({ exitoso: true, datos: [] });
    expect(service.tendencia()).toEqual([]);
  });

  it('consultarTendencia propaga el error sin modificar la serie', () => {
    let fallo: { status?: number } | undefined;
    service.consultarTendencia('MES').subscribe({ error: (e) => (fallo = e) });
    http.expectOne((r) => r.url === `${base}/tendencia-ausentismo`).flush({ message: 'x' }, { status: 400, statusText: 'Bad Request' });
    expect(fallo?.status).toBe(400);
    expect(service.tendencia()).toEqual([]);
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanIndicatorsService } from './dean-indicators.service';
import { environment } from '../../../environments/environment';
import { AforoGrupo, ComparativaPrograma, KpisDecano } from '../models/dean-indicators.model';

describe('DeanIndicatorsService', () => {
  let service: DeanIndicatorsService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/decano`;

  const kpis: KpisDecano = {
    idFacultad: 'f-1', nombreFacultad: 'Ingenieria', idPeriodoAcademico: 'per-1', nombrePeriodoAcademico: '2026-2',
    totalProgramas: 3, totalEstudiantes: 6, estudiantesRegulares: 2, estudiantesRiesgo: 1, estudiantesPerdida: 3, tasaRetencion: 50,
    sesionesEjecutadas: 35, faltasSinJustaCausa: 6, porcentajeAusentismo: 17.14, porcentajeAsistencia: 82.86,
    gruposActivos: 3, cupoTotal: 55, matriculadosActivos: 7, tasaAforo: 12.73, umbralAdvertencia: 15, umbralPerdida: 20,
  };
  const programa: ComparativaPrograma = {
    idPrograma: 'p-1', nombrePrograma: 'Sistemas', estaActivoPrograma: true, totalEstudiantes: 5, estudiantesRiesgo: 1, estudiantesPerdida: 2,
    tasaRetencion: 60, sesionesEjecutadas: 33, faltasSinJustaCausa: 5, porcentajeAusentismo: 15.15,
    horasDictadas: 120, horasFalta: 18,
  };
  const grupo: AforoGrupo = {
    idGrupo: 'g-1', codigoGrupo: 931001, idAsignatura: 'a-1', nombreAsignatura: 'Estructuras', programas: ['Sistemas'],
    cupoMaximo: 10, matriculadosActivos: 5, cuposDisponibles: 5, tasaAforo: 50, grupoEstaHabilitado: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    service = TestBed.inject(DeanIndicatorsService);
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
    const sinPeriodo = http.expectOne((r) => r.url === `${base}/indicadores`);
    expect(sinPeriodo.request.params.keys()).toEqual([]);
    sinPeriodo.flush({ exitoso: true, datos: { ...kpis, porcentajeAusentismo: null, tasaAforo: null } });
    expect(service.kpis()?.porcentajeAusentismo).toBeNull();
    expect(service.kpis()?.tasaAforo).toBeNull();
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
    const req = http.expectOne((r) => r.url === `${base}/comparativa-programas`);
    expect(req.request.params.get('idPeriodoAcademico')).toBe('per-1');
    req.flush({ exitoso: true, datos: [programa, { ...programa, idPrograma: 'p-4', tasaRetencion: null, porcentajeAusentismo: null }] });
    expect(service.comparativa().length).toBe(2);
    expect(service.comparativa()[1].porcentajeAusentismo).toBeNull();

    let fallo: { status?: number } | undefined;
    service.consultarComparativa().subscribe({ error: (e) => (fallo = e) });
    const sin = http.expectOne((r) => r.url === `${base}/comparativa-programas`);
    expect(sin.request.params.keys()).toEqual([]);
    sin.flush({ message: 'x' }, { status: 403, statusText: 'Forbidden' });
    expect(fallo?.status).toBe(403);
    expect(service.comparativa().length).toBe(2);
  });

  it('consultarAforo envía solo los filtros presentes (incluido soloHabilitados=false) y publica filas y total', () => {
    service.consultarAforo({ pagina: 2, tamano: 5, idPrograma: 'p-1', idPeriodoAcademico: 'per-1', soloHabilitados: false }).subscribe();
    const req = http.expectOne((r) => r.url === `${base}/aforo-grupos`);
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamano')).toBe('5');
    expect(req.request.params.get('idPrograma')).toBe('p-1');
    expect(req.request.params.get('idPeriodoAcademico')).toBe('per-1');
    expect(req.request.params.get('soloHabilitados')).toBe('false');
    req.flush({ exitoso: true, datos: [grupo], total: 12 });
    expect(service.aforo()).toEqual([grupo]);
    expect(service.totalAforo()).toBe(12);

    service.consultarAforo({ pagina: 1, tamano: 10 }).subscribe();
    const limpia = http.expectOne((r) => r.url === `${base}/aforo-grupos`);
    expect(limpia.request.params.keys().sort()).toEqual(['pagina', 'tamano']);
    limpia.flush({ exitoso: true, datos: [], total: 0 });
    expect(service.aforo()).toEqual([]);
    expect(service.totalAforo()).toBe(0);
  });

  it('consultarAforo propaga el error sin modificar la lista', () => {
    let fallo: { status?: number } | undefined;
    service.consultarAforo({ pagina: 1, tamano: 10 }).subscribe({ error: (e) => (fallo = e) });
    http.expectOne((r) => r.url === `${base}/aforo-grupos`).flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    expect(fallo?.status).toBe(404);
    expect(service.aforo()).toEqual([]);
  });
});

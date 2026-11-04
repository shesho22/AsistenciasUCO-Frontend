import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConsultasTransversalesService } from './consultas-transversales.service';
import { environment } from '../../../environments/environment';

describe('ConsultasTransversalesService (HU112/HU128/HU143/HU157)', () => {
  let service: ConsultasTransversalesService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ConsultasTransversalesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('HU112: pide los programas y créditos del decano con la paginación', () => {
    service.getProgramasCreditos({ pagina: 1, tamano: 100 }).subscribe();
    const req = http.expectOne((r) => r.url === `${api}/decano/programas-creditos`);
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('100');
    req.flush({ exitoso: true, datos: [] });
  });

  it('HU128: envía el programa y omite los filtros vacíos', () => {
    service.getDocentesFacultad({ busqueda: '  ', idPrograma: 'p-1', estaActivo: null, pagina: 2, tamano: 10 }).subscribe();
    const req = http.expectOne((r) => r.url === `${api}/decano/docentes`);
    expect(req.request.params.get('idPrograma')).toBe('p-1');
    expect(req.request.params.has('busqueda')).toBeFalse();
    expect(req.request.params.has('estaActivo')).toBeFalse();
    req.flush({ exitoso: true, datos: [] });
  });

  it('HU143: el decano y el administrador usan su propia ruta', () => {
    service.buscarAsignaturas({ busqueda: 'CAL', pagina: 1, tamano: 10 }).subscribe();
    http.expectOne((r) => r.url === `${api}/decano/asignaturas` && r.params.get('busqueda') === 'CAL').flush({ exitoso: true, datos: [] });

    service.buscarAsignaturas({ idFacultad: 'f-1', estaActiva: false, pagina: 1, tamano: 10 }, true).subscribe();
    const req = http.expectOne((r) => r.url === `${api}/admin/asignaturas`);
    expect(req.request.params.get('idFacultad')).toBe('f-1');
    expect(req.request.params.get('estaActiva')).toBe('false');
    req.flush({ exitoso: true, datos: [] });
  });

  it('HU157: buscador del administrador e historial por rol', () => {
    service.buscarEstudiantes({ busqueda: '101', pagina: 1, tamano: 10 }).subscribe();
    http.expectOne((r) => r.url === `${api}/admin/estudiantes`).flush({ exitoso: true, datos: [] });

    service.getHistorialEstudiante('e-1', true).subscribe();
    http.expectOne(`${api}/admin/estudiantes/e-1/historial`).flush({ exitoso: true, datos: null });

    service.getHistorialEstudiante('e-1').subscribe();
    http.expectOne(`${api}/decano/estudiantes/e-1/historial`).flush({ exitoso: true, datos: null });
  });

  it('HU061: el coordinador y el decano consultan el consolidado por su propia ruta con los filtros', () => {
    service.getConsolidadoAsistencia({ idPeriodoAcademico: 'per-1', idDocente: null, pagina: 1, tamano: 10 }).subscribe();
    const req = http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`);
    expect(req.request.params.get('idPeriodoAcademico')).toBe('per-1');
    expect(req.request.params.has('idDocente')).toBeFalse();
    req.flush({ exitoso: true, datos: [] });

    service.getConsolidadoAsistencia({ pagina: 1, tamano: 10 }, true).subscribe();
    http.expectOne((r) => r.url === `${api}/decano/consolidado-asistencia`).flush({ exitoso: true, datos: [] });
  });

  it('HU172: la auditoría envía el rango, la acción y el filtro de asistencia', () => {
    service
      .getAuditoria({ desde: '2026-11-01T05:00:00.000Z', hasta: '2026-11-04T05:00:00.000Z', accion: 'CREAR_SESION', soloAsistencia: false, pagina: 2, tamano: 25 })
      .subscribe();
    const req = http.expectOne((r) => r.url === `${api}/admin/auditoria`);
    expect(req.request.params.get('desde')).toBe('2026-11-01T05:00:00.000Z');
    expect(req.request.params.get('soloAsistencia')).toBe('false');
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush({ exitoso: true, datos: [] });
  });

  it('HU147: consulta los componentes de formación', () => {
    service.getComponentesFormacion().subscribe((res) => expect(res.datos.length).toBe(1));
    http
      .expectOne(`${api}/coordinador/componentes-formacion`)
      .flush({ exitoso: true, datos: [{ idComponente: 'c', codigo: 'ESP', nombre: 'Específicas', totalAsignaturas: 0 }] });
  });
});

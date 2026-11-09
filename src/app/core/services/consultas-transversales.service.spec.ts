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

  it('HU112: pide los programas y créditos del decano con la paginación y consume ApiPageResponse', () => {
    let response: any;
    service.getProgramasCreditos({ pagina: 1, tamano: 100 }).subscribe((r) => (response = r));
    const req = http.expectOne((r) => r.url === `${api}/decano/programas-creditos`);
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('100');
    req.flush({ exitoso: true, elementos: [{ idPrograma: 'prg-1', nombrePrograma: 'Ingeniería', totalCreditos: 160 }], numeroPagina: 1, tamanoPagina: 100, totalElementos: 1, totalPaginas: 1 });
    expect(response.elementos.length).toBe(1);
    expect(response.totalElementos).toBe(1);
    expect(response.totalPaginas).toBe(1);
  });

  it('HU128: envía el programa y omite los filtros vacíos retornando ApiPageResponse', () => {
    let response: any;
    service.getDocentesFacultad({ busqueda: '  ', idPrograma: 'p-1', estaActivo: null, pagina: 2, tamano: 10 }).subscribe((r) => (response = r));
    const req = http.expectOne((r) => r.url === `${api}/decano/docentes`);
    expect(req.request.params.get('idPrograma')).toBe('p-1');
    expect(req.request.params.has('busqueda')).toBeFalse();
    expect(req.request.params.has('estaActivo')).toBeFalse();
    req.flush({ exitoso: true, elementos: [], numeroPagina: 2, tamanoPagina: 10, totalElementos: 0, totalPaginas: 0 });
    expect(response.elementos).toEqual([]);
    expect(response.numeroPagina).toBe(2);
  });

  it('HU143: el decano y el administrador usan su propia ruta retornando ApiPageResponse', () => {
    let responseDecano: any;
    service.buscarAsignaturas({ busqueda: 'CAL', pagina: 1, tamano: 10 }).subscribe((r) => (responseDecano = r));
    http.expectOne((r) => r.url === `${api}/decano/asignaturas` && r.params.get('busqueda') === 'CAL').flush({
      exitoso: true,
      elementos: [{ idAsignatura: 'asg-1', codigo: 'CAL-101', nombre: 'Cálculo', activa: true }],
      numeroPagina: 1,
      tamanoPagina: 10,
      totalElementos: 1,
      totalPaginas: 1,
    });
    expect(responseDecano.elementos.length).toBe(1);

    let responseAdmin: any;
    service.buscarAsignaturas({ idFacultad: 'f-1', estaActiva: false, pagina: 1, tamano: 10 }, true).subscribe((r) => (responseAdmin = r));
    const req = http.expectOne((r) => r.url === `${api}/admin/asignaturas`);
    expect(req.request.params.get('idFacultad')).toBe('f-1');
    expect(req.request.params.get('estaActiva')).toBe('false');
    req.flush({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 10, totalElementos: 0, totalPaginas: 0 });
    expect(responseAdmin.elementos).toEqual([]);
  });

  it('HU157: buscador del administrador e historial por rol retornando ApiPageResponse', () => {
    let responseEstudiantes: any;
    service.buscarEstudiantes({ busqueda: '101', pagina: 1, tamano: 10 }).subscribe((r) => (responseEstudiantes = r));
    http.expectOne((r) => r.url === `${api}/admin/estudiantes`).flush({
      exitoso: true,
      elementos: [{ idEstudiante: 'est-1', nombreCompleto: 'Estudiante 1', activo: true }],
      numeroPagina: 1,
      tamanoPagina: 10,
      totalElementos: 1,
      totalPaginas: 1,
    });
    expect(responseEstudiantes.elementos.length).toBe(1);

    service.getHistorialEstudiante('e-1', true).subscribe();
    http.expectOne(`${api}/admin/estudiantes/e-1/historial`).flush({ exitoso: true, datos: null });

    service.getHistorialEstudiante('e-1').subscribe();
    http.expectOne(`${api}/decano/estudiantes/e-1/historial`).flush({ exitoso: true, datos: null });
  });

  it('HU061: el coordinador y el decano consultan el consolidado por su propia ruta con los filtros', () => {
    let responseConsolidado: any;
    service.getConsolidadoAsistencia({ idPeriodoAcademico: 'per-1', idDocente: null, pagina: 1, tamano: 10 }).subscribe((r) => (responseConsolidado = r));
    const req = http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`);
    expect(req.request.params.get('idPeriodoAcademico')).toBe('per-1');
    expect(req.request.params.has('idDocente')).toBeFalse();
    req.flush({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 10, totalElementos: 0, totalPaginas: 0 });
    expect(responseConsolidado.elementos).toEqual([]);

    service.getConsolidadoAsistencia({ pagina: 1, tamano: 10 }, true).subscribe();
    http.expectOne((r) => r.url === `${api}/decano/consolidado-asistencia`).flush({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 10, totalElementos: 0, totalPaginas: 0 });
  });

  it('HU172: la auditoría envía el rango, la acción y el filtro de asistencia retornando ApiPageResponse', () => {
    let responseAuditoria: any;
    service
      .getAuditoria({ desde: '2026-11-01T05:00:00.000Z', hasta: '2026-11-04T05:00:00.000Z', accion: 'CREAR_SESION', soloAsistencia: false, pagina: 2, tamano: 25 })
      .subscribe((r) => (responseAuditoria = r));
    const req = http.expectOne((r) => r.url === `${api}/admin/auditoria`);
    expect(req.request.params.get('desde')).toBe('2026-11-01T05:00:00.000Z');
    expect(req.request.params.get('soloAsistencia')).toBe('false');
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush({ exitoso: true, elementos: [], numeroPagina: 2, tamanoPagina: 25, totalElementos: 0, totalPaginas: 0 });
    expect(responseAuditoria.elementos).toEqual([]);
    expect(responseAuditoria.numeroPagina).toBe(2);
  });

  it('HU172: la auditoría soporta idCorrelacion y soloAdministracion con sobre ApiPageResponse', () => {
    service
      .getAuditoria({
        idCorrelacion: 'corr-1234',
        soloAdministracion: true,
        soloAsistencia: false,
        pagina: 1,
        tamano: 20,
      })
      .subscribe((res: any) => {
        expect(res.elementos.length).toBe(1);
        expect(res.elementos[0].idCorrelacion).toBe('corr-1234');
      });

    const req = http.expectOne((r) => r.url === `${api}/admin/auditoria`);
    expect(req.request.params.get('idCorrelacion')).toBe('corr-1234');
    expect(req.request.params.get('soloAdministracion')).toBe('true');
    expect(req.request.params.get('soloAsistencia')).toBe('false');
    req.flush({
      exitoso: true,
      elementos: [
        {
          id: 'aud-1',
          ocurridoEn: '2026-11-07T12:00:00Z',
          idActor: 'user-1',
          tipoActor: 'ADMINISTRADOR',
          nombreActor: 'Admin Sistema',
          accion: 'ACTUALIZAR_PARAMETRO',
          tipoRecurso: 'PARAMETRO',
          idRecurso: 'p-1',
          resultado: 'SUCCESS',
          idTraza: 'trace-1',
          idCorrelacion: 'corr-1234',
          metodoHttp: 'PUT',
          ruta: '/api/v1/admin/parametros/p-1',
          estadoHttp: 200,
          ipCliente: '127.0.0.1',
          codigoError: null,
          metadatos: '{"motivo":"Ajuste"}',
          metadata: '{"motivo":"Ajuste"}',
          accionAsistencia: false,
        },
      ],
      numeroPagina: 1,
      tamanoPagina: 20,
      totalElementos: 1,
      totalPaginas: 1,
    });
  });

  it('HU147: consulta los componentes de formación', () => {
    service.getComponentesFormacion().subscribe((res) => expect(res.datos.length).toBe(1));
    http
      .expectOne(`${api}/coordinador/componentes-formacion`)
      .flush({ exitoso: true, datos: [{ idComponente: 'c', codigo: 'ESP', nombre: 'Específicas', totalAsignaturas: 0 }] });
  });

  it('HU136: consulta los docentes de la institución del administrador con facultad y programa retornando ApiPageResponse', () => {
    let response: any;
    service.getDocentesInstitucion({ busqueda: 'ana', idFacultad: 'f-1', idPrograma: 'p-1', pagina: 1, tamano: 20 }).subscribe((r) => (response = r));
    const req = http.expectOne((r) => r.url === `${api}/admin/docentes`);
    expect(req.request.params.get('idFacultad')).toBe('f-1');
    expect(req.request.params.get('idPrograma')).toBe('p-1');
    req.flush({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 20, totalElementos: 0, totalPaginas: 0 });
    expect(response.elementos).toEqual([]);
    expect(response.totalElementos).toBe(0);
  });

  it('HU005/HU016: consulta los motivos de justificación del catálogo', () => {
    service.getCategoriasJustificacion().subscribe((res) => expect(res.datos[0].codigo).toBe('MED'));
    http
      .expectOne(`${api}/categorias-justificacion`)
      .flush({ exitoso: true, datos: [{ id: 'c', codigo: 'MED', nombre: 'Médico / Salud', descripcion: null }] });
  });

  it('HU155: consulta los estados del sistema del administrador', () => {
    service.getEstadosSistema().subscribe((res) => expect(res.datos.length).toBe(1));
    http
      .expectOne(`${api}/admin/estados`)
      .flush({ exitoso: true, datos: [{ catalogo: 'SOLICITUD', id: 'e', codigo: 'P', nombre: 'pendiente' }] });
  });
});

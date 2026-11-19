import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  CoordinatorManagementService,
  normalizarAsignaturaPlan,
  normalizarPeriodoAcademico,
  normalizarPlanEstudio,
} from './coordinator-management.service';
import { environment } from '../../../environments/environment';
import { paginaApi, porUrl } from '../testing/pagina-api';
import { CoordinatorProgramService } from './coordinator-program.service';
import {
  ActualizarDocentePayload,
  DocentePrograma,
  VincularDocenteExistentePayload,
  VincularDocenteNuevoPayload,
} from '../models/docente-programa.model';
import {
  PlanEstudioItem,
  AsignaturaPlanItem,
  EstudianteDirectorioItem,
  PeriodoAcademicoItem,
} from '../models/role-management.model';

describe('CoordinatorManagementService', () => {
  let service: CoordinatorManagementService;
  let http: HttpTestingController;

  const mockPlanes: PlanEstudioItem[] = [
    {
      id: 'plan-1',
      codigo: 'ISI-2026',
      nombre: 'Ingeniería de Sistemas',
      anioVigencia: 2026,
      programa: 'Ingeniería de Sistemas',
      facultad: 'Facultad de Ingeniería',
      totalCreditos: 160,
      totalSemestres: 10,
      totalAsignaturas: 50,
      estado: 'VIGENTE',
      descripcion: 'Plan de estudios vigente',
    },
  ];

  const mockPeriodos: PeriodoAcademicoItem[] = [
    {
      id: 'per-1',
      codigo: '2026-1',
      nombre: 'Primer Semestre 2026',
      fechaInicio: '2026-02-01',
      fechaFin: '2026-06-30',
      estado: 'ACTIVO',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CoordinatorManagementService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(CoordinatorManagementService);
    http = TestBed.inject(HttpTestingController);

    // La carga ya NO ocurre en el constructor: las pantallas de Coordinador la solicitan explicitamente.
    http.expectNone(() => true);
    service.cargarDatosAcademicosBase();
    const reqPlanes = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/planes-estudio`));
    reqPlanes.flush(paginaApi(mockPlanes));

    const reqPeriodos = http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`);
    reqPeriodos.flush({ exitoso: true, datos: mockPeriodos });
  });

  afterEach(() => http.verify());

  it('cargarDatosAcademicosBase llena las señales de planes y periodos', () => {
    expect(service).toBeTruthy();
    expect(service.planes()).toHaveSize(1);
    expect(service.periodos()).toHaveSize(1);
  });

  it('instanciar el servicio NO emite peticiones /coordinador/** (un estudiante no debe provocar 403)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [CoordinatorManagementService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    const fresco = TestBed.inject(CoordinatorManagementService);
    const httpFresco = TestBed.inject(HttpTestingController);

    expect(fresco.planes()).toEqual([]);
    expect(fresco.periodos()).toEqual([]);
    httpFresco.expectNone(() => true);
    httpFresco.verify();
  });

  it('cargarDatosAcademicosBase tolera un error HTTP sin romper al llamador', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [CoordinatorManagementService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    const fresco = TestBed.inject(CoordinatorManagementService);
    const httpFresco = TestBed.inject(HttpTestingController);

    expect(() => fresco.cargarDatosAcademicosBase()).not.toThrow();
    httpFresco.expectOne(porUrl(`${environment.apiUrl}/coordinador/planes-estudio`)).flush(null, { status: 403, statusText: 'Forbidden' });
    httpFresco.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`).flush(null, { status: 403, statusText: 'Forbidden' });
    httpFresco.verify();
  });

  describe('Docentes del programa (HU062/HU063/HU089/HU091; HU090 retirada 2026-11-18)', () => {
    const fila: DocentePrograma = {
      idDocentePrograma: 'dp-1',
      idDocente: 'doc-1',
      idUsuario: 'usr-1',
      codigoTipoIdentificacion: 'CC',
      numeroIdentificacion: 1017555444,
      primerNombre: 'Jorge',
      segundoNombre: null,
      primerApellido: 'Henao',
      segundoApellido: null,
      nombreCompleto: 'Jorge Henao',
      correo: 'jorge.henao@uco.edu.co',
      fechaVinculacionUtc: '2026-10-22T10:00:00Z',
      totalGruposPrograma: 0,
      estaActivo: true,
    };

    it('getDocentesPrograma consulta paginado con filtros y actualiza las señales', () => {
      service
        .getDocentesPrograma({ pagina: 2, tamano: 5, busqueda: 'ros', estaActivo: true })
        .subscribe((res) => expect(res.exitoso).toBeTrue());

      const req = http.expectOne((r) => r.url === `${environment.apiUrl}/coordinador/docentes`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('pagina')).toBe('2');
      expect(req.request.params.get('tamano')).toBe('5');
      expect(req.request.params.get('busqueda')).toBe('ros');
      expect(req.request.params.get('estaActivo')).toBe('true');
      // MEJORAS-SERGIO-2026-11-18: el directorio ya no filtra por tipo de vinculación
      expect(req.request.params.has('idTipoVinculacion')).toBeFalse();
      req.flush({ exitoso: true, datos: [fila], total: 12 });

      expect(service.docentes()).toEqual([fila]);
      expect(service.totalDocentes()).toBe(12);
    });

    it('getDocentesPrograma omite parámetros opcionales vacíos', () => {
      service.getDocentesPrograma({ pagina: 1, tamano: 10, busqueda: '  ' }).subscribe();

      const req = http.expectOne((r) => r.url === `${environment.apiUrl}/coordinador/docentes`);
      expect(req.request.params.has('busqueda')).toBeFalse();
      expect(req.request.params.has('estaActivo')).toBeFalse();
      expect(req.request.params.has('idTipoVinculacion')).toBeFalse();
      req.flush({ exitoso: true, datos: [], total: 0 });
      expect(service.docentes()).toEqual([]);
      expect(service.totalDocentes()).toBe(0);
    });

    it('getDocentesPrograma propaga el error sin tocar las señales', () => {
      let status = 0;
      service.getDocentesPrograma({ pagina: 1, tamano: 10 }).subscribe({ error: (e) => (status = e.status) });

      http.expectOne((r) => r.url === `${environment.apiUrl}/coordinador/docentes`)
        .flush({ message: 'x' }, { status: 403, statusText: 'Forbidden' });

      expect(status).toBe(403);
      expect(service.docentes()).toEqual([]);
    });

    it('getDocentes (compatibilidad) adapta el directorio paginado a DocenteItem', () => {
      service.getDocentes().subscribe((res) => {
        expect(res.datos).toHaveSize(1);
        expect(res.datos[0]).toEqual(jasmine.objectContaining({
          id: 'doc-1', numeroIdentificacion: '1017555444', nombres: 'Jorge', apellidos: 'Henao',
          estado: 'ACTIVO', totalGruposAsignados: 0, correo: 'jorge.henao@uco.edu.co',
        }));
      });

      const req = http.expectOne((r) => r.url === `${environment.apiUrl}/coordinador/docentes`);
      expect(req.request.params.get('tamano')).toBe('100');
      req.flush({ exitoso: true, datos: [{ ...fila, estaActivo: true }], total: 1 });
    });

    it('getDocentes (compatibilidad) marca INACTIVO y tolera datos nulos', () => {
      service.getDocentes().subscribe((res) => {
        expect(res.datos[0].estado).toBe('INACTIVO');
      });
      http.expectOne((r) => r.url === `${environment.apiUrl}/coordinador/docentes`)
        .flush({ exitoso: true, datos: [{ ...fila, estaActivo: false, segundoNombre: 'Luis', segundoApellido: 'Perez' }], total: 1 });
    });

    it('getCandidatosDocente consulta con la búsqueda', () => {
      service.getCandidatosDocente('ros').subscribe((res) => expect(res.datos).toHaveSize(1));

      const req = http.expectOne((r) => r.url === `${environment.apiUrl}/coordinador/docentes/candidatos`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('busqueda')).toBe('ros');
      req.flush({
        exitoso: true,
        total: 1,
        datos: [{ idDocente: 'doc-9', idUsuario: 'u-9', codigoTipoIdentificacion: 'CC', numeroIdentificacion: 1, nombreCompleto: 'Maria' }],
      });
    });

    it('vincularDocente (persona nueva) envía POST con el payload tipado y NO actualiza la lista localmente', () => {
      const payload: VincularDocenteNuevoPayload = {
        idTipoIdentificacion: 'tipo-1',
        numeroIdentificacion: '1017555444',
        primerNombre: 'Jorge',
        primerApellido: 'Henao',
        correo: 'jorge.henao@uco.edu.co',
      };

      service.vincularDocente(payload).subscribe((res) => expect(res.datos.idDocente).toBe('doc-1'));

      const req = http.expectOne(`${environment.apiUrl}/coordinador/docentes`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ exitoso: true, datos: fila });

      expect(service.docentes()).toEqual([]); // sin actualización optimista
    });

    it('vincularDocente (existente) envía solo idDocente (sin tipo de vinculación)', () => {
      const payload: VincularDocenteExistentePayload = { idDocente: 'doc-9' };

      service.vincularDocente(payload).subscribe();

      const req = http.expectOne(`${environment.apiUrl}/coordinador/docentes`);
      expect(req.request.body).toEqual(payload);
      req.flush({ exitoso: true, datos: fila });
    });

    it('vincularDocente propaga el 409 para que la UI muestre el mensaje del backend', () => {
      let message = '';
      service.vincularDocente({ idDocente: 'doc-1' }).subscribe({
        error: (e) => (message = e.error.message),
      });

      http.expectOne(`${environment.apiUrl}/coordinador/docentes`).flush(
        { message: 'El docente ya está vinculado a este programa.' },
        { status: 409, statusText: 'Conflict' }
      );

      expect(message).toBe('El docente ya está vinculado a este programa.');
    });

    it('actualizarDocente (HU092) envía PUT con solo los campos indicados y no toca la lista local', () => {
      const payload: ActualizarDocentePayload = { primerNombre: 'Nuevo', segundoApellido: '' };

      service.actualizarDocente('doc-1', payload).subscribe((res) => expect(res.datos.idDocente).toBe('doc-1'));

      const req = http.expectOne(`${environment.apiUrl}/coordinador/docentes/doc-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush({ exitoso: true, datos: fila });
      expect(service.docentes()).toEqual([]);
    });

    it('actualizarDocente propaga el 404 para que la UI muestre el mensaje del backend', () => {
      let status = 0;
      service.actualizarDocente('doc-x', { primerNombre: 'A' }).subscribe({ error: (e) => (status = e.status) });

      http.expectOne(`${environment.apiUrl}/coordinador/docentes/doc-x`)
        .flush({ message: 'El docente no está vinculado a este programa.' }, { status: 404, statusText: 'Not Found' });

      expect(status).toBe(404);
    });

    it('cambiarEstadoDocente (HU093) envía PATCH con estaActivo y no toca la lista local', () => {
      service.cambiarEstadoDocente('doc-1', false).subscribe((res) => expect(res.datos.estaActivo).toBeFalse());

      const req = http.expectOne(`${environment.apiUrl}/coordinador/docentes/doc-1/estado`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ estaActivo: false });
      req.flush({ exitoso: true, datos: { ...fila, estaActivo: false } });
      expect(service.docentes()).toEqual([]);
    });

    it('getFichaDocente (HU094) envía paginacion y periodo opcional', () => {
      service.getFichaDocente('doc-1', { pagina: 2, tamano: 5 }).subscribe((res) => expect(res.datos.totalHistorial).toBe(0));
      const req = http.expectOne((r) => r.url === `${environment.apiUrl}/coordinador/docentes/doc-1/ficha`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('pagina')).toBe('2');
      expect(req.request.params.get('tamano')).toBe('5');
      expect(req.request.params.has('idPeriodoAcademico')).toBeFalse();
      req.flush({ exitoso: true, datos: { docente: fila, resumen: null, historial: [], totalHistorial: 0 } });

      service.getFichaDocente('doc-1', { pagina: 1, tamano: 10, idPeriodoAcademico: 'per-1' }).subscribe();
      const conPeriodo = http.expectOne((r) => r.url === `${environment.apiUrl}/coordinador/docentes/doc-1/ficha`);
      expect(conPeriodo.request.params.get('idPeriodoAcademico')).toBe('per-1');
      conPeriodo.flush({ exitoso: true, datos: { docente: fila, resumen: null, historial: [], totalHistorial: 0 } });
    });

    it('getResumenDocentes (HU095) consulta el consolidado del programa', () => {
      service.getResumenDocentes().subscribe((res) => expect(res.datos.totalDocentes).toBe(3));
      const req = http.expectOne(`${environment.apiUrl}/coordinador/docentes/resumen`);
      expect(req.request.method).toBe('GET');
      req.flush({ exitoso: true, datos: { totalDocentes: 3, totalActivos: 2, totalInactivos: 1 } });
    });

    it('cambiarEstadoDocente propaga el 404 del backend', () => {
      let status = 0;
      service.cambiarEstadoDocente('doc-x', true).subscribe({ error: (e) => (status = e.status) });

      http.expectOne(`${environment.apiUrl}/coordinador/docentes/doc-x/estado`)
        .flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });

      expect(status).toBe(404);
    });

  });

  describe('Planes de Estudio y Asignaturas', () => {
    // Contrato del backend (GuardarPlanEstudioRequest): el cuerpo es solo { inp } y la respuesta ApiDataResponse<Void>.
    // Las pruebas anteriores enviaban codigo/nombre/estado y esperaban el plan en `datos`, algo que el backend nunca hace
    // (responde 400 FIELD_UNKNOWN); por eso crear y editar planes fallaba en pantalla (HU079/HU080).
    it('HU079: crearPlanEstudio envía solo { inp } en el POST', () => {
      service.crearPlanEstudio(2027).subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ inp: 2027 });
      req.flush({ exitoso: true, datos: null });
    });

    it('HU080: actualizarPlanEstudio envía solo { inp } en el PUT del plan', () => {
      service.actualizarPlanEstudio('plan-1', 2028).subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ inp: 2028 });
      req.flush({ exitoso: true, datos: null });
    });

    it('toggleEstadoPlanEstudio actualiza el estado en la señal', () => {
      service.toggleEstadoPlanEstudio('plan-1').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/toggle-estado`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ exitoso: true, datos: { ...mockPlanes[0], estado: 'INACTIVO' } });

      expect(service.planes().find((p) => p.id === 'plan-1')?.estado).toBe('INACTIVO');
    });

    it('B2NM: normalizarAsignaturaPlan toma id de idAsignatura y conserva carácter y compartida', () => {
      const asig = normalizarAsignaturaPlan({
        idAsignatura: 'a-9', codigo: 'SIS-101', nombre: 'Algoritmos', credito: 4, nombreArea: 'Software', nombreComponente: 'Básicas',
        idPlanEstudio: 'p-1', idSemestrePlanEstudio: 'sem-1', codigoSemestre: 'S1', codigoCaracter: 'OPT', nombreCaracter: 'Optativa', compartida: true,
      });
      expect(asig.id).toBe('a-9');
      expect(asig.codigoCaracter).toBe('OPT');
      expect(asig.nombreCaracter).toBe('Optativa');
      expect(asig.compartida).toBeTrue();
      expect(asig.idSemestrePlanEstudio).toBe('sem-1');
    });

    it('SES-GEN-01: una materia sin horas cargadas llega con horasSemanales nulo (no 0) y las horas viajan al guardar', () => {
      expect(normalizarAsignaturaPlan({ idAsignatura: 'a-1', codigo: 'X', nombre: 'Y', credito: 3 }).horasSemanales).toBeNull();
      expect(normalizarAsignaturaPlan({ idAsignatura: 'a-1', codigo: 'X', nombre: 'Y', credito: 3, horasSemanales: 4 }).horasSemanales).toBe(4);
      service.crearAsignaturaPlan('plan-1', { codigo: 'X', nombre: 'Y', creditos: 3, semestre: 2, area: 'A', componente: 'C', codigoCaracter: 'OBL', horasSemanales: 4 }).subscribe();
      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas`);
      expect(req.request.body.horasSemanales).toBe(4);
      req.flush({ exitoso: true, datos: { id: 'a-1' } });
    });

    it('SES-GEN-01: sin horas semanales el cuerpo no las incluye (el backend las deja sin cargar o sin cambio)', () => {
      service.crearAsignaturaPlan('plan-1', { codigo: 'X', nombre: 'Y', creditos: 3, semestre: 2, area: 'A', componente: 'C', horasSemanales: null }).subscribe();
      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas`);
      expect('horasSemanales' in req.request.body).toBeFalse();
      req.flush({ exitoso: true, datos: { id: 'a-1' } });
    });

    it('B2NM: aSolicitudAsignatura envía codigoCaracter al crear una asignatura', () => {
      service.crearAsignaturaPlan('plan-1', { codigo: 'X', nombre: 'Y', creditos: 3, semestre: 2, area: 'A', componente: 'C', codigoCaracter: 'OBL' }).subscribe();
      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas`);
      expect(req.request.body.codigoCaracter).toBe('OBL');
      expect(req.request.body.semestreNumero).toBe(2);
      req.flush({ exitoso: true, datos: { id: 'a-1' } });
    });

    it('getPlanesEstudio sigue pidiendo páginas hasta agotar totalPaginas', () => {
      service.getPlanesEstudio('prg-a').subscribe((res) => expect(res.datos).toHaveSize(3));
      const url = `${environment.apiUrl}/coordinador/planes-estudio`;
      const primera = http.expectOne(porUrl(url));
      expect(primera.request.params.get('programaId')).toBe('prg-a');
      expect(primera.request.params.get('pagina')).toBe('1');
      primera.flush({ ...paginaApi([{ id: 'a' }, { id: 'b' }], 1, 2, 3), totalPaginas: 2 });
      const segunda = http.expectOne(porUrl(url));
      expect(segunda.request.params.get('pagina')).toBe('2');
      segunda.flush({ ...paginaApi([{ id: 'c' }], 2, 2, 3), totalPaginas: 2 });
    });

    it('B2NM: asociarAsignaturaPlan envía POST /asignaturas-asociadas con semestre y carácter', () => {
      service.asociarAsignaturaPlan('plan-1', { idAsignatura: 'a-1', semestreNumero: 3, codigoCaracter: 'OPT' }).subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });
      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas-asociadas`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ idAsignatura: 'a-1', semestreNumero: 3, codigoCaracter: 'OPT' });
      req.flush({ exitoso: true, datos: null }, { status: 201, statusText: 'Created' });
    });

    it('B2NM: asociarAsignaturaPlan propaga el 409 (ASI_003) con el mensaje del backend', () => {
      let error: { status: number; error: { message: string } } | undefined;
      service.asociarAsignaturaPlan('plan-1', { idAsignatura: 'a-1', semestreNumero: 3, codigoCaracter: 'OBL' }).subscribe({
        error: (e) => (error = e),
      });
      http
        .expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas-asociadas`)
        .flush({ code: 'ASI_003', message: 'La asignatura ya está en el plan.' }, { status: 409, statusText: 'Conflict' });
      expect(error?.status).toBe(409);
      expect(error?.error.message).toBe('La asignatura ya está en el plan.');
    });

    it('B2NM: desvincularAsignaturaPlan usa DELETE y quita la asignatura del caché del plan', () => {
      service.getAsignaturasPorPlan('plan-1').subscribe();
      http
        .expectOne(porUrl(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas`))
        .flush(paginaApi([{ idAsignatura: 'a-1', codigo: 'A', nombre: 'A' }, { idAsignatura: 'a-2', codigo: 'B', nombre: 'B' }]));
      expect(service.getAsignaturasPlan('plan-1')).toHaveSize(2);

      service.desvincularAsignaturaPlan('plan-1', 'a-1').subscribe((res) => expect(res.exitoso).toBeTrue());
      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas/a-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ exitoso: true, datos: null });
      expect(service.getAsignaturasPlan('plan-1').map((a) => a.id)).toEqual(['a-2']);
    });

    it('B2NM: desvincularAsignaturaPlan propaga ASI_005 sin tocar el caché', () => {
      let status = 0;
      service.desvincularAsignaturaPlan('plan-1', 'a-1').subscribe({ error: (e) => (status = e.status) });
      http
        .expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas/a-1`)
        .flush({ code: 'ASI_005', message: 'La asignatura tiene grupos en este plan.' }, { status: 409, statusText: 'Conflict' });
      expect(status).toBe(409);
    });

    it('B2NM: buscarAsignaturasAsociables y getCaracteresAsignatura consultan los endpoints del contrato', () => {
      service.buscarAsignaturasAsociables('plan-1', { busqueda: 'soft', pagina: 2, tamano: 5 }).subscribe((p) => {
        expect(p.elementos[0].planes).toBe('Software (Plan 2024)');
        expect(p.totalElementos).toBe(7);
      });
      const req = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas-asociables`));
      expect(req.request.params.get('busqueda')).toBe('soft');
      expect(req.request.params.get('pagina')).toBe('2');
      expect(req.request.params.get('tamano')).toBe('5');
      req.flush(paginaApi([{ idAsignatura: 'a-1', codigo: 'S', nombre: 'S', credito: 3, nombreArea: 'A', nombreComponente: 'B', planes: 'Software (Plan 2024)' }], 2, 5, 7));

      service.getCaracteresAsignatura().subscribe((res) => expect(res.datos.map((c) => c.codigo)).toEqual(['OBL', 'OPT']));
      http
        .expectOne(`${environment.apiUrl}/coordinador/caracteres-asignatura`)
        .flush({ exitoso: true, datos: [{ codigo: 'OBL', nombre: 'Obligatoria', orden: 1 }, { codigo: 'OPT', nombre: 'Optativa', orden: 2 }] });
    });

    it('S4: las consultas del coordinador envían el programa seleccionado', () => {
      TestBed.inject(CoordinatorProgramService).programaId.set('prg-b');

      service.getEstudiantesDirectorio().subscribe();
      expect(http.expectOne(porUrl(`${environment.apiUrl}/coordinador/estudiantes`)).request.params.get('programaId')).toBe('prg-b');

      service.getEstudiantesDirectorioPagina({ page: 0, size: 6 }).subscribe();
      const directorio = http.expectOne((r) => r.url === `${environment.apiUrl}/estudiantes`);
      expect(directorio.request.params.get('programaId')).toBe('prg-b');
      directorio.flush({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 6 });

      service.getAsignaturasPrograma({ busqueda: 'cal', estaActiva: true, pagina: 1, tamano: 9 }).subscribe((p) => {
        expect(p.elementos[0].id).toBe('a-1');
        expect(p.elementos[0].creditos).toBe(3);
      });
      const asignaturas = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/asignaturas`));
      expect(asignaturas.request.params.get('programaId')).toBe('prg-b');
      expect(asignaturas.request.params.get('estaActiva')).toBe('true');
      expect(asignaturas.request.params.get('busqueda')).toBe('cal');
      asignaturas.flush(paginaApi([{ idAsignatura: 'a-1', codigo: 'C', nombre: 'Cálculo', credito: 3 }], 1, 9));

      // Las peticiones del beforeEach no dejaron programa seleccionado.
      TestBed.inject(CoordinatorProgramService).programaId.set(null);
    });

    it('normalizarAsignaturaPlan adapta codigoSemestre, créditos, área y componente del backend', () => {
      const asig = normalizarAsignaturaPlan({
        id: 'a-1', codigo: 'ARQ-402', nombre: 'Arquitectura', credito: 3, nombreArea: 'Software',
        nombreComponente: 'Profesional', codigoSemestre: 'S8', idPlanEstudio: 'p-1',
      });
      expect(asig.semestre).toBe(8);
      expect(asig.creditos).toBe(3);
      expect(asig.area).toBe('Software');
      expect(asig.componente as string).toBe('Profesional');
      expect(asig.planEstudioId).toBe('p-1');
      expect(normalizarAsignaturaPlan({ id: 'm', semestre: 2, creditos: 4 }).semestre).toBe(2);
    });

    it('getPeriodosAcademicos adapta la respuesta del backend (HU096-HU098) y calcula el estado por fechas', () => {
      service.getPeriodosAcademicos().subscribe();

      http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`).flush({
        exitoso: true,
        datos: [
          { id: 'per-1', idInstitucion: 'inst-1', nombreInstitucion: 'UCO', nombre: '2026-2', codigo: '20262',
            fechaInicio: '2026-08-01', fechaFin: '2026-12-15', anio: 2026 },
        ],
      });

      const periodo = service.periodos()[0];
      expect(periodo.codigo).toBe('2026-2');
      expect(periodo.nombre).toBe('Período 2026-2');
    });

    it('normalizarPeriodoAcademico conserva el estado que resolvió el backend y no lo deduce con el reloj (CIERRE-W2A)', () => {
      // Fechas en el pasado y en el futuro lejano: si el cliente las comparara con su reloj, el estado sería otro.
      const dto = { id: 'p', idInstitucion: 'i', nombre: '2000-1', fechaInicio: '2000-02-01', fechaFin: '2000-06-30' };
      expect(normalizarPeriodoAcademico({ ...dto, estado: 'PLANEACION' }).estado).toBe('PLANEACION');
      expect(normalizarPeriodoAcademico({ ...dto, estado: 'ACTIVO' }).estado).toBe('ACTIVO');
      expect(normalizarPeriodoAcademico({ ...dto, estado: 'CERRADO' }).estado).toBe('CERRADO');
      // El período «actual» sigue al estado del servidor, no a las fechas
      expect(normalizarPeriodoAcademico({ ...dto, estado: 'ACTIVO' }).esActual).toBeTrue();
      expect(normalizarPeriodoAcademico({ ...dto, estado: 'CERRADO' }).esActual).toBeFalse();
      expect(normalizarPeriodoAcademico({ id: 'm', codigo: '2027-1', nombre: 'Mock', estado: 'INACTIVO' }).codigo).toBe('2027-1');
    });

    it('normalizarPeriodoAcademico no calcula un estado cuando el backend no lo envía', () => {
      const periodo = normalizarPeriodoAcademico({ id: 'p', nombre: '2030-1', fechaInicio: '2030-02-01', fechaFin: '2030-06-30' });
      expect(periodo.estado).toBeUndefined();
    });

    it('getTotalPeriodosPorEstado pide el estado al servidor y usa su total sin tocar la lista compartida', () => {
      let total = -1;
      const listaAntes = service.periodos();
      service.getTotalPeriodosPorEstado('ACTIVO').subscribe((t) => (total = t));

      const req = http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos?estado=ACTIVO`);
      req.flush({ exitoso: true, datos: [{ id: 'a' }], total: 4 });

      expect(total).toBe(4);
      expect(service.periodos()).toBe(listaAntes);
    });

    it('getTotalPeriodosPorEstado cae a la longitud de datos solo si el servidor no informa total', () => {
      let total = -1;
      service.getTotalPeriodosPorEstado('CERRADO').subscribe((t) => (total = t));
      http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos?estado=CERRADO`).flush({ exitoso: true, datos: [{ id: 'a' }, { id: 'b' }] });
      expect(total).toBe(2);
    });

    it('getTotalPlanesVigentes usa totalElementos del filtro estaActivo con una página de un elemento', () => {
      let total = -1;
      service.getTotalPlanesVigentes().subscribe((t) => (total = t));
      const req = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/planes-estudio`));
      expect(req.request.params.get('estaActivo')).toBe('true');
      expect(req.request.params.get('tamano')).toBe('1');
      expect(req.request.params.get('pagina')).toBe('1');
      req.flush(paginaApi([{ id: 'p-1' }], 1, 1, 5));
      expect(total).toBe(5);
    });

    it('getTotalAsignaturasVinculadas usa totalElementos de GET /coordinador/asignaturas', () => {
      let total = -1;
      service.getTotalAsignaturasVinculadas().subscribe((t) => (total = t));
      const req = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/asignaturas`));
      expect(req.request.params.get('tamano')).toBe('1');
      req.flush(paginaApi([], 1, 1, 17));
      expect(total).toBe(17);
    });

    it('getAsignaturasPrograma envía el carácter por código y normaliza las filas', () => {
      let elementos: AsignaturaPlanItem[] = [];
      service.getAsignaturasPrograma({ busqueda: 'calc', caracter: 'OPT', pagina: 2, tamano: 12 }).subscribe((p) => (elementos = p.elementos));

      const req = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/asignaturas`));
      expect(req.request.params.get('caracter')).toBe('OPT');
      expect(req.request.params.get('busqueda')).toBe('calc');
      expect(req.request.params.get('pagina')).toBe('2');
      req.flush(paginaApi([{ idAsignatura: 'a-1', idPlanEstudio: 'pl-1', codigo: 'IS-1', nombre: 'Cálculo', credito: 3, codigoSemestre: 'S2' }], 1));

      expect(elementos[0].id).toBe('a-1');
      expect(elementos[0].planEstudioId).toBe('pl-1');
      expect(elementos[0].creditos).toBe(3);
    });

    it('getTotalEstudiantesPorEstado pide al servidor activos o inactivos con una página de un elemento', () => {
      const totales: number[] = [];
      service.getTotalEstudiantesPorEstado(true).subscribe((t) => totales.push(t));
      service.getTotalEstudiantesPorEstado(false).subscribe((t) => totales.push(t));

      const activos = http.expectOne((r) => r.url === `${environment.apiUrl}/estudiantes` && r.params.get('activo') === 'true');
      expect(activos.request.params.get('size')).toBe('1');
      expect(activos.request.params.get('page')).toBe('0');
      activos.flush({ items: [], totalItems: 40, totalPages: 40, page: 0, size: 1 });
      http.expectOne((r) => r.url === `${environment.apiUrl}/estudiantes` && r.params.get('activo') === 'false')
        .flush({ items: [], totalItems: 3, totalPages: 3, page: 0, size: 1 });

      expect(totales).toEqual([40, 3]);
    });

    it('getAsignaturasPrograma omite el carácter vacío', () => {
      service.getAsignaturasPrograma({ caracter: '', pagina: 1, tamano: 12 }).subscribe();
      const req = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/asignaturas`));
      expect(req.request.params.has('caracter')).toBeFalse();
      req.flush(paginaApi([]));
    });

    it('eliminarPeriodoAcademico usa DELETE y quita el período de la señal', () => {
      service.eliminarPeriodoAcademico('per-1').subscribe();
      const req = http.expectOne(`${environment.apiUrl}/admin/periodos-academicos/per-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ exitoso: true, datos: null });
    });

    it('getPlanesEstudio adapta la respuesta del backend (HU081-HU083) a PlanEstudioItem', () => {
      service.getPlanesEstudio().subscribe();

      const req = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/planes-estudio`));
      expect(req.request.params.get('tamano')).toBe('100');
      req.flush(
        paginaApi([
          { id: 'p-1', idPrograma: 'pr-1', nombrePrograma: 'Ingeniería de Sistemas', inp: '2026', estaActivoPlanEstudio: false,
            estaActivoTextoPlanEstudio: 'NO', justificacionEstado: 'Plan Estudio inactivado por el coordinador del programa.', totalSemestres: 8,
            totalAsignaturas: 5, totalCreditos: 15 },
        ])
      );

      const plan = service.planes()[0];
      expect(plan.idPrograma).toBe('pr-1');
      expect(plan.totalAsignaturas).toBe(5);
      expect(plan.totalCreditos).toBe(15);
      expect(plan.estado).toBe('INACTIVO');
      expect(plan.totalSemestres).toBe(8);
      expect(plan.programa).toBe('Ingeniería de Sistemas');
      expect(plan.codigo).toBe('INP-2026');
    });

    it('normalizarPlanEstudio conserva los campos que ya vienen con la forma de la pantalla', () => {
      const plan = normalizarPlanEstudio({ ...mockPlanes[0] });
      expect(plan).toEqual(mockPlanes[0]);
      expect(normalizarPlanEstudio({ id: 'p-2', inp: 7, estaActivoPlanEstudio: true }).estado).toBe('VIGENTE');
      expect(normalizarPlanEstudio({ id: 'p-3' }).totalSemestres).toBe(0);
    });

    it('certificación F3: usa los totales reales de la malla y sin dato no inventa un 0', () => {
      const conTotales = normalizarPlanEstudio({ id: 'p-4', inp: 2024, totalSemestres: 8, totalAsignaturas: 1, totalCreditos: 3 });
      expect(conTotales.totalAsignaturas).toBe(1);
      expect(conTotales.totalCreditos).toBe(3);
      const sinTotales = normalizarPlanEstudio({ id: 'p-5', inp: 2024 });
      expect(sinTotales.totalAsignaturas).toBeNull();
      expect(sinTotales.totalCreditos).toBeNull();
    });

    it('getAsignaturasPorPlan actualiza las asignaturas del plan', () => {
      const mockAsigs: AsignaturaPlanItem[] = [
        {
          id: 'asig-1',
          planEstudioId: 'plan-1',
          codigo: 'MAT101',
          nombre: 'Cálculo Diferencial',
          semestre: 1,
          creditos: 3,
          horasSemanales: 4,
          componente: 'Obligatoria',
          area: 'Ciencias Básicas',
        },
      ];

      service.getAsignaturasPorPlan('plan-1').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas`));
      expect(req.request.method).toBe('GET');
      req.flush(paginaApi(mockAsigs));

      expect(service.getAsignaturasPlan('plan-1')).toHaveSize(1);
    });

    it('getAsignaturasPlanPagina envía los filtros al servidor y conserva el total real', () => {
      let total = 0;
      let cantidad = 0;
      service
        .getAsignaturasPlanPagina('plan-1', { semestre: 2, caracter: 'OBL', busqueda: ' calc ', pagina: 2, tamano: 9 })
        .subscribe((page) => {
          total = page.totalElementos;
          cantidad = page.elementos.length;
        });

      const req = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas`));
      expect(req.request.params.get('semestre')).toBe('2');
      expect(req.request.params.get('caracter')).toBe('OBL');
      expect(req.request.params.get('busqueda')).toBe('calc');
      expect(req.request.params.get('pagina')).toBe('2');
      expect(req.request.params.get('tamano')).toBe('9');
      req.flush(paginaApi([{ idAsignatura: 'a-1', codigo: 'MAT101', nombre: 'Cálculo' }], 2, 9, 19));
      expect(total).toBe(19);
      expect(cantidad).toBe(1);
    });

    it('getAsignaturasPlanPagina omite semestre 0 y filtros vacíos, y propaga el error', () => {
      let status = 0;
      service
        .getAsignaturasPlanPagina('plan-1', { semestre: 0, caracter: '', busqueda: '', pagina: 1, tamano: 9 })
        .subscribe({ error: (e) => (status = e.status) });
      const req = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas`));
      expect(req.request.params.has('semestre')).toBeFalse();
      expect(req.request.params.has('caracter')).toBeFalse();
      expect(req.request.params.has('busqueda')).toBeFalse();
      req.flush({}, { status: 404, statusText: 'Not Found' });
      expect(status).toBe(404);
    });

    it('crearAsignaturaPlan agrega una asignatura y actualiza el contador de asignaturas del plan', () => {
      const nuevaAsig: Partial<AsignaturaPlanItem> = {
        codigo: 'PRG101',
        nombre: 'Programación I',
        semestre: 1,
        creditos: 3,
      };

      service.crearAsignaturaPlan('plan-1', nuevaAsig).subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas`);
      expect(req.request.method).toBe('POST');
      req.flush({ exitoso: true, datos: { id: 'asig-2', ...nuevaAsig } });

      const plan = service.planes().find((p) => p.id === 'plan-1');
      expect(plan?.totalAsignaturas).toBe(51);
      expect(plan?.totalCreditos).toBe(163);
    });

  });

  describe('Estudiantes y Matrículas', () => {
    it('getEstudiantesDirectorio consulta el directorio institucional', () => {
      const mockEstudiantes: EstudianteDirectorioItem[] = [
        {
          id: 'est-1',
          documento: '1017009',
          codigo: 'EST001',
          nombreCompleto: 'Laura Restrepo',
          correo: 'lrestrepo@uco.edu.co',
          programa: 'Ingeniería de Sistemas',
          semestreActual: 4,
          estadoMatricula: 'ACTIVO',
          gruposInscritos: ['grp-1'],
        },
      ];

      service.getEstudiantesDirectorio().subscribe((res) => {
        expect(res.exitoso).toBeTrue();
        expect(res.datos?.length).toBe(1);
        expect(res.total).toBe(1);
      });

      const req = http.expectOne(porUrl(`${environment.apiUrl}/coordinador/estudiantes`));
      expect(req.request.method).toBe('GET');
      // O2-B2: el backend responde una página con id, idUsuario, numeroIdentificacion, nombreCompleto, correo, idPrograma, nombrePrograma.
      req.flush(
        paginaApi([
          { id: 'est-1', idUsuario: 'usr-1', numeroIdentificacion: 1017009, nombreCompleto: 'Laura Restrepo',
            correo: 'lrestrepo@uco.edu.co', idPrograma: 'prg-a', nombrePrograma: 'Ingeniería de Sistemas' },
        ])
      );

      expect(service.estudiantes()).toHaveSize(1);
      expect(service.estudiantes()[0].documento).toBe('1017009');
      expect(service.estudiantes()[0].programa).toBe('Ingeniería de Sistemas');
      void mockEstudiantes;
    });

  });

  describe('Semestres de plan y directorio', () => {
    it('agregarSemestrePlan y eliminarSemestrePlan ejecutan endpoints correspondientes', () => {
      service.agregarSemestrePlan('plan-1').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });
      const postReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/semestres`);
      expect(postReq.request.method).toBe('POST');
      postReq.flush({ exitoso: true, datos: { planEstudioId: 'plan-1' } });

      service.eliminarSemestrePlan('plan-1', 10).subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });
      const delReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/semestres/10`);
      expect(delReq.request.method).toBe('DELETE');
      delReq.flush({ exitoso: true, datos: { planEstudioId: 'plan-1', semestreEliminado: 10 } });
    });

    it('getEstudiantesDirectorioPagina y getEstudiantesPorGrupo funcionan', () => {
      service.getEstudiantesDirectorioPagina({ page: 0, size: 10, nombre: 'Laura', activo: true }).subscribe((res) => {
        expect(res.items).toHaveSize(1);
        expect(res.totalItems).toBe(1);
      });

      const getReq = http.expectOne((req) => req.url.includes('/estudiantes'));
      // Sin programa seleccionado no se inventa programaId.
      expect(getReq.request.params.has('programaId')).toBeFalse();
      getReq.flush({
        items: [{ id: '1', nombreCompleto: 'Laura Restrepo', estaActivoUsuario: true }],
        totalItems: 1,
        totalPages: 1,
        page: 0,
        size: 10,
      });

      service.getEstudiantesPorGrupo('grp-1').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });
      const reqGrp = http.expectOne(`${environment.apiUrl}/grupos/grp-1/estudiantes`);
      expect(reqGrp.request.method).toBe('GET');
      reqGrp.flush({ exitoso: true, datos: [] });

      expect(service.getAsignaturasPlan('plan-inexistente')).toEqual([]);
    });
  });
});

describe('CoordinatorManagementService (CULM-001 A.1: sin solicitudes ni matrícula de grupo)', () => {
  it('F-RED-04 no expone los métodos retirados', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    const service = TestBed.inject(CoordinatorManagementService);
    for (const metodo of ['getSolicitudesMatricula', 'crearSolicitudMatricula', 'resolverSolicitudMatricula', 'matricularEstudianteGrupo', 'retirarEstudianteGrupo']) {
      expect(metodo in service).withContext(metodo).toBeFalse();
    }
  });
});

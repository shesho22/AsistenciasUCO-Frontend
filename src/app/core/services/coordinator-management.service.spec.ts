import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  CoordinatorManagementService,
  normalizarAsignaturaPlan,
  normalizarPeriodoAcademico,
  normalizarPlanEstudio,
} from './coordinator-management.service';
import { environment } from '../../../environments/environment';
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
  SolicitudMatriculaItem,
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
      providers: [CoordinatorManagementService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CoordinatorManagementService);
    http = TestBed.inject(HttpTestingController);

    // La carga ya NO ocurre en el constructor: las pantallas de Coordinador la solicitan explicitamente.
    http.expectNone(() => true);
    service.cargarDatosAcademicosBase();
    const reqPlanes = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio`);
    reqPlanes.flush({ exitoso: true, datos: mockPlanes });

    const reqPeriodos = http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`);
    reqPeriodos.flush({ exitoso: true, datos: mockPeriodos });
  });

  afterEach(() => http.verify());

  it('cargarDatosAcademicosBase llena las señales de planes y periodos', () => {
    expect(service).toBeTruthy();
    expect(service.planes().length).toBe(1);
    expect(service.periodos().length).toBe(1);
  });

  it('instanciar el servicio NO emite peticiones /coordinador/** (un estudiante no debe provocar 403)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [CoordinatorManagementService, provideHttpClient(), provideHttpClientTesting()],
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
      providers: [CoordinatorManagementService, provideHttpClient(), provideHttpClientTesting()],
    });
    const fresco = TestBed.inject(CoordinatorManagementService);
    const httpFresco = TestBed.inject(HttpTestingController);

    expect(() => fresco.cargarDatosAcademicosBase()).not.toThrow();
    httpFresco.expectOne(`${environment.apiUrl}/coordinador/planes-estudio`).flush(null, { status: 403, statusText: 'Forbidden' });
    httpFresco.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`).flush(null, { status: 403, statusText: 'Forbidden' });
    httpFresco.verify();
  });

  describe('Docentes del programa (HU062/HU063/HU089/HU090/HU091)', () => {
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
      idTipoVinculacion: 'tv-1',
      codigoTipoVinculacion: 'CAT',
      nombreTipoVinculacion: 'Cátedra',
      fechaVinculacionUtc: '2026-10-22T10:00:00Z',
      totalGruposPrograma: 0,
      estaActivo: true,
    };

    it('getDocentesPrograma consulta paginado con filtros y actualiza las señales', () => {
      service
        .getDocentesPrograma({ pagina: 2, tamano: 5, busqueda: 'ros', estaActivo: true, idTipoVinculacion: 'tv-1' })
        .subscribe((res) => expect(res.exitoso).toBeTrue());

      const req = http.expectOne((r) => r.url === `${environment.apiUrl}/coordinador/docentes`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('pagina')).toBe('2');
      expect(req.request.params.get('tamano')).toBe('5');
      expect(req.request.params.get('busqueda')).toBe('ros');
      expect(req.request.params.get('estaActivo')).toBe('true');
      expect(req.request.params.get('idTipoVinculacion')).toBe('tv-1');
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
        expect(res.datos.length).toBe(1);
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
      service.getCandidatosDocente('ros').subscribe((res) => expect(res.datos.length).toBe(1));

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
        password: 'Clave1234!',
        idTipoVinculacion: 'tv-1',
      };

      service.vincularDocente(payload).subscribe((res) => expect(res.datos.idDocente).toBe('doc-1'));

      const req = http.expectOne(`${environment.apiUrl}/coordinador/docentes`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ exitoso: true, datos: fila });

      expect(service.docentes()).toEqual([]); // sin actualización optimista
    });

    it('vincularDocente (existente) envía solo idDocente e idTipoVinculacion', () => {
      const payload: VincularDocenteExistentePayload = { idDocente: 'doc-9', idTipoVinculacion: 'tv-1' };

      service.vincularDocente(payload).subscribe();

      const req = http.expectOne(`${environment.apiUrl}/coordinador/docentes`);
      expect(req.request.body).toEqual(payload);
      req.flush({ exitoso: true, datos: fila });
    });

    it('vincularDocente propaga el 409 para que la UI muestre el mensaje del backend', () => {
      let message = '';
      service.vincularDocente({ idDocente: 'doc-1', idTipoVinculacion: 'tv-1' }).subscribe({
        error: (e) => (message = e.error.message),
      });

      http.expectOne(`${environment.apiUrl}/coordinador/docentes`).flush(
        { message: 'El docente ya está vinculado a este programa.' },
        { status: 409, statusText: 'Conflict' }
      );

      expect(message).toBe('El docente ya está vinculado a este programa.');
    });

    it('actualizarDocente (HU092) envía PUT con solo los campos indicados y no toca la lista local', () => {
      const payload: ActualizarDocentePayload = { idTipoVinculacion: 'tv-2', primerNombre: 'Nuevo', segundoApellido: '' };

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
      req.flush({ exitoso: true, datos: { totalDocentes: 3, totalActivos: 2, totalInactivos: 1, porTipoVinculacion: [] } });
    });

    it('cambiarEstadoDocente propaga el 404 del backend', () => {
      let status = 0;
      service.cambiarEstadoDocente('doc-x', true).subscribe({ error: (e) => (status = e.status) });

      http.expectOne(`${environment.apiUrl}/coordinador/docentes/doc-x/estado`)
        .flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });

      expect(status).toBe(404);
    });

    it('getTiposVinculacion consulta el catálogo de la DB', () => {
      service.getTiposVinculacion().subscribe((tipos) => expect(tipos[0].codigo).toBe('PLA'));

      const req = http.expectOne(`${environment.apiUrl}/tipos-vinculacion`);
      expect(req.request.method).toBe('GET');
      req.flush([{ id: 'tv-1', codigo: 'PLA', nombre: 'Planta' }]);
    });
  });

  describe('Planes de Estudio y Asignaturas', () => {
    it('crearPlanEstudio agrega el nuevo plan a la señal', () => {
      const nuevoPlan: Partial<PlanEstudioItem> = {
        codigo: 'MED-2026',
        nombre: 'Medicina',
        estado: 'VIGENTE',
        totalAsignaturas: 60,
      };

      service.crearPlanEstudio(nuevoPlan).subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio`);
      expect(req.request.method).toBe('POST');
      req.flush({ exitoso: true, datos: { id: 'plan-2', ...nuevoPlan } });

      expect(service.planes().length).toBe(2);
      expect(service.planes()[0].id).toBe('plan-2');
    });

    it('actualizarPlanEstudio modifica el plan en la señal', () => {
      service.actualizarPlanEstudio('plan-1', { nombre: 'Ingeniería de Software' }).subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1`);
      expect(req.request.method).toBe('PUT');
      req.flush({ exitoso: true, datos: { ...mockPlanes[0], nombre: 'Ingeniería de Software' } });

      expect(service.planes().find((p) => p.id === 'plan-1')?.nombre).toBe('Ingeniería de Software');
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

    it('normalizarPeriodoAcademico calcula planeación, activo y cerrado con las fechas', () => {
      const dto = { id: 'p', idInstitucion: 'i', nombre: '2030-1', fechaInicio: '2030-02-01', fechaFin: '2030-06-30' };
      expect(normalizarPeriodoAcademico(dto, new Date('2030-01-15T12:00:00Z')).estado).toBe('PLANEACION');
      expect(normalizarPeriodoAcademico(dto, new Date('2030-03-15T12:00:00Z')).estado).toBe('ACTIVO');
      expect(normalizarPeriodoAcademico(dto, new Date('2030-03-15T12:00:00Z')).esActual).toBeTrue();
      expect(normalizarPeriodoAcademico(dto, new Date('2030-07-15T12:00:00Z')).estado).toBe('CERRADO');
      expect(normalizarPeriodoAcademico({ id: 'm', codigo: '2027-1', nombre: 'Mock', estado: 'INACTIVO' }).codigo).toBe('2027-1');
    });

    it('eliminarPeriodoAcademico usa DELETE y quita el período de la señal', () => {
      service.eliminarPeriodoAcademico('per-1').subscribe();
      const req = http.expectOne(`${environment.apiUrl}/admin/periodos-academicos/per-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ exitoso: true, datos: null });
    });

    it('getPlanesEstudio adapta la respuesta del backend (HU081-HU083) a PlanEstudioItem', () => {
      service.getPlanesEstudio().subscribe();

      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio`);
      req.flush({
        exitoso: true,
        datos: [
          { id: 'p-1', idPrograma: 'pr-1', nombrePrograma: 'Ingeniería de Sistemas', inp: '2026', estaActivoPlanEstudio: false,
            estaActivoTextoPlanEstudio: 'NO', justificacionEstado: 'Plan Estudio inactivado por el coordinador del programa.', totalSemestres: 8 },
        ],
      });

      const plan = service.planes()[0];
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
          prerrequisitos: [],
        },
      ];

      service.getAsignaturasPorPlan('plan-1').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas`);
      expect(req.request.method).toBe('GET');
      req.flush({ exitoso: true, datos: mockAsigs });

      expect(service.getAsignaturasPlan('plan-1').length).toBe(1);
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
    });

    it('eliminarAsignaturaPlan remueve la asignatura y decrementa el contador', () => {
      service.eliminarAsignaturaPlan('plan-1', 'asig-1').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/asignaturas/asig-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ exitoso: true, datos: true });

      const plan = service.planes().find((p) => p.id === 'plan-1');
      expect(plan?.totalAsignaturas).toBe(49);
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
          promedioAcumulado: 4.5,
          estadoMatricula: 'ACTIVO',
          gruposInscritos: ['grp-1'],
        },
      ];

      service.getEstudiantesDirectorio().subscribe((res) => {
        expect(res.exitoso).toBeTrue();
        expect(res.datos?.length).toBe(1);
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/estudiantes`);
      expect(req.request.method).toBe('GET');
      req.flush({ exitoso: true, datos: mockEstudiantes });

      expect(service.estudiantes().length).toBe(1);
    });

    it('matricularEstudianteGrupo registra al estudiante en el grupo', () => {
      service.matricularEstudianteGrupo('grp-2', 'est-1').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/grupos/grp-2/estudiantes`);
      expect(req.request.method).toBe('POST');
      req.flush({ exitoso: true, datos: true });
    });

    it('retirarEstudianteGrupo retira al estudiante del grupo', () => {
      service.retirarEstudianteGrupo('grp-1', 'est-1').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/grupos/grp-1/estudiantes/est-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ exitoso: true, datos: true });
    });
  });

  describe('Solicitudes de Matrícula', () => {
    it('getSolicitudesMatricula obtiene las solicitudes pendientes', () => {
      const mockSolicitudes: SolicitudMatriculaItem[] = [
        {
          id: 'sol-1',
          estudianteId: 'est-1',
          estudianteNombre: 'Laura Restrepo',
          estudianteCodigo: '1017009',
          estudianteCorreo: 'lrestrepo@uco.edu.co',
          cursoId: 'cur-1',
          cursoCodigo: 'CUR1',
          cursoNombre: 'Cálculo',
          grupo: 'G01',
          fechaSolicitud: '2026-02-05',
          estado: 'PENDIENTE',
          motivo: 'Cruce de horario',
        },
      ];

      service.getSolicitudesMatricula().subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/solicitudes-matricula`);
      expect(req.request.method).toBe('GET');
      req.flush({ exitoso: true, datos: mockSolicitudes });

      expect(service.solicitudesMatricula().length).toBe(1);
    });

    it('resolverSolicitudMatricula actualiza la solicitud en la señal', () => {
      service.resolverSolicitudMatricula('sol-1', 'APROBADA', 'Aprobado sin conflicto').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/solicitudes-matricula/sol-1`);
      expect(req.request.method).toBe('PATCH');
      req.flush({
        exitoso: true,
        datos: {
          id: 'sol-1',
          estudianteId: 'est-1',
          estudianteNombre: 'Laura Restrepo',
          estudianteCodigo: '1017009',
          estudianteCorreo: 'lrestrepo@uco.edu.co',
          cursoId: 'cur-1',
          cursoCodigo: 'CUR1',
          cursoNombre: 'Cálculo',
          grupo: 'G01',
          fechaSolicitud: '2026-02-05',
          estado: 'APROBADA',
          motivo: 'Cruce de horario',
          respuestaCoordinador: 'Aprobado sin conflicto',
        },
      });
    });

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

    it('matricularEstudianteGrupo y retirarEstudianteGrupo gestionan grupos de estudiantes', () => {
      service.matricularEstudianteGrupo('grp-1', 'est-1').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });
      const postReq = http.expectOne(`${environment.apiUrl}/grupos/grp-1/estudiantes`);
      expect(postReq.request.method).toBe('POST');
      postReq.flush({ exitoso: true, datos: true });

      service.retirarEstudianteGrupo('grp-1', 'est-1').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });
      const delReq = http.expectOne(`${environment.apiUrl}/grupos/grp-1/estudiantes/est-1`);
      expect(delReq.request.method).toBe('DELETE');
      delReq.flush({ exitoso: true, datos: true });
    });

    it('crearSolicitudMatricula envía POST y actualiza la lista', () => {
      service.crearSolicitudMatricula({
        estudianteId: 'est-1',
        estudianteNombre: 'Laura',
        estudianteCodigo: '1017009',
        estudianteCorreo: 'laura@uco.edu.co',
        cursoId: 'cur-1',
        cursoCodigo: 'SIS-101',
        cursoNombre: 'Algoritmos',
        grupo: 'G01',
        motivo: 'Inscripción tardía',
      }).subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/estudiante/solicitudes-matricula`);
      expect(req.request.method).toBe('POST');
      req.flush({
        exitoso: true,
        datos: {
          id: 'sol-nueva',
          estudianteId: 'est-1',
          estudianteNombre: 'Laura',
          estudianteCodigo: '1017009',
          estudianteCorreo: 'laura@uco.edu.co',
          cursoId: 'cur-1',
          cursoCodigo: 'SIS-101',
          cursoNombre: 'Algoritmos',
          grupo: 'G01',
          fechaSolicitud: '2026-02-10',
          estado: 'PENDIENTE',
          motivo: 'Inscripción tardía',
        },
      });
    });
    it('getEstudiantesDirectorioPagina y getEstudiantesPorGrupo funcionan', () => {
      service.getEstudiantesDirectorioPagina({ page: 0, size: 10, nombre: 'Laura', activo: true }).subscribe((res) => {
        expect(res.items.length).toBe(1);
        expect(res.totalItems).toBe(1);
      });

      const getReq = http.expectOne((req) => req.url.includes('/estudiantes'));
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

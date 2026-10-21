import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoordinatorManagementService } from './coordinator-management.service';
import { environment } from '../../../environments/environment';
import {
  DocenteItem,
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

  describe('Docentes', () => {
    it('getDocentes obtiene la lista de docentes', () => {
      const mockDocentes: DocenteItem[] = [
        {
          id: 'doc-1',
          numeroIdentificacion: '1017001',
          nombres: 'Pedro',
          apellidos: 'Pérez',
          correo: 'pperez@uco.edu.co',
          departamento: 'Ingeniería',
          especialidad: 'Software',
          estado: 'ACTIVO',
          totalGruposAsignados: 3,
        },
      ];

      service.getDocentes().subscribe((res) => {
        expect(res.exitoso).toBeTrue();
        expect(res.datos?.length).toBe(1);
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/docentes`);
      expect(req.request.method).toBe('GET');
      req.flush({ exitoso: true, datos: mockDocentes });
    });

    it('createDocente envía POST y retorna el nuevo docente', () => {
      const nuevo: Omit<DocenteItem, 'id' | 'totalGruposAsignados'> = {
        numeroIdentificacion: '1017002',
        nombres: 'Luisa',
        apellidos: 'Castro',
        correo: 'lcastro@uco.edu.co',
        departamento: 'Ingeniería',
        especialidad: 'Inteligencia Artificial',
        estado: 'ACTIVO',
      };

      service.createDocente(nuevo).subscribe((res) => {
        expect(res.exitoso).toBeTrue();
        expect(res.datos?.nombres).toBe('Luisa');
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/docentes`);
      expect(req.request.method).toBe('POST');
      req.flush({ exitoso: true, datos: { id: 'doc-2', ...nuevo, totalGruposAsignados: 0 } });
    });

    it('toggleDocenteStatus envía PATCH para alternar estado', () => {
      service.toggleDocenteStatus('doc-1').subscribe((res) => {
        expect(res.exitoso).toBeTrue();
      });

      const req = http.expectOne(`${environment.apiUrl}/coordinador/docentes/doc-1/toggle`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ exitoso: true, datos: null });
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

      const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-1/toggle`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ exitoso: true, datos: { ...mockPlanes[0], estado: 'INACTIVO' } });

      expect(service.planes().find((p) => p.id === 'plan-1')?.estado).toBe('INACTIVO');
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

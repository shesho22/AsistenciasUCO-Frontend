import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CourseService } from './course.service';
import { environment } from '../../../environments/environment';
import { Course } from '../models/course.model';
import { AsignaturaDocenteApiDto } from '../api/models/asignatura-docente-api-dto.model';

const GRUPO_ARQ = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
const ASIG_ARQ = 'e2f3a4b5-0000-0000-0000-000000000001';

function asignacion(overrides: Partial<AsignaturaDocenteApiDto> = {}): AsignaturaDocenteApiDto {
  return {
    idAsignatura: ASIG_ARQ,
    nombreAsignatura: 'Arquitectura de Software',
    idGrupo: GRUPO_ARQ,
    nombreGrupo: 'Grupo 001 - Arq Software',
    idPrograma: 'p1',
    nombrePrograma: 'Ingeniería de Sistemas',
    ...overrides,
  };
}

function horario(overrides: Record<string, unknown> = {}) {
  return {
    id: 'h1',
    idDocente: 'd1',
    idGrupo: GRUPO_ARQ,
    codigoMateria: 'ARQ-402',
    nombreMateria: 'Arquitectura de Software',
    seccion: 'Grupo 001',
    dia: 'Lunes',
    horaInicio: '08:00:00',
    horaFin: '10:00:00',
    totalEstudiantes: 25,
    ...overrides,
  };
}

describe('CourseService', () => {
  let service: CourseService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CourseService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CourseService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Suscribe y responde ambas consultas del contrato real. */
  function loadCourses(
    asignaturas: AsignaturaDocenteApiDto[],
    horarios: unknown[] | 'error'
  ): { courses: Course[]; error: unknown } {
    const result: { courses: Course[]; error: unknown } = { courses: [], error: null };
    service.getCurrentTeacherCourses().subscribe({
      next: (response) => (result.courses = response.datos),
      error: (err) => (result.error = err),
    });

    const asignaturasReq = http.expectOne(`${environment.apiUrl}/docente/asignaturas`);
    const horariosReq = http.expectOne(`${environment.apiUrl}/docente/horarios`);
    expect(asignaturasReq.request.method).toBe('GET');
    expect(horariosReq.request.method).toBe('GET');
    asignaturasReq.flush({ exitoso: true, total: asignaturas.length, datos: asignaturas });
    if (horarios === 'error') {
      horariosReq.flush({ mensajeUsuario: 'fallo' }, { status: 500, statusText: 'Server Error' });
    } else {
      horariosReq.flush({ exitoso: true, total: horarios.length, datos: horarios });
    }
    return result;
  }

  // --- Fuente de grupos: GET /docente/asignaturas; GET /docente/horarios solo enriquece ---

  it('una asignatura y cero horarios → un grupo visible sin datos inventados', () => {
    const { courses, error } = loadCourses([asignacion()], []);

    expect(error).toBeNull();
    expect(courses.length).toBe(1);
    expect(courses[0].id).toBe(GRUPO_ARQ);
    expect(courses[0].asignaturaId).toBe(ASIG_ARQ);
    expect(courses[0].name).toBe('Arquitectura de Software');
    expect(courses[0].section).toBe('Grupo 001 - Arq Software');
    expect(courses[0].schedule).toBe('');
    expect(courses[0].code).toBeUndefined();
    expect(courses[0].enrolledStudentsCount).toBeUndefined();
    expect(courses[0].docenteName).toBeUndefined();
    expect('room' in courses[0]).toBeFalse();
  });

  it('una asignatura y varios horarios → un grupo con horario y datos del horario', () => {
    const { courses } = loadCourses(
      [asignacion()],
      [horario(), horario({ id: 'h2', dia: 'Miércoles' })]
    );

    expect(courses.length).toBe(1);
    expect(courses[0].id).toBe(GRUPO_ARQ);
    expect(courses[0].schedule).toBe('Lunes 08:00-10:00, Miércoles 08:00-10:00');
    expect(courses[0].code).toBe('ARQ-402');
    expect(courses[0].enrolledStudentsCount).toBe(25);
    expect(courses[0].docenteId).toBe('d1');
  });

  it('dos asignaturas y cero horarios → dos grupos visibles', () => {
    const { courses } = loadCourses(
      [
        asignacion(),
        asignacion({
          idAsignatura: 'asig-2',
          nombreAsignatura: 'Bases de Datos',
          idGrupo: 'g2',
          nombreGrupo: 'Grupo 002',
        }),
      ],
      []
    );

    expect(courses.map((c) => c.id)).toEqual([GRUPO_ARQ, 'g2']);
    expect(courses.map((c) => c.asignaturaId)).toEqual([ASIG_ARQ, 'asig-2']);
  });

  it('cero asignaturas → cero grupos', () => {
    const { courses, error } = loadCourses([], [horario()]);

    expect(error).toBeNull();
    expect(courses).toEqual([]);
  });

  it('un error al cargar horarios no elimina los grupos ya autorizados', () => {
    const { courses, error } = loadCourses([asignacion()], 'error');

    expect(error).toBeNull();
    expect(courses.length).toBe(1);
    expect(courses[0].id).toBe(GRUPO_ARQ);
    expect(courses[0].schedule).toBe('');
  });

  it('un error al cargar asignaturas se propaga y no se convierte en lista vacía', () => {
    let courses: Course[] | null = null;
    let error: unknown = null;
    service.getCurrentTeacherCourses().subscribe({
      next: (response) => (courses = response.datos),
      error: (err) => (error = err),
    });

    http
      .expectOne(`${environment.apiUrl}/docente/asignaturas`)
      .flush({ mensajeUsuario: 'fallo' }, { status: 500, statusText: 'Server Error' });
    // La consulta de horarios en curso se cancela al fallar la fuente de grupos.
    expect(http.expectOne(`${environment.apiUrl}/docente/horarios`).cancelled).toBeTrue();

    expect(courses).toBeNull();
    expect(error).not.toBeNull();
  });

  it('horarios de un grupo ajeno no generan grupos que el docente no tiene asignados', () => {
    const { courses } = loadCourses(
      [asignacion()],
      [horario({ idGrupo: 'grupo-ajeno', codigoMateria: 'AJENO-1' })]
    );

    expect(courses.map((c) => c.id)).toEqual([GRUPO_ARQ]);
    expect(courses[0].code).toBeUndefined();
    expect(JSON.stringify(courses)).not.toContain('AJENO-1');
  });

  it('no repite un grupo si /docente/asignaturas lo devuelve más de una vez', () => {
    const { courses } = loadCourses([asignacion(), asignacion()], []);

    expect(courses.length).toBe(1);
  });

  // --- LB-001B.1B / LB-001B.5A: sin docenteName ni room sintetizados ---

  it('no hardcodea docenteName al mapear los contratos reales', () => {
    const { courses } = loadCourses([asignacion()], [horario()]);

    expect(courses.length).toBe(1);
    expect(courses[0].docenteName).not.toBe(['Docente', 'UCO'].join(' '));
    expect(courses[0].docenteName).toBeUndefined();
  });

  it('no genera room aunque el horario traiga campos extra', () => {
    const { courses } = loadCourses([asignacion()], [horario({ aula: 'AULA-FANTASMA' })]);

    expect(courses[0].room).toBeUndefined();
    expect('room' in courses[0]).toBeFalse();
    expect(JSON.stringify(courses[0])).not.toContain('No disponible');
    expect(JSON.stringify(courses[0])).not.toContain('AULA-FANTASMA');
  });



  it('getTeacherCourses envuelve los grupos de getCurrentTeacherCourses', () => {
    let courses: Course[] = [];
    service.getTeacherCourses().subscribe((res) => (courses = res.datos));

    http
      .expectOne(`${environment.apiUrl}/docente/asignaturas`)
      .flush({ exitoso: true, total: 1, datos: [asignacion()] });
    http
      .expectOne(`${environment.apiUrl}/docente/horarios`)
      .flush({ exitoso: true, total: 0, datos: [] });

    expect(courses.length).toBe(1);
    expect(courses[0].id).toBe(GRUPO_ARQ);
  });

  it('getAsignaturasDocente consulta asignaturas del docente con el DTO real', () => {
    let asignaturas: AsignaturaDocenteApiDto[] = [];
    service.getAsignaturasDocente().subscribe((res) => (asignaturas = res.datos));

    http.expectOne(`${environment.apiUrl}/docente/asignaturas`).flush({
      exitoso: true,
      datos: [asignacion()],
    });

    expect(asignaturas.length).toBe(1);
    expect(asignaturas[0].idAsignatura).toBe(ASIG_ARQ);
    expect(asignaturas[0].nombreAsignatura).toBe('Arquitectura de Software');
  });

  it('F1: crearGrupo envía el contrato real de POST /grupos con las franjas del horario', () => {
    service
      .crearGrupo({
        idAsignatura: 'asig-1',
        idPeriodoAcademico: 'per-1',
        codigo: 3,
        nombre: 'Grupo 3',
        idDocente: 'doc-1',
        franjas: [{ dia: 'LU', nombreDia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
      })
      .subscribe((res) => expect(res.exitoso).toBeTrue());

    const postReq = http.expectOne(`${environment.apiUrl}/grupos`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      idAsignatura: 'asig-1',
      idPeriodoAcademico: 'per-1',
      codigo: 3,
      nombre: 'Grupo 3',
      idDocente: 'doc-1',
      franjas: [{ dia: 'LU', horaInicio: '08:00', horaFin: '10:00' }],
    });
    postReq.flush({ exitoso: true, datos: { id: 'grp-nuevo', mensajeUsuario: 'ok' } });
  });

  it('F1: actualizarGrupo envía PUT /grupos/{id}; sin franjas el horario no viaja', () => {
    service.actualizarGrupo('grp-nuevo', { nombre: 'Grupo B', cupoMaximo: 40 }).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });
    const putReq = http.expectOne(`${environment.apiUrl}/grupos/grp-nuevo`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.franjas).toBeUndefined();
    expect(putReq.request.body.nombre).toBe('Grupo B');
    expect(putReq.request.body.cupoMaximo).toBe(40);
    putReq.flush({ exitoso: true, datos: { id: 'grp-nuevo', mensajeUsuario: 'ok' } });
  });

  it('F1: el grupo del coordinador trae sus franjas y el texto del horario', () => {
    let courses: Course[] = [];
    service.getCoordinatorCourses().subscribe((res) => (courses = res.datos));
    http.expectOne(`${environment.apiUrl}/grupos`).flush({
      exitoso: true,
      total: 1,
      datos: [grupoApi({
        franjas: [
          { codigoDia: 'LU', nombreDia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' },
          { codigoDia: 'MI', nombreDia: null, horaInicio: '14:00', horaFin: '16:00' },
        ],
      })],
    });

    expect(courses[0].franjas).toEqual([
      { dia: 'LU', nombreDia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' },
      { dia: 'MI', nombreDia: undefined, horaInicio: '14:00', horaFin: '16:00' },
    ]);
    expect(courses[0].schedule).toBe('Lunes 08:00-10:00, MI 14:00-16:00');
  });
  // --- Grupos por ambito (hallazgo del recorrido de vistas): decano y coordinador NO usan /docente/* ---

  const grupoApi = (over: Record<string, unknown> = {}) => ({
    id: 'g1',
    codigo: 'MAT-301',
    nombre: 'Sección A',
    idAsignatura: 'asig-1',
    nombreAsignatura: 'Matemática Avanzada III',
    idDocente: 'doc-1',
    capacidadMaximaPermitida: 35,
    estudiantesActivos: 28,
    cuposDisponibles: 7,
    grupoHabilitado: true,
    fechaInicioPeriodoAcademico: '2026-01-15',
    fechaFinPeriodoAcademico: '2026-06-15',
    ...over,
  });

  it('getDeanCourses lee GET /decano/grupos y nunca los endpoints del docente', () => {
    let courses: Course[] = [];
    service.getDeanCourses().subscribe((res) => (courses = res.datos));

    const req = http.expectOne(`${environment.apiUrl}/decano/grupos`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, total: 2, datos: [grupoApi(), grupoApi({ id: 'g2', codigo: 'SIS-102' })] });

    expect(courses.length).toBe(2);
    http.expectNone(`${environment.apiUrl}/docente/asignaturas`);
    http.expectNone(`${environment.apiUrl}/docente/horarios`);
  });

  it('getCoordinatorCourses lee GET /grupos y nunca los endpoints del docente', () => {
    let courses: Course[] = [];
    service.getCoordinatorCourses().subscribe((res) => (courses = res.datos));

    const req = http.expectOne(`${environment.apiUrl}/grupos`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, total: 1, datos: [grupoApi()] });

    expect(courses.length).toBe(1);
    http.expectNone(`${environment.apiUrl}/docente/asignaturas`);
    http.expectNone(`${environment.apiUrl}/docente/horarios`);
  });

  it('el mapeo del grupo conserva solo lo que entrega el contrato', () => {
    let courses: Course[] = [];
    service.getDeanCourses().subscribe((res) => (courses = res.datos));
    http.expectOne(`${environment.apiUrl}/decano/grupos`).flush({ exitoso: true, total: 1, datos: [grupoApi()] });

    expect(courses[0]).toEqual(jasmine.objectContaining({
      id: 'g1',
      code: 'MAT-301',
      name: 'Matemática Avanzada III',
      section: 'Sección A',
      asignaturaId: 'asig-1',
      docenteId: 'doc-1',
      enrolledStudentsCount: 28,
      cupoMaximo: 35,
      schedule: '',
    }));
    expect('room' in courses[0]).toBeFalse();
    expect('docenteName' in courses[0]).toBeFalse();
  });

  it('asigna colores de categoria de forma cíclica y estable', () => {
    let courses: Course[] = [];
    service.getCoordinatorCourses().subscribe((res) => (courses = res.datos));
    http.expectOne(`${environment.apiUrl}/grupos`).flush({
      exitoso: true,
      total: 5,
      datos: [1, 2, 3, 4, 5].map((n) => grupoApi({ id: `g${n}` })),
    });

    expect(courses.map((c) => c.colorCategory)).toEqual(['emerald', 'amber', 'blue', 'purple', 'emerald']);
  });

  it('una respuesta sin datos produce una lista vacía exitosa', () => {
    let resultado: { exitoso: boolean; total?: number; datos: Course[] } | null = null;
    service.getDeanCourses().subscribe((res) => (resultado = res));
    http.expectOne(`${environment.apiUrl}/decano/grupos`).flush({ exitoso: true });

    expect(resultado!.exitoso).toBeTrue();
    expect(resultado!.datos).toEqual([]);
    expect(resultado!.total).toBe(0);
  });

  it('un 403 del backend se propaga sin reintentar con otro endpoint', () => {
    let status = 0;
    service.getDeanCourses().subscribe({ error: (err) => (status = err.status) });
    http.expectOne(`${environment.apiUrl}/decano/grupos`).flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    http.expectNone(`${environment.apiUrl}/docente/asignaturas`);
  });
});

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

  it('crearGrupo() (HTTP real) no envía docenteName en el body de POST /grupos', () => {
    // TARGET (PLAN.md LB-001B.1B, riesgo #3 RESUELTO): Grupo.docente en DB es solo FK UUID;
    // CrearGrupoRequest.java del backend no declara docenteName. Con FAIL_ON_UNKNOWN_PROPERTIES
    // activo, enviarlo hoy debería producir 400 en vez de ser ignorado silenciosamente.
    service
      .crearGrupo({
        code: 'IS-001',
        name: 'Arquitectura de Software',
        section: 'Grupo 1',
        docenteName: 'Dra. María Elena Rostagno',
      } as any)
      .subscribe();

    const request = http.expectOne(`${environment.apiUrl}/grupos`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.docenteName).toBeUndefined();
    request.flush({ exitoso: true, mensajeUsuario: 'ok', datos: {} });
  });

  it('actualizarGrupo() (HTTP real) no envía docenteName en el body de PUT /grupos/{id}', () => {
    service
      .actualizarGrupo('g1', { docenteName: 'Dra. María Elena Rostagno' } as any)
      .subscribe();

    const request = http.expectOne(`${environment.apiUrl}/grupos/g1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.docenteName).toBeUndefined();
    request.flush({ exitoso: true, datos: {} });
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

  it('crearGrupo y actualizarGrupo interactúan con endpoints /grupos', () => {
    service.crearGrupo({ code: 'IS-101', name: 'Arquitectura', section: 'G1', cupoMaximo: 30 }).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });
    const postReq = http.expectOne(`${environment.apiUrl}/grupos`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ exitoso: true, datos: { id: 'grp-nuevo', code: 'IS-101' } });

    service.actualizarGrupo('grp-nuevo', { name: 'Arquitectura Actualizada', docenteName: 'Profesor X' } as any).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });
    const putReq = http.expectOne(`${environment.apiUrl}/grupos/grp-nuevo`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({ name: 'Arquitectura Actualizada' });
    putReq.flush({ exitoso: true, datos: { id: 'grp-nuevo', name: 'Arquitectura Actualizada' } });
  });
});

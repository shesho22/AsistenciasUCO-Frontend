import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CourseService } from './course.service';
import { environment } from '../../../environments/environment';
import { Course } from '../models/course.model';

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

  it('consulta /docente/horarios y deduplica por idGrupo', () => {
    let courses: Course[] = [];
    service
      .getCurrentTeacherCourses()
      .subscribe((response) => (courses = response.datos));

    const request = http.expectOne(`${environment.apiUrl}/docente/horarios`);
    expect(request.request.method).toBe('GET');
    request.flush({
      exitoso: true,
      total: 2,
      datos: [
        {
          id: 'h1',
          idDocente: 'd1',
          idGrupo: 'g1',
          codigoMateria: 'IS-001',
          nombreMateria: 'Arquitectura',
          seccion: 'Grupo 1',
          dia: 'Lunes',
          horaInicio: '08:00:00',
          horaFin: '10:00:00',
          totalEstudiantes: 25,
        },
        {
          id: 'h2',
          idDocente: 'd1',
          idGrupo: 'g1',
          codigoMateria: 'IS-001',
          nombreMateria: 'Arquitectura',
          seccion: 'Grupo 1',
          dia: 'Miércoles',
          horaInicio: '08:00:00',
          horaFin: '10:00:00',
          totalEstudiantes: 25,
        },
      ],
    });

    expect(courses.length).toBe(1);
    expect(courses[0].id).toBe('g1');
    expect(courses[0].schedule).toBe(
      'Lunes 08:00-10:00, Miércoles 08:00-10:00'
    );
  });

  // --- LB-001B.1B: retiro de docenteName sintetizado (DB source of truth cleanup) ---

  it('getCurrentTeacherCourses() no hardcodea docenteName al mapear HorarioDocenteApiDto', () => {
    // TARGET (PLAN.md LB-001B.1B, AS-IS #9): HorarioDocenteApiDto no declara docenteName;
    // docenteName hardcodeado es CONTRACT_DRIFT sintetizado en el frontend.
    let courses: Course[] = [];
    service
      .getCurrentTeacherCourses()
      .subscribe((response) => (courses = response.datos));

    const request = http.expectOne(`${environment.apiUrl}/docente/horarios`);
    request.flush({
      exitoso: true,
      total: 1,
      datos: [
        {
          id: 'h1',
          idDocente: 'd1',
          idGrupo: 'g1',
          codigoMateria: 'IS-001',
          nombreMateria: 'Arquitectura',
          seccion: 'Grupo 1',
          dia: 'Lunes',
          horaInicio: '08:00:00',
          horaFin: '10:00:00',
          totalEstudiantes: 25,
        },
      ],
    });

    expect(courses.length).toBe(1);
    expect(courses[0].docenteName).not.toBe(['Docente', 'UCO'].join(' '));
    expect(courses[0].docenteName).toBeUndefined();
  });

  // --- LB-001B.5A: HorarioDocente no entrega aula → no se sintetiza room ---

  it('getCurrentTeacherCourses() no genera room desde HorarioDocente (ni marcador ni campo aula)', () => {
    let courses: Course[] = [];
    service
      .getCurrentTeacherCourses()
      .subscribe((response) => (courses = response.datos));

    http.expectOne(`${environment.apiUrl}/docente/horarios`).flush({
      exitoso: true,
      total: 1,
      datos: [
        {
          id: 'h1',
          idDocente: 'd1',
          idGrupo: 'g1',
          codigoMateria: 'IS-001',
          nombreMateria: 'Arquitectura',
          seccion: 'Grupo 1',
          dia: 'Lunes',
          horaInicio: '08:00:00',
          horaFin: '10:00:00',
          totalEstudiantes: 25,
          aula: 'AULA-FANTASMA',
        },
      ],
    });

    expect(courses.length).toBe(1);
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

  it('getTeacherCourses consulta y mapea la respuesta enriquecida', () => {
    let courses: Course[] = [];
    service.getTeacherCourses().subscribe((res) => (courses = res.datos));

    http.expectOne(`${environment.apiUrl}/docente/horarios`).flush({
      exitoso: true,
      total: 1,
      datos: [
        {
          id: 'h1',
          idDocente: 'd1',
          idGrupo: 'g1',
          codigoMateria: 'IS-001',
          nombreMateria: 'Arquitectura',
          seccion: 'Grupo 1',
          dia: 'Lunes',
          horaInicio: '08:00:00',
          horaFin: '10:00:00',
          totalEstudiantes: 20,
        },
      ],
    });

    expect(courses.length).toBe(1);
    expect(courses[0].id).toBe('g1');
  });

  it('getAsignaturasDocente consulta asignaturas del docente', () => {
    let asignaturas: unknown[] = [];
    service.getAsignaturasDocente().subscribe((res) => (asignaturas = res.datos));

    http.expectOne(`${environment.apiUrl}/docente/asignaturas`).flush({
      exitoso: true,
      datos: [{ id: 'asig-1', nombre: 'Ingeniería de Software' }],
    });

    expect(asignaturas.length).toBe(1);
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


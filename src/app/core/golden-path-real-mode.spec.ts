import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { CourseService } from './services/course.service';
import { GroupService } from './services/group.service';
import { SessionService } from './services/session.service';
import { AttendanceService } from './services/attendance.service';
import { AuthService } from './services/auth.service';

/**
 * MV-001 se ejecuta en modo REAL. Estos tests garantizan que, con
 * USE_MOCKS=false, los servicios del Golden Path hablan con HTTP y NUNCA
 * caen silenciosamente a datos mock (ni siquiera ante un error del backend).
 */
describe('Golden Path en modo REAL (USE_MOCKS=false)', () => {
  let http: HttpTestingController;
  const api = () => environment.apiUrl;

  beforeEach(() => {
    localStorage.removeItem('USE_MOCKS');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('por defecto (sin USE_MOCKS) useMocks y useFrontendMocks son false', () => {
    expect(environment.useMocks).toBeFalse();
    expect(environment.useFrontendMocks).toBeFalse();
  });

  it('USE_MOCKS=false explícito en localStorage también es real', () => {
    localStorage.setItem('USE_MOCKS', 'false');
    expect(environment.useMocks).toBeFalse();
    localStorage.removeItem('USE_MOCKS');
  });

  it('AuthService no arranca en modo mock', () => {
    expect(TestBed.inject(AuthService).isMockMode()).toBeFalse();
  });

  it('CourseService → GET /docente/asignaturas (fuente) y GET /docente/horarios (enriquecimiento)', () => {
    TestBed.inject(CourseService).getCurrentTeacherCourses().subscribe();
    const asignaturas = http.expectOne(`${api()}/docente/asignaturas`);
    const horarios = http.expectOne(`${api()}/docente/horarios`);
    expect(asignaturas.request.method).toBe('GET');
    expect(horarios.request.method).toBe('GET');
    asignaturas.flush({ exitoso: true, datos: [], total: 0 });
    horarios.flush({ exitoso: true, datos: [], total: 0 });
  });

  it('GroupService → GET /grupos/{id}/estudiantes', () => {
    TestBed.inject(GroupService).getStudentsByGroup('g1').subscribe();
    http.expectOne(`${api()}/grupos/g1/estudiantes`).flush({ exitoso: true, datos: [], total: 0 });
  });

  it('SessionService → GET /sesiones/grupo/{id}', () => {
    TestBed.inject(SessionService).getSessionsByGroup('g1').subscribe();
    http.expectOne(`${api()}/sesiones/grupo/g1`).flush({ exitoso: true, datos: [], total: 0 });
  });

  it('AttendanceService → GET /grupos/{id}/asistencias?sesionId= y POST /asistencias/lote', () => {
    const service = TestBed.inject(AttendanceService);
    service.getAttendancesByGroup('g1', 's1').subscribe();
    const get = http.expectOne((r) => r.url === `${api()}/grupos/g1/asistencias`);
    expect(get.request.params.get('sesionId')).toBe('s1');
    get.flush({ exitoso: true, datos: [], total: 0 });

    service.saveBatchAttendance({ sesionId: 's1', registros: [{ estudianteId: 'e1', estado: 'AN' }] }).subscribe();
    const post = http.expectOne(`${api()}/asistencias/lote`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ sesionId: 's1', registros: [{ estudianteId: 'e1', estado: 'AN' }] });
    post.flush({ exitoso: true, mensaje: 'ok' }, { status: 201, statusText: 'Created' });
  });

  it('un error HTTP se propaga: no hay fallback silencioso a mocks', () => {
    const results: string[] = [];
    TestBed.inject(CourseService).getCurrentTeacherCourses().subscribe({
      next: () => results.push('next'),
      error: () => results.push('error'),
    });
    http.expectOne(`${api()}/docente/asignaturas`).flush(null, { status: 500, statusText: 'Server Error' });
    expect(http.expectOne(`${api()}/docente/horarios`).cancelled).toBeTrue();

    TestBed.inject(SessionService).getSessionsByGroup('g1').subscribe({
      next: () => results.push('next'),
      error: () => results.push('error'),
    });
    http.expectOne(`${api()}/sesiones/grupo/g1`).flush(null, { status: 500, statusText: 'Server Error' });

    TestBed.inject(GroupService).getStudentsByGroup('g1').subscribe({
      next: () => results.push('next'),
      error: () => results.push('error'),
    });
    http.expectOne(`${api()}/grupos/g1/estudiantes`).flush(null, { status: 500, statusText: 'Server Error' });

    expect(results).toEqual(['error', 'error', 'error']);
  });

  it('Horario no trae aula en el contrato: Course.room no se toma de ningún campo aula ni se sintetiza', () => {
    let room: string | undefined = 'sin-asignar';
    TestBed.inject(CourseService).getCurrentTeacherCourses().subscribe((r) => (room = r.datos[0]?.room));
    http.expectOne(`${api()}/docente/asignaturas`).flush({
      exitoso: true,
      total: 1,
      datos: [{
        idAsignatura: 'a1', nombreAsignatura: 'Arq', idGrupo: 'g1', nombreGrupo: 'G1',
        idPrograma: 'p1', nombrePrograma: 'Sistemas',
      }],
    });
    http.expectOne(`${api()}/docente/horarios`).flush({
      exitoso: true,
      total: 1,
      datos: [{
        id: 'h1', idDocente: 'd1', idGrupo: 'g1', codigoMateria: 'IS-001', nombreMateria: 'Arq',
        seccion: 'G1', dia: 'Lunes', horaInicio: '08:00:00', horaFin: '10:00:00', totalEstudiantes: 3,
        aula: 'FANTASMA',
      }],
    });
    expect(room).toBeUndefined();
  });

  it('PATCH /sesiones/{id} consume ApiDataResponse<Void> sin fabricar idTransaccion/mensajeUsuario/ClassSession', () => {
    let response: unknown;
    TestBed.inject(SessionService)
      .updateSession('g1', 's1', { title: 'Editada', date: '2026-09-23', startTime: '09:00', endTime: '11:00' })
      .subscribe((r) => (response = r));

    const req = http.expectOne(`${api()}/sesiones/s1`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ exitoso: true, datos: null });

    expect(response).toEqual({ exitoso: true, datos: null });
  });
});

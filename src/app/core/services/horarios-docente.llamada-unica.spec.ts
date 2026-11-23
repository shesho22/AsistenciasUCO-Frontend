import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AttendanceClaimService } from './attendance-claim.service';
import { CourseService } from './course.service';

describe('Panel del docente: GET /docente/horarios una sola vez', () => {
  let http: HttpTestingController;
  let claim: AttendanceClaimService;
  let courses: CourseService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    claim = TestBed.inject(AttendanceClaimService);
    courses = TestBed.inject(CourseService);
  });

  it('comparte la petición entre la próxima clase y la lista de grupos', () => {
    let horarios: unknown;
    let grupos: unknown;
    claim.getHorarioDocente().subscribe((r) => (horarios = r));
    courses.getTeacherCourses().subscribe((r) => (grupos = r));

    const asignaturas = http.match((r) => r.url.endsWith('/docente/asignaturas'));
    expect(asignaturas.length).toBe(1);
    const pedidos = http.match((r) => r.url.endsWith('/docente/horarios'));
    expect(pedidos.length).withContext('horarios').toBe(1);
    pedidos[0].flush({ exitoso: true, total: 0, datos: [] });
    asignaturas[0].flush({ exitoso: true, total: 0, datos: [] });

    expect(horarios).toBeDefined();
    expect(grupos).toBeDefined();
  });

  it('una consulta posterior a la respuesta vuelve a pedirla (sin caché ni polling)', () => {
    claim.getHorarioDocente().subscribe();
    http.expectOne((r) => r.url.endsWith('/docente/horarios')).flush({ exitoso: true, datos: [] });
    claim.getHorarioDocente().subscribe();
    http.expectOne((r) => r.url.endsWith('/docente/horarios')).flush({ exitoso: true, datos: [] });
  });
});

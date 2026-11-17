import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TeacherAttendanceSummaryService } from './teacher-attendance-summary.service';

describe('TeacherAttendanceSummaryService (CULM-001 B.2, CONTRACT 3.2.8)', () => {
  it('B2-F-14 consultarResumen hace GET /docente/grupos/{id}/resumen-asistencia?pagina=&tamano=', () => {
    TestBed.configureTestingModule({
      providers: [TeacherAttendanceSummaryService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    const service = TestBed.inject(TeacherAttendanceSummaryService);
    const http = TestBed.inject(HttpTestingController);

    let respuesta: unknown;
    service.consultarResumen('g-1', 3, 50).subscribe((r) => (respuesta = r));
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/docente/grupos/g-1/resumen-asistencia`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pagina')).toBe('3');
    expect(req.request.params.get('tamano')).toBe('50');
    const body = { exitoso: true, elementos: [], numeroPagina: 3, tamanoPagina: 50, totalElementos: 0, totalPaginas: 0 };
    req.flush(body);
    expect(respuesta).toEqual(body);
    http.verify();
  });

  it('CIERRE-W3M consultarResumen envia busqueda recortada solo si hay texto', () => {
    TestBed.configureTestingModule({
      providers: [TeacherAttendanceSummaryService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    const service = TestBed.inject(TeacherAttendanceSummaryService);
    const http = TestBed.inject(HttpTestingController);

    service.consultarResumen('g-1', 1, 50, '  ana ').subscribe();
    service.consultarResumen('g-1', 1, 50, '   ').subscribe();
    service.consultarResumen('g-1', 1, 50).subscribe();

    const reqs = http.match((r) => r.url === `${environment.apiUrl}/docente/grupos/g-1/resumen-asistencia`);
    expect(reqs.map((req) => req.request.params.get('busqueda'))).toEqual(['ana', null, null]);
    reqs.forEach((req) => req.flush({}));
    http.verify();
  });
});

import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ResumenGruposDocente } from '../models/docente-resumen-grupos.model';
import { TeacherGruposResumenService } from './teacher-grupos-resumen.service';

describe('TeacherGruposResumenService (CIERRE-W3I)', () => {
  let service: TeacherGruposResumenService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TeacherGruposResumenService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(TeacherGruposResumenService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consultar hace GET /docente/resumen-grupos y entrega los totales tal como llegan', () => {
    let respuesta: ResumenGruposDocente | undefined;
    service.consultar().subscribe((r) => (respuesta = r.datos));

    const req = http.expectOne(`${environment.apiUrl}/docente/resumen-grupos`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: { gruposHabilitados: 2, estudiantesActivos: 4, cupoTotal: 50, tasaOcupacion: 8 } });

    expect(respuesta).toEqual({ gruposHabilitados: 2, estudiantesActivos: 4, cupoTotal: 50, tasaOcupacion: 8 });
  });

  it('propaga el error HTTP sin inventar totales', () => {
    let fallo: unknown;
    service.consultar().subscribe({ error: (e) => (fallo = e) });

    http.expectOne(`${environment.apiUrl}/docente/resumen-grupos`).flush({}, { status: 403, statusText: 'Forbidden' });

    expect(fallo).toBeTruthy();
  });
});

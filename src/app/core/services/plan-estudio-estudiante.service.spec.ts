import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PlanEstudioEstudianteService } from './plan-estudio-estudiante.service';
import { BYPASS_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';
import { environment } from '../../../environments/environment';

const URL = `${environment.apiUrl}/estudiante/plan-estudio`;

/** Servicio del plan de estudios del estudiante (PS-01). */
describe('PlanEstudioEstudianteService', () => {
  let service: PlanEstudioEstudianteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    service = TestBed.inject(PlanEstudioEstudianteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('PS-01 consulta el plan sin parámetros y sin toast global', () => {
    service.consultar().subscribe((res) => {
      expect(res.total).toBe(1);
      expect(res.datos[0].nombrePrograma).toBe('Ingenieria de Sistemas');
    });

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    expect(req.request.context.get(BYPASS_GLOBAL_ERROR_TOAST)).toBeTrue();
    req.flush({
      exitoso: true,
      total: 1,
      datos: [{
        idPlanEstudio: 'pl-1', inp: 2024, idPrograma: 'pr-1', nombrePrograma: 'Ingenieria de Sistemas', totalSemestres: 8,
        totalAsignaturas: 0, totalCreditos: 0, asignaturasCursando: 0, creditosCursando: 0, semestres: [],
      }],
    });
  });
});

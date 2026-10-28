import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OfertaAcademicaService } from './oferta-academica.service';
import { BYPASS_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';
import { environment } from '../../../environments/environment';

const URL = `${environment.apiUrl}/estudiante/oferta-academica`;

/** HU008: servicio de la oferta de grupos del estudiante (OS-01..OS-02). */
describe('OfertaAcademicaService (HU008)', () => {
  let service: OfertaAcademicaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OfertaAcademicaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('OS-01 consulta con paginación y búsqueda recortada, sin toast global', () => {
    service.consultar({ busqueda: '  algebra ', pagina: 2, tamano: 5 }).subscribe((res) => expect(res.total).toBe(1));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('busqueda')).toBe('algebra');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamano')).toBe('5');
    expect(req.request.context.get(BYPASS_GLOBAL_ERROR_TOAST)).toBeTrue();
    req.flush({ exitoso: true, datos: [], total: 1 });
  });

  it('OS-02 no envía la búsqueda vacía', () => {
    service.consultar({ busqueda: '   ', pagina: 1, tamano: 10 }).subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.has('busqueda')).toBeFalse();
    req.flush({ exitoso: true, datos: [], total: 0 });
  });
});

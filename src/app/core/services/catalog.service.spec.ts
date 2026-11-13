import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogService } from './catalog.service';
import { environment } from '../../../environments/environment';

describe('CatalogService', () => {
  let service: CatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('getIdentityDocumentTypes retorna tipos desde HTTP cuando no usa mocks', () => {
    spyOnProperty(environment, 'useFrontendMocks', 'get').and.returnValue(false);

    service.getIdentityDocumentTypes().subscribe((tipos) => {
      expect(tipos.length).toBe(2);
      expect(tipos[0].tipoIdentificacion).toBe('CC');
    });

    const req = http.expectOne(`${environment.apiUrl}/tipos-identificacion`);
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: '1', tipoIdentificacion: 'CC', nombre: 'Cédula de Ciudadanía' },
      { id: '2', tipoIdentificacion: 'TI', nombre: 'Tarjeta de Identidad' },
    ]);
  });

  it('getTiposIdentificacion retorna respuesta encapsulada desde HTTP', () => {
    spyOnProperty(environment, 'useFrontendMocks', 'get').and.returnValue(false);

    service.getTiposIdentificacion().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos.length).toBe(1);
      expect(res.datos[0].tipoIdentificacion).toBe('CC');
    });

    const req = http.expectOne(`${environment.apiUrl}/tipos-identificacion`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: '1', tipoIdentificacion: 'CC', nombre: 'Cédula de Ciudadanía' }]);
  });

  it('getFacultades retorna datos desde HTTP cuando el backend responde', () => {
    spyOnProperty(environment, 'useFrontendMocks', 'get').and.returnValue(false);

    service.getFacultades().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos.length).toBe(1);
      expect(res.datos[0].nombre).toBe('Facultad de Ingeniería');
    });

    const req = http.expectOne(`${environment.apiUrl}/admin/facultades`);
    expect(req.request.method).toBe('GET');
    req.flush({ datos: [{ id: 'fac-1', nombre: 'Facultad de Ingeniería' }] });
  });

  it('T-FE-01 getProgramasAcademicos consulta los programas activos reales y no devuelve datos quemados', (done) => {
    service.getProgramasAcademicos().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos).toEqual([{ id: '7d0f6a52-0000-4000-8000-000000000001', nombre: 'Ingeniería de Sistemas', facultad: 'Facultad de Ingeniería' }]);
      expect(res.datos.some((p) => p.id.startsWith('PROG-'))).toBeFalse();
      done();
    });

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/decano/programas`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('estaActivo')).toBe('true');
    expect(req.request.params.get('tamano')).toBe('100');
    req.flush({
      exitoso: true,
      datos: [{ id: '7d0f6a52-0000-4000-8000-000000000001', nombre: 'Ingeniería de Sistemas', nombreFacultad: 'Facultad de Ingeniería' }],
      total: 1,
    });
  });

  it('getProgramasAcademicos propaga el error del backend', (done) => {
    service.getProgramasAcademicos().subscribe({
      next: () => fail('no debe emitir éxito'),
      error: (e) => {
        expect(e.status).toBe(403);
        done();
      },
    });
    http.expectOne((r) => r.url === `${environment.apiUrl}/decano/programas`).flush({ message: 'x' }, { status: 403, statusText: 'Forbidden' });
  });

  it('getDepartamentosAcademicos retorna la lista institucional', (done) => {
    service.getDepartamentosAcademicos().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos.length).toBeGreaterThan(0);
      expect(res.datos.includes('Ingeniería de Sistemas')).toBeTrue();
      done();
    });
  });
});

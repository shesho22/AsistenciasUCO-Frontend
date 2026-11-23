import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminCatalogosService } from './admin-catalogos.service';

describe('AdminCatalogosService (solo lectura)', () => {
  let service: AdminCatalogosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminCatalogosService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminCatalogosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listarCategorias hace GET a /admin/categorias-justificacion', () => {
    service.listarCategorias().subscribe();
    const req = http.expectOne(`${environment.apiUrl}/admin/categorias-justificacion`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [], total: 0 });
  });

  it('listarMotivos hace GET a /admin/motivos-cancelacion-sesion', () => {
    service.listarMotivos().subscribe();
    const req = http.expectOne(`${environment.apiUrl}/admin/motivos-cancelacion-sesion`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [], total: 0 });
  });
});

import { HttpContext, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { BYPASS_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';
import { PerfilService, PerfilUsuario } from './perfil.service';

describe('PerfilService (HU006)', () => {
  let service: PerfilService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    service = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta GET /usuarios/perfil sin toast global de error', () => {
    let perfil: PerfilUsuario | undefined;
    service.consultar().subscribe((res) => (perfil = res.datos));

    const req = http.expectOne(`${environment.apiUrl}/usuarios/perfil`);
    expect(req.request.method).toBe('GET');
    expect((req.request.context as HttpContext).get(BYPASS_GLOBAL_ERROR_TOAST)).toBeTrue();
    req.flush({ exitoso: true, datos: { idUsuario: 'u-1', nombreCompleto: 'Ana Pérez', vinculos: [] } });

    expect(perfil?.idUsuario).toBe('u-1');
  });

  it('propaga el error HTTP a quien consulta, sin ocultarlo', () => {
    let status = 0;
    service.consultar().subscribe({ error: (err) => (status = err.status) });

    http.expectOne(`${environment.apiUrl}/usuarios/perfil`).flush({}, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
  });
});

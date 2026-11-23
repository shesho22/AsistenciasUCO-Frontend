import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { mockBackendInterceptor } from './mock-backend.interceptor';
import { responderCatalogosAdminMock } from '../mocks/mock-catalogos-admin';

/** Simulación en modo mock de los catálogos predefinidos: solo lectura. */
describe('mockBackendInterceptor - catálogos predefinidos', () => {
  const cat = `${environment.apiUrl}/admin/categorias-justificacion`;
  const mot = `${environment.apiUrl}/admin/motivos-cancelacion-sesion`;
  let http: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        provideHttpClient(withXhr(), withInterceptors([mockBackendInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    TestBed.inject(AuthService).setMockMode(true);
  });

  afterEach(() => localStorage.removeItem('USE_MOCKS'));

  it('lista categorías ordenadas por nombre y motivos por orden', fakeAsync(() => {
    let c: { datos: { nombre: string }[]; total: number } | undefined;
    let m: { datos: { orden: number }[] } | undefined;
    http.get<typeof c>(cat).subscribe((v) => (c = v));
    http.get<typeof m>(mot).subscribe((v) => (m = v));
    tick(1000);
    expect(c!.total).toBe(c!.datos.length);
    const nombres = c!.datos.map((d) => d.nombre);
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, 'es')));
    const ordenes = m!.datos.map((d) => d.orden);
    expect(ordenes).toEqual([...ordenes].sort((a, b) => a - b));
  }));

  it('el mock de catálogos no atiende escrituras (POST, PUT, PATCH)', () => {
    for (const metodo of ['POST', 'PUT', 'PATCH']) {
      expect(responderCatalogosAdminMock(cat, metodo)).toBeNull();
      expect(responderCatalogosAdminMock(`${mot}/x/estado`, metodo)).toBeNull();
    }
    expect(responderCatalogosAdminMock(`${environment.apiUrl}/otra-ruta`, 'GET')).toBeNull();
  });
});

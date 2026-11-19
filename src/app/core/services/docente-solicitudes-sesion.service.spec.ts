import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DocenteSolicitudesSesionService } from './docente-solicitudes-sesion.service';
import { environment } from '../../../environments/environment';
import { paginaApi } from '../testing/pagina-api';

describe('DocenteSolicitudesSesionService (ATA D6)', () => {
  let service: DocenteSolicitudesSesionService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/docente/sesiones/solicitudes`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    service = TestBed.inject(DocenteSolicitudesSesionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta con filtros y omite los vacíos', () => {
    let total = -1;
    service.consultar({ soloPendientes: false, grupoId: 'g-1', pagina: 2, tamano: 10 }).subscribe((p) => (total = p.totalElementos));
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('soloPendientes')).toBe('false');
    expect(req.request.params.get('grupoId')).toBe('g-1');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamano')).toBe('10');
    req.flush(paginaApi([], 2, 10, 7));
    expect(total).toBe(7);
  });

  it('no envía grupoId cuando no hay filtro por grupo', () => {
    service.consultar({ soloPendientes: true, pagina: 1, tamano: 20 }).subscribe();
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.has('grupoId')).toBeFalse();
    req.flush(paginaApi([]));
  });

  it('cuenta las pendientes con soloPendientes=true y una sola fila', () => {
    let total = -1;
    service.contarPendientes().subscribe((n) => (total = n));
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('soloPendientes')).toBe('true');
    expect(req.request.params.get('tamano')).toBe('1');
    req.flush(paginaApi([], 1, 1, 4));
    expect(total).toBe(4);
  });

  it('si la respuesta no trae total usa la cantidad de elementos', () => {
    let total = -1;
    service.contarPendientes().subscribe((n) => (total = n));
    http.expectOne((r) => r.url === url).flush({ exitoso: true, elementos: [{}] });
    expect(total).toBe(1);
  });

  it('si no trae total ni elementos cuenta cero', () => {
    let total = -1;
    service.contarPendientes().subscribe((n) => (total = n));
    http.expectOne((r) => r.url === url).flush({ exitoso: true });
    expect(total).toBe(0);
  });

  it('propaga el 403 con el mensaje del backend', () => {
    let mensaje = '';
    service.contarPendientes().subscribe({ error: (e) => (mensaje = e.error.message as string) });
    http.expectOne((r) => r.url === url).flush({ message: 'Sin permiso.' }, { status: 403, statusText: 'Forbidden' });
    expect(mensaje).toBe('Sin permiso.');
  });
});

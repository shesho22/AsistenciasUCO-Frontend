import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminCatalogosService } from './admin-catalogos.service';

describe('AdminCatalogosService', () => {
  let service: AdminCatalogosService;
  let http: HttpTestingController;
  const cat = () => `${environment.apiUrl}/admin/categorias-justificacion`;
  const mot = () => `${environment.apiUrl}/admin/motivos-cancelacion-sesion`;

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
    const req = http.expectOne(cat());
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [], total: 0 });
  });

  it('crearCategoria hace POST con el cuerpo tal cual', () => {
    const body = { codigo: 'MED', nombre: 'Médica', descripcion: 'x', requiereSoporte: true };
    service.crearCategoria(body).subscribe();
    const req = http.expectOne(cat());
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ exitoso: true, datos: { id: 'a' } });
  });

  it('editarCategoria hace PUT a /{id} sin código', () => {
    service.editarCategoria('c-1', { nombre: 'N', requiereSoporte: false }).subscribe();
    const req = http.expectOne(`${cat()}/c-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombre: 'N', requiereSoporte: false });
    req.flush({ exitoso: true, datos: { id: 'c-1' } });
  });

  it('cambiarEstadoCategoria hace PATCH a /{id}/estado con estaActivo', () => {
    service.cambiarEstadoCategoria('c-1', false).subscribe();
    const req = http.expectOne(`${cat()}/c-1/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estaActivo: false });
    req.flush({ exitoso: true, datos: { id: 'c-1', estaActivo: false } });
  });

  it('listarMotivos hace GET a /admin/motivos-cancelacion-sesion', () => {
    service.listarMotivos().subscribe();
    const req = http.expectOne(mot());
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [], total: 0 });
  });

  it('crearMotivo hace POST con código, nombre y orden', () => {
    service.crearMotivo({ codigo: 'X_Y', nombre: 'N', orden: 4 }).subscribe();
    const req = http.expectOne(mot());
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ codigo: 'X_Y', nombre: 'N', orden: 4 });
    req.flush({ exitoso: true, datos: { id: 'a' } });
  });

  it('editarMotivo hace PUT a /{id} con nombre y orden', () => {
    service.editarMotivo('m-1', { nombre: 'N', orden: 2 }).subscribe();
    const req = http.expectOne(`${mot()}/m-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombre: 'N', orden: 2 });
    req.flush({ exitoso: true, datos: { id: 'm-1' } });
  });

  it('cambiarEstadoMotivo hace PATCH a /{id}/estado', () => {
    service.cambiarEstadoMotivo('m-1', true).subscribe();
    const req = http.expectOne(`${mot()}/m-1/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estaActivo: true });
    req.flush({ exitoso: true, datos: { id: 'm-1', estaActivo: true } });
  });
});

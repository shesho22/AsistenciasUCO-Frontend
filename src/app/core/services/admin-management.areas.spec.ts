import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminManagementService } from './admin-management.service';
import { environment } from '../../../environments/environment';
import { AreaConocimientoItem } from '../models/role-management.model';

describe('AdminManagementService - áreas de conocimiento (HU150, solo consulta)', () => {
  let service: AdminManagementService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/admin/areas`;

  const pre: AreaConocimientoItem = { id: 't-1', codigo: 'ISW', nombre: 'Ingeniería de Software', activa: true };
  const pos: AreaConocimientoItem = { id: 't-2', codigo: 'CBA', nombre: 'Ciencias Básicas', activa: true };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminManagementService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function cargarInicial(): void {
    service.cargarAreas().subscribe();
    http.expectOne(base).flush({ exitoso: true, datos: [pre, pos] });
  }

  it('cargarAreas obtiene el catalogo completo y actualiza la señal', () => {
    let respuesta: any;
    service.cargarAreas().subscribe((res) => (respuesta = res));

    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [pre, pos] });

    expect(respuesta.exitoso).toBeTrue();
    expect(service.areas()).toEqual([pre, pos]);
  });

  it('cargarAreas no modifica la señal si la respuesta no es exitosa', () => {
    service.cargarAreas().subscribe();
    http.expectOne(base).flush({ exitoso: false, datos: [pre] });

    expect(service.areas()).toEqual([]);
  });
});

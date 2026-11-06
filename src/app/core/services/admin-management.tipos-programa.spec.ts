import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminManagementService } from './admin-management.service';
import { environment } from '../../../environments/environment';
import { TipoProgramaItem } from '../models/role-management.model';

describe('AdminManagementService - tipos de programa (HU154, solo consulta)', () => {
  let service: AdminManagementService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/admin/tipos-programa`;

  const pre: TipoProgramaItem = { id: 't-1', codigo: 'PRE', nombre: 'pregrado', activo: true };
  const pos: TipoProgramaItem = { id: 't-2', codigo: 'POS', nombre: 'postgrado', activo: true };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminManagementService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function cargarInicial(): void {
    service.cargarTiposPrograma().subscribe();
    http.expectOne(base).flush({ exitoso: true, datos: [pre, pos] });
  }

  it('cargarTiposPrograma obtiene el catalogo completo y actualiza la señal', () => {
    let respuesta: any;
    service.cargarTiposPrograma().subscribe((res) => (respuesta = res));

    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [pre, pos] });

    expect(respuesta.exitoso).toBeTrue();
    expect(service.tiposPrograma()).toEqual([pre, pos]);
  });

  it('cargarTiposPrograma no modifica la señal si la respuesta no es exitosa', () => {
    service.cargarTiposPrograma().subscribe();
    http.expectOne(base).flush({ exitoso: false, datos: [pre] });

    expect(service.tiposPrograma()).toEqual([]);
  });
});

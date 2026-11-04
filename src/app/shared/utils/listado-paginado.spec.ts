import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ListadoPaginado, estadoComoFiltro } from './listado-paginado';
import { ApiResponse } from '../../core/models/api-response.model';

describe('ListadoPaginado (HU112/HU128/HU143/HU157)', () => {
  it('carga filas y total, y la búsqueda vuelve a la primera página', () => {
    const consultar = jasmine.createSpy('consultar').and.returnValue(of({ exitoso: true, datos: ['a', 'b'], total: 12 }));
    const listado = new ListadoPaginado<string>(consultar, jasmine.createSpy('alFallar'));

    listado.irAPagina(3);
    expect(consultar).toHaveBeenCalledWith(3, 10);
    expect(listado.filas()).toEqual(['a', 'b']);
    expect(listado.total()).toBe(12);
    expect(listado.cargando()).toBeFalse();

    listado.buscar();
    expect(consultar).toHaveBeenCalledWith(1, 10);

    listado.cambiarTamano(20);
    expect(listado.pagina()).toBe(1);
    expect(consultar).toHaveBeenCalledWith(1, 20);
  });

  it('una respuesta sin datos ni total deja la lista vacía', () => {
    const listado = new ListadoPaginado<string>(() => of({ exitoso: true } as ApiResponse<string[]>), jasmine.createSpy('alFallar'));
    listado.cargar();
    expect(listado.filas()).toEqual([]);
    expect(listado.total()).toBe(0);
  });

  it('un error limpia la lista e informa el mensaje del servidor', () => {
    const alFallar = jasmine.createSpy('alFallar');
    const error = new HttpErrorResponse({ status: 403, error: { mensaje: 'Sin permiso' } });
    const listado = new ListadoPaginado<string>(() => throwError(() => error), alFallar);
    listado.filas.set(['viejo']);
    listado.total.set(1);

    listado.cargar();

    expect(listado.filas()).toEqual([]);
    expect(listado.total()).toBe(0);
    expect(listado.cargando()).toBeFalse();
    expect(alFallar).toHaveBeenCalled();
  });

  it('traduce el selector de estado al filtro del backend', () => {
    expect(estadoComoFiltro('TODOS')).toBeNull();
    expect(estadoComoFiltro('ACTIVO')).toBeTrue();
    expect(estadoComoFiltro('INACTIVO')).toBeFalse();
  });
});

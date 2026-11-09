import { Observable, of } from 'rxjs';
import { PaginaApi } from '../../../../core/models/toma-asistencia.model';
import { cargarTodasLasPaginas } from './toma-paginas.util';

function pagina(numero: number, total: number, elementos: string[]): PaginaApi<string> {
  return { exitoso: true, elementos, numeroPagina: numero, tamanoPagina: 2, totalElementos: 5, totalPaginas: total };
}

describe('cargarTodasLasPaginas (toma)', () => {
  it('acumula en orden todas las paginas que reporta el backend', (done) => {
    const paginas = [pagina(1, 3, ['a', 'b']), pagina(2, 3, ['c', 'd']), pagina(3, 3, ['e'])];
    const pedir = jasmine.createSpy('pedir').and.callFake((n: number): Observable<PaginaApi<string>> => of(paginas[n - 1]));
    cargarTodasLasPaginas(pedir).subscribe((todo) => {
      expect(todo).toEqual(['a', 'b', 'c', 'd', 'e']);
      expect(pedir.calls.allArgs()).toEqual([[1], [2], [3]]);
      done();
    });
  });

  it('con una sola pagina pide solo la primera', (done) => {
    const pedir = jasmine.createSpy('pedir').and.returnValue(of(pagina(1, 1, ['a'])));
    cargarTodasLasPaginas(pedir).subscribe((todo) => {
      expect(todo).toEqual(['a']);
      expect(pedir).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('con cero paginas devuelve una lista vacia', (done) => {
    const pedir = jasmine.createSpy('pedir').and.returnValue(of(pagina(1, 0, [])));
    cargarTodasLasPaginas(pedir).subscribe((todo) => {
      expect(todo).toEqual([]);
      done();
    });
  });
});

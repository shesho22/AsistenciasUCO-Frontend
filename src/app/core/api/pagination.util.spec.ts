import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpParams, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TAMANO_PAGINA_MAXIMO, obtenerTodasLasPaginas, paramsSinVacios } from './pagination.util';
import { paginaApi, porUrl } from '../testing/pagina-api';

describe('pagination.util', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;
  const url = 'http://api.test/lista';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
  });
  afterEach(() => http.verify());

  it('pide páginas del tamaño máximo con los filtros y junta los elementos', () => {
    let resultado: { elementos: string[]; total: number } | undefined;
    obtenerTodasLasPaginas<string>(cliente, url, new HttpParams().set('programaId', 'p-1')).subscribe((r) => (resultado = r));

    const primera = http.expectOne(porUrl(url));
    expect(primera.request.params.get('pagina')).toBe('1');
    expect(primera.request.params.get('tamano')).toBe(String(TAMANO_PAGINA_MAXIMO));
    expect(primera.request.params.get('programaId')).toBe('p-1');
    primera.flush({ ...paginaApi(['a', 'b'], 1, 2, 5), totalPaginas: 3 });

    const segunda = http.expectOne(porUrl(url));
    expect(segunda.request.params.get('pagina')).toBe('2');
    segunda.flush({ ...paginaApi(['c', 'd'], 2, 2, 5), totalPaginas: 3 });

    const tercera = http.expectOne(porUrl(url));
    expect(tercera.request.params.get('pagina')).toBe('3');
    tercera.flush({ ...paginaApi(['e'], 3, 2, 5), totalPaginas: 3 });

    expect(resultado).toEqual({ elementos: ['a', 'b', 'c', 'd', 'e'], total: 5 });
  });

  it('con una sola página hace una sola petición', () => {
    let resultado: { elementos: string[]; total: number } | undefined;
    obtenerTodasLasPaginas<string>(cliente, url).subscribe((r) => (resultado = r));
    http.expectOne(porUrl(url)).flush(paginaApi(['a']));
    expect(resultado).toEqual({ elementos: ['a'], total: 1 });
  });

  it('tolera una respuesta sin metadatos de paginación', () => {
    let resultado: { elementos: string[]; total: number } | undefined;
    obtenerTodasLasPaginas<string>(cliente, url).subscribe((r) => (resultado = r));
    http.expectOne(porUrl(url)).flush({ exitoso: true });
    expect(resultado).toEqual({ elementos: [], total: 0 });
  });

  it('propaga el error HTTP', () => {
    let status = 0;
    obtenerTodasLasPaginas<string>(cliente, url).subscribe({ error: (e) => (status = e.status) });
    http.expectOne(porUrl(url)).flush({}, { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
  });

  it('paramsSinVacios omite nulos, indefinidos y cadenas vacías', () => {
    const params = paramsSinVacios({ a: 'x ', b: '', c: null, d: undefined, e: 0, f: false });
    expect(params.keys().sort()).toEqual(['a', 'e', 'f']);
    expect(params.get('a')).toBe('x');
    expect(params.get('f')).toBe('false');
  });
});

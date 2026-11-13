import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoordinatorProgramService } from './coordinator-program.service';
import { environment } from '../../../environments/environment';
import { paginaApi, porUrl } from '../testing/pagina-api';

describe('CoordinatorProgramService (S4, B2NM)', () => {
  const url = `${environment.apiUrl}/coordinador/planes-estudio`;
  const CLAVE = 'coordinador.programaId';
  let http: HttpTestingController;

  function crear(): CoordinatorProgramService {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(CoordinatorProgramService);
  }

  const plan = (idPrograma: string, nombrePrograma: string) => ({ id: `plan-${idPrograma}-${Math.random()}`, idPrograma, nombrePrograma });

  beforeEach(() => sessionStorage.removeItem(CLAVE));
  afterEach(() => {
    http.verify();
    sessionStorage.removeItem(CLAVE);
  });

  it('deriva los programas distintos de los planes y deja el primero seleccionado', () => {
    const service = crear();
    expect(service.programaId()).toBeNull();
    expect(service.cargado()).toBeFalse();

    service.cargar().subscribe();
    http.expectOne(porUrl(url)).flush(paginaApi([plan('p-1', 'Sistemas'), plan('p-2', 'Software'), plan('p-1', 'Sistemas')]));

    expect(service.programas().map((p) => p.nombrePrograma)).toEqual(['Sistemas', 'Software']);
    expect(service.requiereSelector()).toBeTrue();
    expect(service.programaId()).toBe('p-1');
    expect(sessionStorage.getItem(CLAVE)).toBe('p-1');
  });

  it('con un solo programa no pide selector pero conserva el programa para enviarlo siempre', () => {
    const service = crear();
    service.cargar().subscribe();
    http.expectOne(porUrl(url)).flush(paginaApi([plan('p-1', 'Sistemas')]));
    expect(service.requiereSelector()).toBeFalse();
    expect(service.programaId()).toBe('p-1');
  });

  it('no repite la consulta una vez cargado, salvo que se fuerce', () => {
    const service = crear();
    service.cargar().subscribe();
    http.expectOne(porUrl(url)).flush(paginaApi([plan('p-1', 'Sistemas')]));

    let recibidos = 0;
    service.cargar().subscribe((p) => (recibidos = p.length));
    http.expectNone(porUrl(url));
    expect(recibidos).toBe(1);

    service.cargar(true).subscribe();
    http.expectOne(porUrl(url)).flush(paginaApi([plan('p-1', 'Sistemas')]));
  });

  it('conserva la selección de la sesión si el programa sigue en su ámbito', () => {
    sessionStorage.setItem(CLAVE, 'p-2');
    const service = crear();
    expect(service.programaId()).toBe('p-2');
    service.cargar().subscribe();
    http.expectOne(porUrl(url)).flush(paginaApi([plan('p-1', 'Sistemas'), plan('p-2', 'Software')]));
    expect(service.programaId()).toBe('p-2');
  });

  it('descarta una selección guardada que ya no está en su ámbito', () => {
    sessionStorage.setItem(CLAVE, 'p-viejo');
    const service = crear();
    service.cargar().subscribe();
    http.expectOne(porUrl(url)).flush(paginaApi([plan('p-1', 'Sistemas')]));
    expect(service.programaId()).toBe('p-1');
    expect(sessionStorage.getItem(CLAVE)).toBe('p-1');
  });

  it('sin planes no hay programa y se limpia la sesión', () => {
    sessionStorage.setItem(CLAVE, 'p-viejo');
    const service = crear();
    service.cargar().subscribe();
    http.expectOne(porUrl(url)).flush(paginaApi([]));
    expect(service.programaId()).toBeNull();
    expect(service.programas()).toEqual([]);
    expect(sessionStorage.getItem(CLAVE)).toBeNull();
  });

  it('seleccionar ignora un programa ajeno y guarda uno propio en la sesión', () => {
    const service = crear();
    service.cargar().subscribe();
    http.expectOne(porUrl(url)).flush(paginaApi([plan('p-1', 'Sistemas'), plan('p-2', 'Software')]));

    service.seleccionar('p-ajeno');
    expect(service.programaId()).toBe('p-1');
    service.seleccionar('p-2');
    expect(service.programaId()).toBe('p-2');
    expect(sessionStorage.getItem(CLAVE)).toBe('p-2');
  });

  it('si el almacenamiento de sesión falla, la selección vive en memoria', () => {
    const service = crear();
    service.cargar().subscribe();
    http.expectOne(porUrl(url)).flush(paginaApi([plan('p-1', 'Sistemas'), plan('p-2', 'Software')]));
    spyOn(Storage.prototype, 'setItem').and.throwError('bloqueado');
    expect(() => service.seleccionar('p-2')).not.toThrow();
    expect(service.programaId()).toBe('p-2');
  });

  it('propaga el error del backend y no marca los programas como cargados', () => {
    const service = crear();
    let status = 0;
    service.cargar().subscribe({ error: (e) => (status = e.status) });
    http.expectOne(porUrl(url)).flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
    expect(service.cargado()).toBeFalse();
  });

  it('DEC-065 (2): dos pantallas que piden los programas a la vez comparten una sola consulta', () => {
    const service = crear();
    let a: unknown[] = [];
    let b: unknown[] = [];
    service.cargar().subscribe((p) => (a = p));
    service.cargar().subscribe((p) => (b = p));

    http.expectOne(porUrl(url)).flush(paginaApi([plan('p-1', 'Sistemas')]));

    expect(a.length).toBe(1);
    expect(b.length).toBe(1);
    expect(service.cargado()).toBeTrue();
  });

  it('DEC-065 (2): tras un error la siguiente carga vuelve a consultar', () => {
    const service = crear();
    service.cargar().subscribe({ error: () => undefined });
    http.expectOne(porUrl(url)).flush({ message: 'x' }, { status: 500, statusText: 'Server Error' });

    service.cargar().subscribe();
    http.expectOne(porUrl(url)).flush(paginaApi([plan('p-1', 'Sistemas')]));
    expect(service.cargado()).toBeTrue();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanFacultadService } from './dean-facultad.service';
import { environment } from '../../../environments/environment';

describe('DeanFacultadService (F-DEC-003 & §11.3 ApiPageResponse)', () => {
  let service: DeanFacultadService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/decano`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(DeanFacultadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getSesiones consume ApiPageResponse y soporta filtro por idGrupo', () => {
    let resultado: any;
    service.getSesiones({ pagina: 1, tamano: 10, idGrupo: 'grp-123' }).subscribe((res) => (resultado = res));

    const req = http.expectOne((r) => r.url === `${api}/sesiones`);
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('10');
    expect(req.request.params.get('idGrupo')).toBe('grp-123');

    req.flush({
      exitoso: true,
      elementos: [{ id: 'ses-1', nombre: 'Sesión 1', idGrupo: 'grp-123' }],
      numeroPagina: 1,
      tamanoPagina: 10,
      totalElementos: 1,
      totalPaginas: 1,
    });

    expect(resultado.elementos.length).toBe(1);
    expect(resultado.totalElementos).toBe(1);
    expect(resultado.totalPaginas).toBe(1);
  });

  it('getGrupoDetalle consulta GET /decano/grupos/{grupoId}', () => {
    let resultado: any;
    service.getGrupoDetalle('grp-123').subscribe((res) => (resultado = res));

    const req = http.expectOne(`${api}/grupos/grp-123`);
    expect(req.request.method).toBe('GET');

    req.flush({
      exitoso: true,
      datos: { id: 'grp-123', codigo: 'G1', nombre: 'Grupo 01', cupoMaximo: 30 },
    });

    expect(resultado.exitoso).toBeTrue();
    expect(resultado.datos.id).toBe('grp-123');
  });

  it('getEstudiantes envía parámetros de paginación y búsqueda', () => {
    service.getEstudiantes({ busqueda: 'Ana', idPrograma: 'prog-1', pagina: 1, tamano: 15 }).subscribe();

    const req = http.expectOne((r) => r.url === `${api}/estudiantes`);
    expect(req.request.params.get('busqueda')).toBe('Ana');
    expect(req.request.params.get('idPrograma')).toBe('prog-1');
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('15');

    req.flush({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 15, totalElementos: 0, totalPaginas: 0 });
  });
});

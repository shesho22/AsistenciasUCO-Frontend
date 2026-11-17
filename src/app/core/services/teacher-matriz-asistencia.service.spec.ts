import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MatrizAsistenciaPagina } from '../models/matriz-asistencia.model';
import { TeacherMatrizAsistenciaService } from './teacher-matriz-asistencia.service';

describe('TeacherMatrizAsistenciaService (CIERRE-W3M)', () => {
  let service: TeacherMatrizAsistenciaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TeacherMatrizAsistenciaService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(TeacherMatrizAsistenciaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const url = (ruta: string) => `${environment.apiUrl}/docente/grupos/g-1/${ruta}`;

  it('consultarMatriz hace GET /docente/grupos/{id}/matriz-asistencia con pagina, tamano y busqueda recortada', () => {
    let respuesta: MatrizAsistenciaPagina | undefined;
    service.consultarMatriz('g-1', 2, 50, '  ana ').subscribe((r) => (respuesta = r));

    const req = http.expectOne((r) => r.url === url('matriz-asistencia'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamano')).toBe('50');
    expect(req.request.params.get('busqueda')).toBe('ana');
    const body: MatrizAsistenciaPagina = {
      exitoso: true,
      sesiones: [],
      elementos: [],
      numeroPagina: 2,
      tamanoPagina: 50,
      totalElementos: 0,
      totalPaginas: 0,
    };
    req.flush(body);
    expect(respuesta).toEqual(body);
  });

  it('consultarMatriz omite busqueda cuando esta vacia o en blanco', () => {
    service.consultarMatriz('g-1', 1, 50).subscribe();
    service.consultarMatriz('g-1', 1, 50, '   ').subscribe();

    const reqs = http.match((r) => r.url === url('matriz-asistencia'));
    expect(reqs.length).toBe(2);
    for (const req of reqs) {
      expect(req.request.params.has('busqueda')).toBeFalse();
      req.flush({});
    }
  });

  it('consultarMatriz propaga el error HTTP', () => {
    let status = 0;
    service.consultarMatriz('g-1', 1, 50).subscribe({ error: (e) => (status = e.status) });

    http.expectOne((r) => r.url === url('matriz-asistencia')).flush({ message: 'x' }, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
  });

  it('consultarResumenSesiones hace GET /docente/grupos/{id}/resumen-sesiones', () => {
    let datos: unknown;
    service.consultarResumenSesiones('g-1').subscribe((r) => (datos = r.datos));

    const req = http.expectOne(url('resumen-sesiones'));
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: { sesionesProgramadas: 3, sesiones: [] } });

    expect(datos).toEqual({ sesionesProgramadas: 3, sesiones: [] });
  });
});

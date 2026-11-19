import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FaltaReclamableService } from './falta-reclamable.service';
import { environment } from '../../../environments/environment';

describe('FaltaReclamableService (ATA D10)', () => {
  let service: FaltaReclamableService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/estudiante/faltas-reclamables`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FaltaReclamableService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta sin filtro no envía parámetros', () => {
    service.consultar().subscribe();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ exitoso: true, elementos: [], totalElementos: 0 });
  });

  it('consulta con filtro envía pagina y tamano', () => {
    service.consultar({ pagina: 2, tamano: 20 }).subscribe();
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamano')).toBe('20');
    req.flush({ exitoso: true, elementos: [], totalElementos: 0 });
  });

  it('contar pide una fila y devuelve totalElementos', (done) => {
    service.contar().subscribe((n) => {
      expect(n).toBe(4);
      done();
    });
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('tamano')).toBe('1');
    req.flush({ exitoso: true, elementos: [], totalElementos: 4 });
  });

  it('contar devuelve 0 si el backend no informa total', (done) => {
    service.contar().subscribe((n) => {
      expect(n).toBe(0);
      done();
    });
    http.expectOne((r) => r.url === url).flush({ exitoso: true, elementos: [] });
  });
});

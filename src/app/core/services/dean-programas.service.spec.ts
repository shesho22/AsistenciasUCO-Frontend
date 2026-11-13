import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanProgramasService } from './dean-programas.service';
import { environment } from '../../../environments/environment';
import { ProgramaAcademico, ProgramaPayload } from '../models/programa-academico.model';

describe('DeanProgramasService', () => {
  let service: DeanProgramasService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/decano/programas`;

  const programa: ProgramaAcademico = {
    id: 'p-1',
    nombre: 'Ingeniería de Sistemas',
    idTipoPrograma: 't-1',
    nombreTipoPrograma: 'pregrado',
    idModalidad: 'm-1',
    nombreModalidad: 'Presencial',
    idJornada: null,
    nombreJornada: null,
    idCoordinador: 'c-1',
    nombreCoordinador: 'Ana Pérez',
    idFacultad: 'f-1',
    nombreFacultad: 'Facultad de Ingeniería',
    estaActivo: true,
  };
  const payload: ProgramaPayload = {
    nombre: 'Ingeniería de Sistemas',
    idTipoPrograma: 't-1',
    idCoordinador: 'c-1',
    idModalidad: 'm-1',
    idJornada: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    service = TestBed.inject(DeanProgramasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consultar envía solo los filtros presentes y publica programas y total en los signals', () => {
    service.consultar({ pagina: 2, tamano: 5, nombre: 'Sis', estaActivo: true, idTipoPrograma: 't-1' }).subscribe();
    expect(service.cargando()).toBeTrue();

    const req = http.expectOne((r) => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamano')).toBe('5');
    expect(req.request.params.get('nombre')).toBe('Sis');
    expect(req.request.params.get('estaActivo')).toBe('true');
    expect(req.request.params.get('idTipoPrograma')).toBe('t-1');
    req.flush({ exitoso: true, datos: [programa], total: 12 });

    expect(service.programas()).toEqual([programa]);
    expect(service.total()).toBe(12);
    expect(service.cargando()).toBeFalse();
  });

  it('consultar omite los filtros vacíos', () => {
    service.consultar({ pagina: 1, tamano: 10 }).subscribe();
    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.keys().sort()).toEqual(['pagina', 'tamano']);
    req.flush({ exitoso: true, datos: [], total: 0 });
    expect(service.programas()).toEqual([]);
    expect(service.total()).toBe(0);
  });

  it('consultar propaga el error sin tocar los signals y apaga cargando', () => {
    let fallo: unknown;
    service.consultar({ pagina: 1, tamano: 10 }).subscribe({ error: (e) => (fallo = e) });
    http.expectOne((r) => r.url === base).flush({ message: 'x' }, { status: 403, statusText: 'Forbidden' });

    expect(fallo).toBeTruthy();
    expect(service.programas()).toEqual([]);
    expect(service.cargando()).toBeFalse();
  });

  it('crear hace POST con el payload y devuelve el programa sin modificar la lista local', () => {
    let creado: ProgramaAcademico | undefined;
    service.crear(payload).subscribe((res) => (creado = res.datos));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ exitoso: true, datos: programa }, { status: 201, statusText: 'Created' });

    expect(creado).toEqual(programa);
    expect(service.programas()).toEqual([]);
  });

  it('actualizar hace PUT al id indicado', () => {
    service.actualizar('p-1', payload).subscribe();
    const req = http.expectOne(`${base}/p-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ exitoso: true, datos: programa });
  });

  it('cambiarEstado hace PATCH con el estado destino explícito', () => {
    service.cambiarEstado('p-1', false).subscribe();
    const req = http.expectOne(`${base}/p-1/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estaActivo: false });
    req.flush({ exitoso: true, datos: { ...programa, estaActivo: false } });
  });

  for (const [codigo, status] of [['crear', 409], ['actualizar', 404], ['cambiarEstado', 409]] as const) {
    it(`${codigo} propaga el error ${status} sin convertirlo en éxito`, () => {
      let fallo: { status?: number } | undefined;
      const obs =
        codigo === 'crear'
          ? service.crear(payload)
          : codigo === 'actualizar'
            ? service.actualizar('p-1', payload)
            : service.cambiarEstado('p-1', false);
      obs.subscribe({ next: () => fail('no debe emitir éxito'), error: (e) => (fallo = e) });
      http.expectOne((r) => r.url.startsWith(base)).flush({ message: 'conflicto' }, { status, statusText: 'Error' });
      expect(fallo?.status).toBe(status);
    });
  }

  it('los catálogos leen sus endpoints y devuelven la lista', () => {
    const items = [{ id: 'x', codigo: 'PRE', nombre: 'pregrado' }];
    let tipos: unknown, modalidades: unknown, jornadas: unknown;
    service.getTiposPrograma().subscribe((r) => (tipos = r));
    service.getModalidades().subscribe((r) => (modalidades = r));
    service.getJornadas().subscribe((r) => (jornadas = r));
    http.expectOne(`${environment.apiUrl}/tipos-programa`).flush(items);
    http.expectOne(`${environment.apiUrl}/modalidades-programa`).flush(items);
    http.expectOne(`${environment.apiUrl}/jornadas-programa`).flush(items);
    expect(tipos).toEqual(items);
    expect(modalidades).toEqual(items);
    expect(jornadas).toEqual(items);
  });
});

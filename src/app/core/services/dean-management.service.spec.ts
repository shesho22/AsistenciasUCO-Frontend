import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanManagementService } from './dean-management.service';
import { paginaApi } from '../testing/pagina-api';
import { environment } from '../../../environments/environment';
import { CoordinadorItem } from '../models/role-management.model';

describe('DeanManagementService', () => {
  let service: DeanManagementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DeanManagementService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(DeanManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('getCoordinadores obtiene la lista de coordinadores por GET', () => {
    const mockCoordinadores: CoordinadorItem[] = [
      {
        id: 'coord-1',
        numeroIdentificacion: '10170001',
        nombres: 'Carlos',
        apellidos: 'Ramírez',
        correo: 'cramirez@uco.edu.co',
        facultad: 'Facultad de Ingeniería',
        programaAcademico: 'Ingeniería de Sistemas',
        estado: 'ACTIVO',
        totalDocentes: 12,
        totalGrupos: 18,
      },
    ];

    service.getCoordinadores().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.length).toBe(1);
      expect(res.datos?.[0].nombres).toBe('Carlos');
    });

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/decano/coordinadores`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(paginaApi(mockCoordinadores));
  });

  it('getCoordinadores normaliza y deduplica DTOs del backend incluyendo coordinadores sin programa', () => {
    const backendDtos = [
      {
        id: 'coord-dto-1',
        idUsuario: 'usr-1',
        numeroIdentificacion: '1017555444',
        nombreCompleto: 'Jorge Luis Henao Perez',
        idPrograma: null,
        nombrePrograma: null,
        estaActivoCoordinador: true,
      },
      {
        id: 'coord-dto-1',
        idUsuario: 'usr-1',
        numeroIdentificacion: '1017555444',
        nombreCompleto: 'Jorge Luis Henao Perez',
        idPrograma: 'prog-1',
        nombrePrograma: 'Ingeniería de Sistemas',
        estaActivoCoordinador: true,
      },
    ];

    service.getCoordinadores().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.length).toBe(1);
      expect(res.datos?.[0].nombres).toBe('Jorge Luis');
      expect(res.datos?.[0].apellidos).toBe('Henao Perez');
      expect(res.datos?.[0].programaAcademico).toBe('Sin Programa Asignado');
      expect(res.datos?.[0].estado).toBe('ACTIVO');
      // Certificación F3: el contrato no trae facultad ni conteos; no se inventan "Sin Facultad Asignada" ni ceros.
      expect(res.datos?.[0].facultad).toBe('');
      expect(res.datos?.[0].totalDocentes).toBeNull();
      expect(res.datos?.[0].totalGrupos).toBeNull();
    });

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/decano/coordinadores`);
    expect(req.request.method).toBe('GET');
    req.flush(paginaApi(backendDtos));
  });

  it('certificación F3: usa la facultad y los conteos reales que envía /decano/coordinadores', () => {
    service.getCoordinadores().subscribe((res) => {
      expect(res.datos?.[0].facultad).toBe('Facultad de Ingeniería');
      expect(res.datos?.[0].totalDocentes).toBe(1);
      expect(res.datos?.[0].totalGrupos).toBe(2);
    });

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/decano/coordinadores`);
    req.flush(paginaApi([
        {
          id: 'coord-3',
          idUsuario: 'usr-3',
          numeroIdentificacion: '1017000002',
          nombreCompleto: 'Andres Felipe Lopez Martinez',
          idPrograma: 'prog-1',
          nombrePrograma: 'Ingeniería de Sistemas',
          estaActivoCoordinador: true,
          nombreFacultad: 'Facultad de Ingeniería',
          totalDocentes: 1,
          totalGrupos: 2,
        },
    ]));
  });

  it('F3-DEC-02: consume ApiPageResponse (elementos/totalElementos) y entrega el coordinador', () => {
    let datos: CoordinadorItem[] | undefined;
    service.getCoordinadores().subscribe((res) => (datos = res.datos));
    http.expectOne((r) => r.url === `${environment.apiUrl}/decano/coordinadores`).flush(
      paginaApi([{ id: 'c1', idUsuario: 'u1', numeroIdentificacion: '1', nombreCompleto: 'Andres Felipe Lopez Martinez', estaActivoCoordinador: true }])
    );
    expect(datos?.length).toBe(1);
    expect(datos?.[0].nombreCompleto).toBe('Andres Felipe Lopez Martinez');
  });

  it('createCoordinador envía POST con los datos del nuevo coordinador', () => {
    const nuevo: Omit<CoordinadorItem, 'id' | 'totalDocentes' | 'totalGrupos'> = {
      numeroIdentificacion: '10170002',
      nombres: 'Ana',
      apellidos: 'Gómez',
      correo: 'agomez@uco.edu.co',
      facultad: 'Facultad de Ingeniería',
      programaAcademico: 'Ingeniería Industrial',
      estado: 'ACTIVO',
    };

    service.createCoordinador(nuevo).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.nombres).toBe('Ana');
    });

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevo);
    req.flush({ exitoso: true, datos: { id: 'coord-2', ...nuevo, totalDocentes: 0, totalGrupos: 0 } });
  });

  // HU121-HU122 (CONTRACT §4, congelado 2026-10-22, D6): el antiguo `toggleCoordinadorStatus` llamaba a
  // `PATCH …/{id}/toggle`, ruta que el backend nunca tuvo (es `…/estado`). Se reemplaza su prueba por estas.
  it('setCoordinadorEstado envía PATCH …/estado con el estado explícito en el cuerpo', () => {
    service.setCoordinadorEstado('coord-1', false).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.idCoordinador).toBe('coord-1');
      expect(res.datos?.sincronizacionIdentidad).toBe('OK');
    });

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores/coord-1/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estaActivo: false });
    req.flush({ exitoso: true, datos: { idCoordinador: 'coord-1', sincronizacionIdentidad: 'OK', mensajeUsuario: null } });
  });

  it('setCoordinadorEstado reactiva enviando estaActivo=true', () => {
    service.setCoordinadorEstado('coord-1', true).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores/coord-1/estado`);
    expect(req.request.body).toEqual({ estaActivo: true });
    req.flush({ exitoso: true, datos: { idCoordinador: 'coord-1', sincronizacionIdentidad: 'OK', mensajeUsuario: null } });
  });

  it('ya no existe la llamada a la ruta /toggle del coordinador', () => {
    expect('toggleCoordinadorStatus' in service).toBeFalse();
  });

  it('updateCoordinador envía PUT con los datos editables y sin documento', () => {
    service
      .updateCoordinador('coord-1', {
        primerNombre: 'Ana',
        segundoNombre: 'Maria',
        primerApellido: 'Perez',
        segundoApellido: 'Gomez',
        correo: 'ana@uco.edu.co',
      })
      .subscribe((res) => {
        expect(res.exitoso).toBeTrue();
        expect(res.datos?.sincronizacionIdentidad).toBe('PENDIENTE');
        expect(res.datos?.mensajeUsuario).toBe('Se sincronizará pronto.');
      });

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores/coord-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      primerNombre: 'Ana',
      segundoNombre: 'Maria',
      primerApellido: 'Perez',
      segundoApellido: 'Gomez',
      correo: 'ana@uco.edu.co',
    });
    expect(Object.keys(req.request.body)).not.toContain('numeroIdentificacion');
    req.flush({
      exitoso: true,
      datos: { idCoordinador: 'coord-1', sincronizacionIdentidad: 'PENDIENTE', mensajeUsuario: 'Se sincronizará pronto.' },
    });
  });

  it('getCoordinadores conserva los datos editables que entrega el backend', () => {
    service.getCoordinadores().subscribe((res) => {
      const item = res.datos?.[0];
      expect(item?.primerNombre).toBe('Ana');
      expect(item?.segundoNombre).toBe('Maria');
      expect(item?.primerApellido).toBe('Perez');
      expect(item?.segundoApellido).toBe('Gomez');
      expect(item?.correo).toBe('ana@uco.edu.co');
      expect(item?.estado).toBe('INACTIVO');
    });

    http.expectOne((r) => r.url === `${environment.apiUrl}/decano/coordinadores`).flush({
      exitoso: true,
      elementos: [
        {
          id: 'coord-1',
          idUsuario: 'usr-1',
          numeroIdentificacion: '1017555444',
          nombreCompleto: 'Ana Maria Perez Gomez',
          primerNombre: 'Ana',
          segundoNombre: 'Maria',
          primerApellido: 'Perez',
          segundoApellido: 'Gomez',
          correo: 'ana@uco.edu.co',
          idPrograma: null,
          nombrePrograma: null,
          estaActivoCoordinador: false,
          estaActivoRolCoordinador: false,
        },
      ],
    });
  });
});

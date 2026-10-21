import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanManagementService } from './dean-management.service';
import { environment } from '../../../environments/environment';
import { CoordinadorItem } from '../models/role-management.model';

describe('DeanManagementService', () => {
  let service: DeanManagementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DeanManagementService, provideHttpClient(), provideHttpClientTesting()],
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

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: mockCoordinadores });
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
    });

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: backendDtos });
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

  it('toggleCoordinadorStatus envía PATCH para alternar el estado del coordinador', () => {
    service.toggleCoordinadorStatus('coord-1').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.estado).toBe('INACTIVO');
    });

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores/coord-1/toggle`);
    expect(req.request.method).toBe('PATCH');
    req.flush({
      exitoso: true,
      datos: {
        id: 'coord-1',
        numeroIdentificacion: '10170001',
        nombres: 'Carlos',
        apellidos: 'Ramírez',
        correo: 'cramirez@uco.edu.co',
        facultad: 'Facultad de Ingeniería',
        programaAcademico: 'Ingeniería de Sistemas',
        estado: 'INACTIVO',
        totalDocentes: 12,
        totalGrupos: 18,
      },
    });
  });
});

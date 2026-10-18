import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminManagementService } from './admin-management.service';
import { environment } from '../../../environments/environment';
import { FacultadItem } from '../models/role-management.model';

describe('AdminManagementService', () => {
  let service: AdminManagementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminManagementService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('cargarFacultades obtiene el listado y actualiza la señal _facultades', () => {
    service.cargarFacultades().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.length).toBe(1);
    });

    const req = http.expectOne(`${environment.apiUrl}/admin/facultades`);
    expect(req.request.method).toBe('GET');
    req.flush({
      exitoso: true,
      datos: [
        {
          id: 'fac-1',
          codigo: 'ING',
          nombreFacultad: 'Facultad de Ingeniería',
          idDecano: 'dec-1',
          nombreCompletoDecano: 'Dr. Roberto Gómez',
          estaActivaFacultad: true,
        },
      ],
    });

    expect(service.facultades().length).toBe(1);
    expect(service.facultades()[0].nombre).toBe('Facultad de Ingeniería');
    expect(service.facultades()[0].decanoNombre).toBe('Dr. Roberto Gómez');
  });

  it('crearFacultad envía POST al endpoint de administración y actualiza reactivamente la señal', () => {
    const payload = {
      nombre: 'Facultad de Ciencias de la Salud',
      idDecano: 'dec-1',
      idInstitucion: 'inst-uco-1',
    };

    service.crearFacultad(payload).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const req = http.expectOne(`${environment.apiUrl}/admin/facultades`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.nombre).toBe('Facultad de Ciencias de la Salud');
    expect(req.request.body.idDecano).toBe('dec-1');

    req.flush({
      exitoso: true,
      datos: {
        id: 'fac-salud-id',
        nombreFacultad: 'Facultad de Ciencias de la Salud',
        idDecano: 'dec-1',
        nombreCompletoDecano: 'Dr. Roberto Gómez',
        estaActivaFacultad: true,
      },
    });

    const creadas = service.facultades();
    const encontrada = creadas.find((f) => f.nombre === 'Facultad de Ciencias de la Salud');
    expect(encontrada).toBeTruthy();
    expect(encontrada?.decanoNombre).toBe('Dr. Roberto Gómez');
  });

  it('asignarDecanoFacultad actualiza optimista y reactivamente el decano de la facultad', () => {
    // Inicializar estado previo
    const facultadInicial: FacultadItem = {
      id: 'fac-100',
      codigo: 'FAC-TEST',
      nombre: 'Facultad de Prueba',
      decanoId: undefined,
      decanoNombre: 'Sin asignar',
      estado: 'ACTIVO',
    };

    // Forzar actualización inicial
    service.cargarFacultades().subscribe();
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
      exitoso: true,
      datos: [
        {
          id: facultadInicial.id,
          codigo: facultadInicial.codigo,
          nombreFacultad: facultadInicial.nombre,
          idDecano: null,
          nombreCompletoDecano: null,
          estaActivaFacultad: true,
        },
      ],
    });

    service.asignarDecanoFacultad('fac-100', 'dec-999', 'Dra. María Pérez').subscribe();

    const target = service.facultades().find((f) => f.id === 'fac-100');
    expect(target?.decanoId).toBe('dec-999');
    expect(target?.decanoNombre).toBe('Dra. María Pérez');

    const putReq = http.expectOne(`${environment.apiUrl}/admin/facultades/fac-100`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.idDecano).toBe('dec-999');
    putReq.flush({ exitoso: true, datos: null });
  });

  it('desvincularDecanoFacultad deja la facultad en estado vacante sin decano', () => {
    service.cargarFacultades().subscribe();
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
      exitoso: true,
      datos: [
        {
          id: 'fac-200',
          codigo: 'FAC-2',
          nombreFacultad: 'Facultad con Decano',
          idDecano: 'dec-1',
          nombreCompletoDecano: 'Dr. Decano Titular',
          estaActivaFacultad: true,
        },
      ],
    });

    expect(service.facultades()[0].decanoId).toBe('dec-1');

    service.desvincularDecanoFacultad('fac-200').subscribe();

    const target = service.facultades().find((f) => f.id === 'fac-200');
    expect(target?.decanoId).toBeUndefined();
    expect(target?.decanoNombre).toBe('Sin asignar');

    const putReq = http.expectOne(`${environment.apiUrl}/admin/facultades/fac-200`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.idDecano).toBeNull();
    putReq.flush({ exitoso: true, datos: null });
  });

  it('getDecanos deduplica decanos por id y normaliza nombreCompleto', () => {
    service.getDecanos().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.length).toBe(1);
      expect(res.datos?.[0].nombreCompleto).toBe('Juan Carlos Gomez Perez');
      expect(res.datos?.[0].nombres).toBe('Juan Carlos');
      expect(res.datos?.[0].apellidos).toBe('Gomez Perez');
      expect(res.datos?.[0].numeroIdentificacion).toBe('1017000001');
    });

    const req = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    expect(req.request.method).toBe('GET');
    // Simular que el backend/vista devuelve el mismo decano 3 veces por estar vinculado a 3 facultades
    req.flush({
      exitoso: true,
      datos: [
        {
          id: 'dec-1',
          idUsuario: 'usr-1',
          numeroIdentificacion: '1017000001',
          nombreCompleto: 'Juan Carlos Gomez Perez',
          idFacultad: 'fac-1',
          nombreFacultad: 'Facultad de Ingeniería',
          estaActivoDecano: true,
        },
        {
          id: 'dec-1',
          idUsuario: 'usr-1',
          numeroIdentificacion: '1017000001',
          nombreCompleto: 'Juan Carlos Gomez Perez',
          idFacultad: 'fac-2',
          nombreFacultad: 'Facultad de Salud',
          estaActivoDecano: true,
        },
        {
          id: 'dec-1',
          idUsuario: 'usr-1',
          numeroIdentificacion: '1017000001',
          nombreCompleto: 'Juan Carlos Gomez Perez',
          idFacultad: 'fac-3',
          nombreFacultad: 'Facultad de Educación',
          estaActivoDecano: true,
        },
      ],
    });

    expect(service.decanos().length).toBe(1);
    expect(service.decanos()[0].nombreCompleto).toBe('Juan Carlos Gomez Perez');
  });
});

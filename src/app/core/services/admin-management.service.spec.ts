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

  it('cargarAreas, crearArea, actualizarArea y cambiarEstadoArea interactúan correctamente con el backend', () => {
    service.cargarAreas().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.length).toBe(1);
    });

    const getReq = http.expectOne(`${environment.apiUrl}/admin/areas`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      exitoso: true,
      datos: [{ id: 'area-1', codigo: 'IS', nombre: 'Ingeniería de Software', facultadId: 'fac-1', estado: 'ACTIVO' }],
    });

    expect(service.areas().length).toBe(1);

    // crearArea
    service.crearArea({ codigo: 'IA', nombre: 'Inteligencia Artificial', facultadId: 'fac-1', estado: 'ACTIVO' });
    const postReq = http.expectOne(`${environment.apiUrl}/admin/areas`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({
      exitoso: true,
      datos: { id: 'area-2', codigo: 'IA', nombre: 'Inteligencia Artificial', facultadId: 'fac-1', estado: 'ACTIVO' },
    });
    expect(service.areas().length).toBe(2);

    // actualizarArea
    service.actualizarArea('area-1', { nombre: 'Ingeniería de Software Avanzada' });
    const putReq = http.expectOne(`${environment.apiUrl}/admin/areas/area-1`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({
      exitoso: true,
      datos: { id: 'area-1', codigo: 'IS', nombre: 'Ingeniería de Software Avanzada', facultadId: 'fac-1', estado: 'ACTIVO' },
    });
    expect(service.areas().find((a) => a.id === 'area-1')?.nombre).toBe('Ingeniería de Software Avanzada');

    // cambiarEstadoArea
    service.cambiarEstadoArea('area-1');
    const patchReq = http.expectOne(`${environment.apiUrl}/admin/areas/area-1/estado`);
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({
      exitoso: true,
      datos: { id: 'area-1', nombre: 'Ingeniería de Software Avanzada', descripcion: 'Área técnica', estado: 'INACTIVO' },
    });
    expect(service.areas().find((a) => a.id === 'area-1')?.estado).toBe('INACTIVO');
  });

  it('cargarParametros y actualizarParametro gestionan parámetros institucionales', () => {
    service.cargarParametros().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.length).toBe(1);
    });

    const getReq = http.expectOne(`${environment.apiUrl}/admin/parametros`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      exitoso: true,
      datos: [
        {
          id: 'param-1',
          clave: 'limite.inasistencia',
          nombre: 'Límite Inasistencia',
          valor: '20',
          descripcion: 'Porcentaje',
          categoria: 'ASISTENCIA',
          tipo: 'PORCENTAJE',
          ultimaModificacion: '2026-01-01',
        },
      ],
    });

    expect(service.parametros().length).toBe(1);

    service.actualizarParametro('param-1', '25');
    const patchReq = http.expectOne(`${environment.apiUrl}/admin/parametros/param-1`);
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ valor: '25' });
    patchReq.flush({
      exitoso: true,
      datos: {
        id: 'param-1',
        clave: 'limite.inasistencia',
        nombre: 'Límite Inasistencia',
        valor: '25',
        descripcion: 'Porcentaje',
        categoria: 'ASISTENCIA',
        tipo: 'PORCENTAJE',
        ultimaModificacion: '2026-02-01',
      },
    });

    expect(service.parametros()[0].valor).toBe('25');
  });

  it('createDecano envía petición al endpoint de administración sin facultad asignada', () => {
    const payload = {
      tipoIdentificacionId: 'tipo-1',
      numeroIdentificacion: '1017000001',
      primerNombre: 'Carlos',
      segundoNombre: '',
      primerApellido: 'Zapata',
      segundoApellido: '',
      correo: 'carlos.zapata@uco.edu.co',
      idFacultad: null,
    };

    service.createDecano(payload as any).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const req = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.primerNombre).toBe('Carlos');
    expect(req.request.body.idFacultad).toBeNull();

    req.flush({
      exitoso: true,
      mensaje: 'Decano creado correctamente.',
    });
  });

  it('getDecanos asigna etiqueta por defecto cuando el decano no tiene facultad asignada', () => {
    service.getDecanos().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.length).toBe(1);
      expect(res.datos?.[0].idFacultad).toBeUndefined();
      expect(res.datos?.[0].nombreFacultad).toBe('Sin Facultad Asignada');
    });

    const req = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    expect(req.request.method).toBe('GET');
    req.flush({
      exitoso: true,
      datos: [
        {
          id: 'dec-sin-fac',
          idUsuario: 'usr-2',
          numeroIdentificacion: '10203040',
          nombreCompleto: 'Marta Lucia Restrepo',
          idFacultad: null,
          nombreFacultad: null,
          estaActivoDecano: true,
        },
      ],
    });

    expect(service.decanos().length).toBe(1);
    expect(service.decanos()[0].facultad).toBe('Sin Facultad Asignada');
  });

  it('cargarAuditoria y ejecutarCierreMasivo funcionan correctamente', () => {
    service.cargarAuditoria().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.length).toBe(1);
    });

    const getReq = http.expectOne(`${environment.apiUrl}/admin/auditoria`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      exitoso: true,
      datos: [
        {
          id: 'aud-1',
          timestamp: '2026-01-01T00:00:00Z',
          usuarioId: 'usr-1',
          usuarioNombre: 'Admin',
          rol: 'ADMINISTRADOR',
          accion: 'LOGIN',
          modulo: 'AUTH',
          descripcion: 'Inicio de sesión',
          direccionIp: '127.0.0.1',
          nivel: 'INFO',
        },
      ],
    });

    expect(service.auditoria().length).toBe(1);

    service.ejecutarCierreMasivo('per-1', '2026-1').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const postReq = http.expectOne(`${environment.apiUrl}/admin/cierre-masivo`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({ idPeriodoAcademico: 'per-1', periodoCodigo: '2026-1' });
    postReq.flush({ exitoso: true, datos: null });
  });

  it('getInstituciones, crearInstitucion, actualizarInstitucion y toggleEstadoInstitucion interactúan con API', () => {
    service.getInstituciones().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const getReq = http.expectOne(`${environment.apiUrl}/admin/instituciones`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      exitoso: true,
      datos: [{ id: 'inst-1', nombre: 'UCO', nit: '890.980.040', direccion: 'Rionegro', telefono: '5698000', estado: 'ACTIVO' }],
    });

    service.crearInstitucion({ nombre: 'UCO Nueva' }).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });
    const postReq = http.expectOne(`${environment.apiUrl}/admin/instituciones`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ exitoso: true, datos: { id: 'inst-2', nombre: 'UCO Nueva' } });

    service.actualizarInstitucion('inst-1', { direccion: 'Sector Llanogrande' }).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });
    const putReq = http.expectOne(`${environment.apiUrl}/admin/instituciones/inst-1`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ exitoso: true, datos: { id: 'inst-1', nombre: 'UCO', direccion: 'Sector Llanogrande' } });

    service.toggleEstadoInstitucion('inst-1').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });
    const patchReq = http.expectOne(`${environment.apiUrl}/admin/instituciones/inst-1/toggle-estado`);
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({ exitoso: true, datos: { id: 'inst-1' } });
  });

  it('actualizarFacultad, cambiarEstadoFacultad, asignarDecanoFacultad y desvincularDecanoFacultad funcionan', () => {
    service.actualizarFacultad('fac-1', { nombre: 'Ingeniería Actualizada' });
    const putReq = http.expectOne(`${environment.apiUrl}/admin/facultades/fac-1`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ exitoso: true, datos: { id: 'fac-1', nombre: 'Ingeniería Actualizada' } });

    service.cambiarEstadoFacultad('fac-1');
    const patchReq = http.expectOne(`${environment.apiUrl}/admin/facultades/fac-1/estado`);
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({ exitoso: true, datos: { id: 'fac-1', estaActivaFacultad: false } });

    service.asignarDecanoFacultad('fac-1', 'dec-1', 'Dr. Roberto').subscribe((res) => {
      expect(res).toBeTrue();
    });
    const reqAsignar = http.expectOne(`${environment.apiUrl}/admin/facultades/fac-1`);
    expect(reqAsignar.request.method).toBe('PUT');
    reqAsignar.flush({ exitoso: true, datos: null });

    service.desvincularDecanoFacultad('fac-1').subscribe((res) => {
      expect(res).toBeTrue();
    });
    const reqDesvincular = http.expectOne(`${environment.apiUrl}/admin/facultades/fac-1`);
    expect(reqDesvincular.request.method).toBe('PUT');
    reqDesvincular.flush({ exitoso: true, datos: null });
  });

  it('crearArea, actualizarArea, cambiarEstadoArea y actualizarParametro funcionan', () => {
    service.crearArea({ codigo: 'A1', nombre: 'Ciencias Básicas', facultadId: 'fac-1', estado: 'ACTIVO' });
    const postArea = http.expectOne(`${environment.apiUrl}/admin/areas`);
    expect(postArea.request.method).toBe('POST');
    postArea.flush({ exitoso: true, datos: { id: 'area-1', codigo: 'A1', nombre: 'Ciencias Básicas' } });

    service.actualizarArea('area-1', { nombre: 'Ciencias Básicas y Aplicadas' });
    const putArea = http.expectOne(`${environment.apiUrl}/admin/areas/area-1`);
    expect(putArea.request.method).toBe('PUT');
    putArea.flush({ exitoso: true, datos: { id: 'area-1', nombre: 'Ciencias Básicas y Aplicadas' } });

    service.cambiarEstadoArea('area-1');
    const patchArea = http.expectOne(`${environment.apiUrl}/admin/areas/area-1/estado`);
    expect(patchArea.request.method).toBe('PATCH');
    patchArea.flush({ exitoso: true, datos: { id: 'area-1', estado: 'INACTIVO' } });

    service.actualizarParametro('param-1', '25');
    const patchParam = http.expectOne(`${environment.apiUrl}/admin/parametros/param-1`);
    expect(patchParam.request.method).toBe('PATCH');
    expect(patchParam.request.body).toEqual({ valor: '25' });
    patchParam.flush({ exitoso: true, datos: { id: 'param-1', valor: '25' } });
  });

  it('crearSede, actualizarSede y cambiarEstadoSede actualizan reactivamente la señal _sedes', () => {
    service.crearSede({ codigo: 'SED-01', nombre: 'Sede Rionegro', direccion: 'Calle 10', municipio: 'Rionegro', telefono: '5698000', estado: 'ACTIVO' });
    const postReq = http.expectOne(`${environment.apiUrl}/admin/sedes`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ exitoso: true, datos: { id: 'sede-1', codigo: 'SED-01', nombre: 'Sede Rionegro', direccion: 'Calle 10', municipio: 'Rionegro', telefono: '5698000', estado: 'ACTIVO' } });
    expect(service.sedes().length).toBe(1);

    service.actualizarSede('sede-1', { nombre: 'Sede Rionegro Principal' });
    const putReq = http.expectOne(`${environment.apiUrl}/admin/sedes/sede-1`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ exitoso: true, datos: { id: 'sede-1', codigo: 'SED-01', nombre: 'Sede Rionegro Principal', direccion: 'Calle 10', municipio: 'Rionegro', telefono: '5698000', estado: 'ACTIVO' } });
    expect(service.sedes()[0].nombre).toBe('Sede Rionegro Principal');

    service.cambiarEstadoSede('sede-1');
    const patchReq = http.expectOne(`${environment.apiUrl}/admin/sedes/sede-1/estado`);
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({ exitoso: true, datos: { id: 'sede-1', codigo: 'SED-01', nombre: 'Sede Rionegro Principal', direccion: 'Calle 10', municipio: 'Rionegro', telefono: '5698000', estado: 'INACTIVO' } });
    expect(service.sedes()[0].estado).toBe('INACTIVO');
  });

  it('crearEspacio, actualizarEspacio y cambiarEstadoEspacio gestionan espacios físicos', () => {
    service.crearEspacio({ codigo: 'A101', bloque: 'B1', piso: '1', tipo: 'AULA_REGULAR', capacidad: 30, tieneProyector: true, tieneAireAcondicionado: false, sedeId: 'sede-1', estado: 'DISPONIBLE' });
    const postReq = http.expectOne(`${environment.apiUrl}/admin/espacios-fisicos`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ exitoso: true, datos: { id: 'esp-1', codigo: 'A101', bloque: 'B1', piso: '1', tipo: 'AULA_REGULAR', capacidad: 30, tieneProyector: true, tieneAireAcondicionado: false, sedeId: 'sede-1', estado: 'DISPONIBLE' } });
    expect(service.espacios().length).toBe(1);

    service.actualizarEspacio('esp-1', { capacidad: 35 });
    const putReq = http.expectOne(`${environment.apiUrl}/admin/espacios-fisicos/esp-1`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ exitoso: true, datos: { id: 'esp-1', codigo: 'A101', bloque: 'B1', piso: '1', tipo: 'AULA_REGULAR', capacidad: 35, tieneProyector: true, tieneAireAcondicionado: false, sedeId: 'sede-1', estado: 'DISPONIBLE' } });
    expect(service.espacios()[0].capacidad).toBe(35);

    service.cambiarEstadoEspacio('esp-1');
    const patchReq = http.expectOne(`${environment.apiUrl}/admin/espacios-fisicos/esp-1/estado`);
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({ exitoso: true, datos: { id: 'esp-1', codigo: 'A101', bloque: 'B1', piso: '1', tipo: 'AULA_REGULAR', capacidad: 35, tieneProyector: true, tieneAireAcondicionado: false, sedeId: 'sede-1', estado: 'INACTIVO' } });
    expect(service.espacios()[0].estado).toBe('INACTIVO');
  });

  it('toggleDecanoStatus invoca PATCH al endpoint correspondiente', () => {
    service.toggleDecanoStatus('dec-1').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const patchReq = http.expectOne(`${environment.apiUrl}/admin/decanos/dec-1/toggle`);
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({ exitoso: true, datos: { id: 'dec-1', estado: 'INACTIVO' } });
  });

  it('getDecanos divide correctamente nombres y apellidos de dos partes', () => {
    service.getDecanos().subscribe((res) => {
      expect(res.datos?.[0].nombres).toBe('Ana');
      expect(res.datos?.[0].apellidos).toBe('Mora');
    });

    const req = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    req.flush({
      exitoso: true,
      datos: [{ id: 'dec-2p', nombreCompleto: 'Ana Mora', estaActivoDecano: true }],
    });
  });
});

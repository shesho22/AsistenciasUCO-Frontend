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

  describe('actualizarFacultad (HU110 + HU117)', () => {
    const cargarFacultadBase = () => {
      service.cargarFacultades().subscribe();
      http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
        exitoso: true,
        datos: [
          {
            id: 'fac-100',
            nombreFacultad: 'Facultad de Prueba',
            idDecano: 'dec-1',
            nombreCompletoDecano: 'Dr. Decano Titular',
            estaActivaFacultad: true,
          },
        ],
      });
    };

    it('envia PUT solo con los campos indicados y actualiza la señal con la respuesta del backend', () => {
      cargarFacultadBase();
      let resultado: any;

      service.actualizarFacultad('fac-100', { nombre: 'Facultad Renombrada', idDecano: 'dec-2' })
        .subscribe((res) => (resultado = res));

      const req = http.expectOne(`${environment.apiUrl}/admin/facultades/fac-100`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ nombre: 'Facultad Renombrada', idDecano: 'dec-2' });
      // La señal no cambia hasta recibir la respuesta (sin actualización optimista).
      expect(service.facultades()[0].nombre).toBe('Facultad de Prueba');

      req.flush({
        exitoso: true,
        datos: {
          id: 'fac-100',
          nombreFacultad: 'Facultad Renombrada',
          idDecano: 'dec-2',
          nombreCompletoDecano: 'Dra. María Pérez',
          estaActivaFacultad: true,
        },
      });

      expect(resultado.exitoso).toBeTrue();
      const target = service.facultades().find((f) => f.id === 'fac-100');
      expect(target?.nombre).toBe('Facultad Renombrada');
      expect(target?.decanoId).toBe('dec-2');
      expect(target?.decanoNombre).toBe('Dra. María Pérez');
      expect(target?.estado).toBe('ACTIVO');
    });

    it('no envia los campos no indicados', () => {
      cargarFacultadBase();

      service.actualizarFacultad('fac-100', { idDecano: 'dec-2' }).subscribe();

      const req = http.expectOne(`${environment.apiUrl}/admin/facultades/fac-100`);
      expect(req.request.body).toEqual({ idDecano: 'dec-2' });
      expect('nombre' in req.request.body).toBeFalse();
      req.flush({ exitoso: true, datos: { id: 'fac-100', nombreFacultad: 'Facultad de Prueba', idDecano: 'dec-2', estaActivaFacultad: true } });
    });

    it('un error HTTP no modifica la señal y se propaga al llamador', () => {
      cargarFacultadBase();
      let error: any;

      service.actualizarFacultad('fac-100', { nombre: 'Duplicada' }).subscribe({ error: (e) => (error = e) });

      http.expectOne(`${environment.apiUrl}/admin/facultades/fac-100`)
        .flush({ exitoso: false, message: 'Ya existe una facultad con ese nombre.' }, { status: 409, statusText: 'Conflict' });

      expect(error.status).toBe(409);
      expect(service.facultades()[0].nombre).toBe('Facultad de Prueba');
      expect(service.facultades()[0].decanoId).toBe('dec-1');
    });

    it('una respuesta exitoso=false sin datos no modifica la señal', () => {
      cargarFacultadBase();

      service.actualizarFacultad('fac-100', { nombre: 'Otra' }).subscribe();

      http.expectOne(`${environment.apiUrl}/admin/facultades/fac-100`).flush({ exitoso: false, datos: null });
      expect(service.facultades()[0].nombre).toBe('Facultad de Prueba');
    });
  });

  describe('cambiarEstadoFacultad (HU111)', () => {
    const cargarFacultadBase = () => {
      service.cargarFacultades().subscribe();
      http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
        exitoso: true,
        datos: [
          {
            id: 'fac-200',
            nombreFacultad: 'Facultad con Decano',
            idDecano: 'dec-1',
            nombreCompletoDecano: 'Dr. Decano Titular',
            estaActivaFacultad: true,
          },
        ],
      });
    };

    it('envia PATCH con el estado deseado y refleja la respuesta del backend', () => {
      cargarFacultadBase();
      let resultado: any;

      service.cambiarEstadoFacultad('fac-200', false).subscribe((res) => (resultado = res));

      const req = http.expectOne(`${environment.apiUrl}/admin/facultades/fac-200/estado`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ activa: false });
      expect(service.facultades()[0].estado).toBe('ACTIVO');

      req.flush({
        exitoso: true,
        datos: {
          id: 'fac-200',
          nombreFacultad: 'Facultad con Decano',
          idDecano: 'dec-1',
          nombreCompletoDecano: 'Dr. Decano Titular',
          estaActivaFacultad: false,
        },
      });

      expect(resultado.exitoso).toBeTrue();
      expect(service.facultades()[0].estado).toBe('INACTIVO');
    });

    it('un error HTTP deja el estado intacto y se propaga', () => {
      cargarFacultadBase();
      let error: any;

      service.cambiarEstadoFacultad('fac-200', true).subscribe({ error: (e) => (error = e) });

      http.expectOne(`${environment.apiUrl}/admin/facultades/fac-200/estado`)
        .flush({ exitoso: false, message: 'El decano ya titulariza otra facultad activa.' }, { status: 409, statusText: 'Conflict' });

      expect(error.status).toBe(409);
      expect(service.facultades()[0].estado).toBe('ACTIVO');
    });
  });

  describe('normalizacion de la respuesta de facultad', () => {
    it('una respuesta minima conserva nombre y decano actuales y asume estado ACTIVO', () => {
      service.cargarFacultades().subscribe();
      http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
        exitoso: true,
        datos: [
          { id: 'fac-1', codigo: 'FAC', nombreFacultad: 'Facultad Base', idDecano: 'dec-1', nombreCompletoDecano: 'Dr. Base', estaActivaFacultad: false },
        ],
      });

      service.cambiarEstadoFacultad('fac-1', true).subscribe();
      http.expectOne(`${environment.apiUrl}/admin/facultades/fac-1/estado`).flush({ exitoso: true, datos: { id: 'fac-1' } });

      const f = service.facultades()[0];
      expect(f.nombre).toBe('Facultad Base');
      expect(f.decanoId).toBe('dec-1');
      expect(f.decanoNombre).toBe('Dr. Base');
      expect(f.estado).toBe('ACTIVO');
    });

    it('usa el campo nombre cuando no viene nombreFacultad', () => {
      service.cargarFacultades().subscribe();
      http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
        exitoso: true,
        datos: [{ id: 'fac-2', nombreFacultad: 'Original', idDecano: null, estaActivaFacultad: true }],
      });

      service.actualizarFacultad('fac-2', { nombre: 'Alterno' }).subscribe();
      http.expectOne(`${environment.apiUrl}/admin/facultades/fac-2`).flush({
        exitoso: true,
        datos: { id: 'fac-2', nombre: 'Alterno', estaActivaFacultad: true },
      });

      expect(service.facultades()[0].nombre).toBe('Alterno');
    });

    it('solo reemplaza la facultad modificada y deja intactas las demas', () => {
      service.cargarFacultades().subscribe();
      http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
        exitoso: true,
        datos: [
          { id: 'fac-a', nombreFacultad: 'Facultad A', idDecano: 'dec-a', estaActivaFacultad: true },
          { id: 'fac-b', nombreFacultad: 'Facultad B', idDecano: 'dec-b', estaActivaFacultad: true },
        ],
      });

      service.actualizarFacultad('fac-a', { nombre: 'Facultad A2' }).subscribe();
      http.expectOne(`${environment.apiUrl}/admin/facultades/fac-a`).flush({
        exitoso: true,
        datos: { id: 'fac-a', nombreFacultad: 'Facultad A2', idDecano: 'dec-a', estaActivaFacultad: true },
      });

      expect(service.facultades().map((f) => f.nombre)).toEqual(['Facultad A2', 'Facultad B']);
    });

    it('si la facultad no estaba cargada usa valores por defecto y no altera la lista', () => {
      let resultado: any;
      service.actualizarFacultad('fac-9', { nombre: 'Nueva' }).subscribe((r) => (resultado = r));

      http.expectOne(`${environment.apiUrl}/admin/facultades/fac-9`).flush({ exitoso: true, datos: {} });

      expect(resultado.datos.id).toBe('fac-9');
      expect(resultado.datos.nombre).toBe('');
      expect(resultado.datos.decanoNombre).toBe('Sin asignar');
      expect(resultado.datos.estado).toBe('ACTIVO');
      expect(service.facultades().length).toBe(0);
    });
  });

  it('el servicio ya no expone la desvinculacion de decano ni la asignacion optimista', () => {
    expect((service as any).desvincularDecanoFacultad).toBeUndefined();
    expect((service as any).asignarDecanoFacultad).toBeUndefined();
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

  it('cargarAreas obtiene el catalogo y actualiza la señal (las escrituras se prueban en admin-management.areas.spec.ts)', () => {
    service.cargarAreas().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.length).toBe(1);
    });

    const getReq = http.expectOne(`${environment.apiUrl}/admin/areas`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      exitoso: true,
      datos: [{ id: 'area-1', codigo: 'IS', nombre: 'Ingeniería de Software', activa: true }],
    });

    expect(service.areas().length).toBe(1);
  });

  it('cargarParametros conserva los datos del DTO de parámetros recibido por GET', () => {
    service.cargarParametros().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.elementos?.length).toBe(1);
    });

    const getReq = http.expectOne(`${environment.apiUrl}/admin/parametros`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      exitoso: true,
      datos: [
        {
          id: 'param-1',
          grupo: 'ASISTENCIA',
          clave: 'limite.inasistencia',
          valor: '20',
          tipoDato: 'NUMERO',
          valorDefecto: '0',
          estaActivo: true,
        },
      ],
    });

    expect(service.parametros().length).toBe(1);
    expect(service.parametros()[0]).toEqual(jasmine.objectContaining({
      grupo: 'ASISTENCIA',
      clave: 'limite.inasistencia',
      valor: '20',
      tipoDato: 'NUMERO',
      estaActivo: true,
    }));
    http.expectNone((request) => request.method === 'PATCH' || request.method === 'PUT');
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

  it('ejecutarCierreMasivo funciona correctamente', () => {
    service.ejecutarCierreMasivo('per-1', '2026-1').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const postReq = http.expectOne(`${environment.apiUrl}/admin/cierre-masivo`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({ idPeriodoAcademico: 'per-1', periodoCodigo: '2026-1' });
    postReq.flush({ exitoso: true, datos: null });
  });

  it('getInstituciones consulta la API (las instituciones son de solo consulta, HU161/HU162/HU164 descartadas)', () => {
    service.getInstituciones().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const getReq = http.expectOne(`${environment.apiUrl}/admin/instituciones`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      exitoso: true,
      datos: [{ id: 'inst-1', nombre: 'UCO', nit: '890.980.040', direccion: 'Rionegro', telefono: '5698000', estado: 'ACTIVO' }],
    });

    expect(service.instituciones().length).toBe(1);
    const servicio = service as unknown as Record<string, unknown>;
    expect(servicio['crearInstitucion']).toBeUndefined();
    expect(servicio['actualizarInstitucion']).toBeUndefined();
    expect(servicio['toggleEstadoInstitucion']).toBeUndefined();
  });

  describe('HU168: parámetros editables (D.3)', () => {
    it('cargarParametros envía filtros y paginación a GET /admin/parametros y actualiza la señal', () => {
      service.cargarParametros({ grupo: 'ASISTENCIA', texto: 'inasistencia', soloEditables: true, pagina: 1, tamano: 20 }).subscribe((res: any) => {
        expect(res.elementos.length).toBe(1);
        expect(res.totalElementos).toBe(1);
      });

      const req = http.expectOne((r) => r.url === `${environment.apiUrl}/admin/parametros`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('grupo')).toBe('ASISTENCIA');
      expect(req.request.params.get('texto')).toBe('inasistencia');
      expect(req.request.params.get('soloEditables')).toBe('true');
      expect(req.request.params.get('pagina')).toBe('1');
      expect(req.request.params.get('tamano')).toBe('20');

      req.flush({
        exitoso: true,
        elementos: [
          {
            id: 'param-1',
            grupo: 'ASISTENCIA',
            clave: 'asistencias.limite.inasistencia',
            valor: '20',
            tipoDato: 'INT',
            esEditable: true,
            valorMinimo: 1,
            valorMaximo: 100,
            etiqueta: 'Límite de inasistencias',
            descripcion: 'Porcentaje máximo de fallas',
            unidad: '%',
            categoriaVisual: 'Reglas de Asistencia',
            orden: 1,
            fechaModificacion: '2026-11-07T15:04:05.007Z',
            fechaUltimoCambioUtc: '2026-11-07T15:04:05.007Z',
            nombreUltimoActor: 'Admin TI',
          },
        ],
        numeroPagina: 1,
        tamanoPagina: 20,
        totalElementos: 1,
        totalPaginas: 1,
      });

      expect(service.parametros().length).toBe(1);
      expect(service.parametros()[0].clave).toBe('asistencias.limite.inasistencia');
      expect(service.parametros()[0].esEditable).toBeTrue();
    });

    it('actualizarParametro envía PUT /admin/parametros/{id} con valor, motivo y fechaModificacionEsperada intacta', () => {
      const payload = {
        valor: '25',
        fechaModificacionEsperada: '2026-11-07T15:04:05.007Z',
        motivo: 'Ajuste reglamentario aprobado por consejo',
      };

      service.actualizarParametro('param-1', payload).subscribe((res: any) => {
        expect(res.exitoso).toBeTrue();
        expect(res.datos.valorNuevo).toBe('25');
      });

      const req = http.expectOne(`${environment.apiUrl}/admin/parametros/param-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      expect(req.request.body.fechaModificacionEsperada).toBe('2026-11-07T15:04:05.007Z');

      req.flush({
        exitoso: true,
        datos: {
          id: 'param-1',
          grupo: 'ASISTENCIA',
          clave: 'asistencias.limite.inasistencia',
          valorAnterior: '20',
          valorNuevo: '25',
          fechaModificacion: '2026-11-07T16:00:00.000Z',
          sinCambios: false,
        },
      });
    });
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

  it('HU156: getProgramasInstitucion envía GET /admin/programas con parámetros de búsqueda', () => {
    service.getProgramasInstitucion({ texto: 'Sistemas', pagina: 1, tamano: 20 }).subscribe((res) => {
      expect(res.elementos.length).toBe(1);
      expect(res.elementos[0].codigo).toBe('SIS');
    });

    const req = http.expectOne(
      (r) => r.url === `${environment.apiUrl}/admin/programas` &&
        r.params.get('texto') === 'Sistemas' &&
        r.params.get('pagina') === '1' &&
        r.params.get('tamano') === '20'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      exitoso: true,
      elementos: [{ id: 'p-1', codigo: 'SIS', nombre: 'Sistemas', idFacultad: 'f-1', nombreFacultad: 'Ingeniería' }],
      numeroPagina: 1,
      tamanoPagina: 20,
      totalElementos: 1,
      totalPaginas: 1,
    });
  });

  it('HU156: admitirEstudiante envía POST /admin/estudiantes/admision con el payload', () => {
    const payload = {
      tipoIdentificacionId: 't-cc',
      numeroIdentificacion: '1017000111',
      primerNombre: 'Carlos',
      primerApellido: 'Pérez',
      correo: 'carlos@uco.edu.co',
      idPrograma: 'p-1',
    };

    service.admitirEstudiante(payload).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos.idEstudiante).toBe('est-1');
      expect(res.datos.estadoCuenta).toBe('ACTIVA');
    });

    const req = http.expectOne(`${environment.apiUrl}/admin/estudiantes/admision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      exitoso: true,
      datos: {
        idEstudiante: 'est-1',
        idUsuario: 'u-1',
        esUsuarioNuevo: true,
        estadoCuenta: 'ACTIVA',
      },
    });
  });

  it('HU156: corregirIdentidadEstudiante envía PUT /admin/estudiantes/{id}/identidad con el payload', () => {
    const payload = {
      primerNombre: 'Carlos',
      segundoNombre: 'Andrés',
      primerApellido: 'Pérez',
      segundoApellido: 'Gómez',
      motivo: 'Corrección de tilde',
    };

    service.corregirIdentidadEstudiante('est-1', payload).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos.sincronizacionIdentidad).toBe('OK');
    });

    const req = http.expectOne(`${environment.apiUrl}/admin/estudiantes/est-1/identidad`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({
      exitoso: true,
      datos: {
        idRegistro: 'est-1',
        sincronizacionIdentidad: 'OK',
        mensajeUsuario: 'Identidad corregida',
      },
    });
  });
});

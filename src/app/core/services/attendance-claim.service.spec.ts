import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AttendanceClaimService, IdentificadorInvalidoError } from './attendance-claim.service';
import { SesionMateriaDetalle, SolicitudRevisionItem } from '../models/role-management.model';
import { SessionTimeZoneService } from './session-timezone.service';

describe('AttendanceClaimService', () => {
  let service: AttendanceClaimService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AttendanceClaimService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AttendanceClaimService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('considera exitoso un PATCH void aunque la respuesta omita datos', () => {
    let response: unknown;
    service.resolverReclamo('rec-1', 'APROBADA', 'Aceptado').subscribe((value) => (response = value));

    const request = http.expectOne(`${environment.apiUrl}/docente/reclamos/rec-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      accion: 'APROBADA',
      respuestaDocente: 'Aceptado',
      respuesta: 'Aceptado',
    });
    request.flush({ exitoso: true, mensajeUsuario: 'Procesado' });

    expect(response).toEqual({ exitoso: true, mensajeUsuario: 'Procesado' });
  });

  it('descarga por HttpClient usando exactamente el fileId codificado', () => {
    const fileId = 'folder/file-123';
    service.descargarSoporte(fileId).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/archivos/folder%2Ffile-123`);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['contenido'], { type: 'application/pdf' }));
  });

  it('subirSoporte envía el FormData con el archivo adjunto', () => {
    const file = new File(['dummy'], 'prueba.pdf', { type: 'application/pdf' });
    service.subirSoporte(file).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/archivos/subir`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBeTrue();
    expect((request.request.body as FormData).get('archivo')).toBeTruthy();
    request.flush({ exitoso: true, datos: { fileId: 'f1', nombre: 'prueba.pdf', url: '/api/v1/archivos/f1', tamanio: 5 } });
  });

  it('getReclamosDocente consulta la lista paginada y propaga el 501 sin enmascararlo', () => {
    let reclamos: any[] = [];
    service.getReclamosDocente({ pagina: 1, tamano: 10 }).subscribe((res) => (reclamos = res.datos || []));

    const request = http.expectOne(`${environment.apiUrl}/docente/reclamos?pagina=1&tamano=10`);
    expect(request.request.method).toBe('GET');
    request.flush({ exitoso: true, datos: [{ id: 'rec-1', materia: 'Cálculo' }], total: 1 });
    expect(reclamos.length).toBe(1);

    let error: { status?: number } | undefined;
    service.getReclamosDocente({ pagina: 1, tamano: 10 }).subscribe({ error: (e) => (error = e) });
    http.expectOne(`${environment.apiUrl}/docente/reclamos?pagina=1&tamano=10`).flush({}, { status: 501, statusText: 'Not Implemented' });
    expect(error?.status).toBe(501);
  });

  describe('bandeja y detalle del docente (HU035/HU036)', () => {
    const ID = '3f0c1d2e-0000-4000-8000-000000000001';
    const LISTA = `${environment.apiUrl}/docente/reclamos`;

    it('FE-01 envía pagina y tamano como query params y devuelve el total del servidor', () => {
      let total = -1;
      service.getReclamosDocente({ pagina: 3, tamano: 20 }).subscribe((res) => (total = res.total));
      const req = http.expectOne((r) => r.url === LISTA);
      expect(req.request.params.get('pagina')).toBe('3');
      expect(req.request.params.get('tamano')).toBe('20');
      expect(req.request.params.has('estado')).toBeFalse();
      req.flush({ exitoso: true, datos: [], total: 41 });
      expect(total).toBe(41);
    });

    it('FE-02 envía el estado cuando se filtra', () => {
      service.getReclamosDocente({ estado: 'P', pagina: 1, tamano: 10 }).subscribe();
      const req = http.expectOne((r) => r.url === LISTA);
      expect(req.request.params.get('estado')).toBe('P');
      req.flush({ exitoso: true, datos: [], total: 0 });
    });

    it('un 404 de la bandeja se propaga y no se convierte en lista vacía exitosa', () => {
      let result: unknown;
      let error: { status?: number } | undefined;
      service.getReclamosDocente({ pagina: 1, tamano: 10 }).subscribe({ next: (v) => (result = v), error: (e) => (error = e) });
      http.expectOne((r) => r.url === LISTA).flush({}, { status: 404, statusText: 'Not Found' });
      expect(result).toBeUndefined();
      expect(error?.status).toBe(404);
    });

    it('FE-04 getDetalleReclamoDocente consulta /docente/reclamos/{id} y adapta causal y estado', () => {
      TestBed.inject(SessionTimeZoneService).setManualTimeZone('America/Bogota');
      let item: Record<string, any> | undefined;
      service.getDetalleReclamoDocente(ID).subscribe((res) => (item = res.datos as never));

      const req = http.expectOne(`${LISTA}/${ID}`);
      expect(req.request.method).toBe('GET');
      req.flush({
        exitoso: true,
        datos: {
          id: ID, nombre: 'REV-1', fechaSolicitud: '2026-10-15', codigoEstado: 'P', estadoSolicitud: 'PENDIENTE',
          nombreEstado: 'pendiente', justificacionSolicitud: 'Cita médica', justificacionRespuesta: '',
          estudianteId: 'e1', estudianteNombre: 'Ana Pérez', sesionId: 's1', sesionNumero: 4,
          fechaSesionUtc: '2026-10-14T13:00:00.0000000Z', procedenciaTemporalSesion: 'UTC_V2',
          grupoId: 'g1', grupoCodigo: 1, grupoNombre: 'Grupo 1', materiaId: 'm1', materiaCodigo: 'MAT101',
          materiaNombre: 'Cálculo I',
          causalInasistencia: { codigo: 'SJC', nombre: 'sin justa causa', asistio: false },
          soporteAdjunto: null,
        },
      });

      expect(item?.['id']).toBe(ID);
      expect(item?.['estadoSolicitud']).toBe('PENDIENTE');
      expect(item?.['nombreEstado']).toBe('pendiente');
      expect(item?.['grupo']).toBe('Grupo 1');
      expect(item?.['fechaSesion']).toBe('2026-10-14');
      expect(item?.['causalInasistencia']).toEqual({ codigo: 'SJC', nombre: 'sin justa causa', asistio: false });
      expect(item?.['soporteAdjunto']).toBeUndefined();
    });

    it('el detalle sin causal conserva causalInasistencia en null', () => {
      let item: Record<string, any> | undefined;
      service.getDetalleReclamoDocente(ID).subscribe((res) => (item = res.datos as never));
      http.expectOne(`${LISTA}/${ID}`).flush({
        exitoso: true,
        datos: {
          id: ID, fechaSolicitud: '2026-10-15', estadoSolicitud: 'APROBADA', nombreEstado: 'aprobada',
          justificacionSolicitud: 'x', estudianteId: 'e1', estudianteNombre: 'Ana', sesionId: 's1', sesionNumero: 1,
          materiaId: 'm1', materiaCodigo: 'M', materiaNombre: 'Mat', causalInasistencia: null, soporteAdjunto: null,
        },
      });
      expect(item?.['causalInasistencia']).toBeNull();
      expect(item?.['fechaSesion']).toBe('');
    });

    it('FE-05 propaga el error 404 del detalle', () => {
      let error: { status?: number } | undefined;
      service.getDetalleReclamoDocente(ID).subscribe({ error: (e) => (error = e) });
      http.expectOne(`${LISTA}/${ID}`).flush({}, { status: 404, statusText: 'Not Found' });
      expect(error?.status).toBe(404);
    });

    for (const invalido of [undefined, null, '', 'x', 'undefined', 'rec-1']) {
      it(`FE-07 no emite petición con el id ${JSON.stringify(invalido)}`, () => {
        let error: unknown;
        service.getDetalleReclamoDocente(invalido as unknown as string).subscribe({ error: (e) => (error = e) });
        http.expectNone(() => true);
        expect(error instanceof IdentificadorInvalidoError).toBeTrue();
      });
    }
  });

  describe('getSesionesPorMateria (SesionMateriaEstudianteDTO)', () => {
    const ASIGNATURA = 'e2f3a4b5-0000-0000-0000-000000000001';
    const GRUPO = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

    it('consulta la ruta con el UUID de la asignatura y adapta las sesiones', () => {
      let sesiones: SesionMateriaDetalle[] = [];
      service.getSesionesPorMateria(ASIGNATURA).subscribe((res) => (sesiones = res.datos));

      const req = http.expectOne(`${environment.apiUrl}/estudiante/materias/${ASIGNATURA}/sesiones`);
      expect(req.request.url).not.toContain('undefined');
      req.flush({
        exitoso: true,
        total: 1,
        datos: [{
          id: 'd1d2d3d4-0000-4000-8000-000000000001', nombre: 'Introducción', numero: 1, codigo: 'SES-01',
          numeroSemana: 1, idGrupo: GRUPO, codigoGrupo: 'G1', nombreGrupo: 'Grupo 001',
          fechaHoraInicio: '2026-10-19T13:00:00', fechaHoraFin: '2026-10-19T15:00:00',
        }],
      });

      expect(sesiones.length).toBe(1);
      expect(sesiones[0].materiaId).toBe(ASIGNATURA);
      expect(sesiones[0].grupoId).toBe(GRUPO);
      expect(sesiones[0].estadoAsistencia).toBe('NO_DISPONIBLE');
      expect(sesiones[0].reclamable).toBeFalse();
      expect(sesiones[0].temporalidad).toBe('SIN_ZONA');
    });

    it('con un instante UTC explicito lo presenta en la zona IANA del usuario', () => {
      const zona = TestBed.inject(SessionTimeZoneService);
      zona.setManualTimeZone('America/Bogota');
      let sesiones: SesionMateriaDetalle[] = [];
      service.getSesionesPorMateria(ASIGNATURA).subscribe((res) => (sesiones = res.datos));

      http.expectOne(`${environment.apiUrl}/estudiante/materias/${ASIGNATURA}/sesiones`).flush({
        exitoso: true,
        datos: [{
          id: 'd1d2d3d4-0000-4000-8000-000000000001', nombre: 'S1', numero: 1, codigo: 'SES-01', numeroSemana: 1,
          idGrupo: GRUPO, codigoGrupo: 'G1', nombreGrupo: 'Grupo 001',
          fechaHoraInicio: '2026-10-19T13:00:00Z', fechaHoraFin: '2026-10-19T15:00:00Z',
        }],
      });

      expect(sesiones[0].temporalidad).toBe('UTC');
      expect(sesiones[0].fecha).toBe('2026-10-19');
      expect(sesiones[0].horario).toBe('08:00 - 10:00');
      expect(sesiones[0].fechaHoraInicioUtc).toBe('2026-10-19T13:00:00Z');
    });

    for (const invalido of [undefined, null, '', 'undefined', 'null', 'mat-123', '123']) {
      it(`no emite ninguna peticion HTTP con el identificador ${JSON.stringify(invalido)}`, () => {
        let error: unknown;
        service.getSesionesPorMateria(invalido as unknown as string).subscribe({ error: (e) => (error = e) });

        http.expectNone(() => true);
        expect(error instanceof IdentificadorInvalidoError).toBeTrue();
      });
    }
  });

  it('getHorarioDocente consulta /docente/horarios', () => {
    service.getHorarioDocente().subscribe();
    http.expectOne(`${environment.apiUrl}/docente/horarios`).flush({ exitoso: true, datos: [] });
  });

  it('crearReclamo envía solo soporteArchivoId', () => {
    service
      .crearReclamo({
        sesionId: 'ses-1',
        categoria: 'Médico / Salud',
        justificacionSolicitud: 'Cita médica',
        soporteAdjunto: {
          fileId: 'a1b2c3d4-0000-4000-8000-000000000001',
          nombre: 'evidencia.pdf',
          tipo: 'application/pdf',
          tamanioKb: 4,
          urlSimulada: '/api/v1/archivos/a1b2c3d4-0000-4000-8000-000000000001',
          fechaSubida: '2026-10-19',
        },
      } as never)
      .subscribe();

    const postRequest = http.expectOne(`${environment.apiUrl}/asistencias/revisiones`);
    expect(postRequest.request.method).toBe('POST');
    expect(postRequest.request.body).toEqual({
      sesionId: 'ses-1',
      categoria: 'Médico / Salud',
      justificacion: 'Cita médica',
      soporteArchivoId: 'a1b2c3d4-0000-4000-8000-000000000001',
    });
    expect(JSON.stringify(postRequest.request.body)).not.toContain('soporteUrl');
    expect(JSON.stringify(postRequest.request.body)).not.toContain('soporteNombre');
    postRequest.flush({ exitoso: true, datos: {} });

  });

  it('A2-F-02 eliminarReclamo hace DELETE a /estudiante/reclamos/{id} con un solo argumento', () => {
    expect(service.eliminarReclamo.length).toBe(1);
    let respuesta: { exitoso: boolean; mensaje: string } | undefined;
    service.eliminarReclamo('rec-99').subscribe((r) => (respuesta = r));
    const deleteRequest = http.expectOne(`${environment.apiUrl}/estudiante/reclamos/rec-99`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({ exitoso: true, mensaje: 'La solicitud de revisión fue retirada.' });
    expect(respuesta?.mensaje).toBe('La solicitud de revisión fue retirada.');
  });

  it('crearReclamo sin soporte no envía ningún campo de soporte', () => {
    service
      .crearReclamo({ sesionId: 'ses-2', categoria: 'Otro', justificacionSolicitud: 'Sin archivo' } as never)
      .subscribe();

    const request = http.expectOne(`${environment.apiUrl}/asistencias/revisiones`);
    expect(request.request.body).toEqual({ sesionId: 'ses-2', categoria: 'Otro', justificacion: 'Sin archivo' });
    request.flush({ exitoso: true });
  });

  it('crearReclamo propaga el intentoId como X-Correlation-Id y sin él no fija el encabezado', () => {
    const intentoId = '0b6f3a3e-6f5e-4a53-9f55-0f1f4f1d2a10';
    service.crearReclamo({ sesionId: 'ses-3', categoria: 'Otro', justificacionSolicitud: 'x' } as never, intentoId).subscribe();
    const conIntento = http.expectOne(`${environment.apiUrl}/asistencias/revisiones`);
    expect(conIntento.request.headers.get('X-Correlation-Id')).toBe(intentoId);
    conIntento.flush({ exitoso: true });

    service.crearReclamo({ sesionId: 'ses-3', categoria: 'Otro', justificacionSolicitud: 'x' } as never).subscribe();
    const sinIntento = http.expectOne(`${environment.apiUrl}/asistencias/revisiones`);
    expect(sinIntento.request.headers.has('X-Correlation-Id')).toBeFalse();
    sinIntento.flush({ exitoso: true });
  });

  it('sube el soporte como multipart bajo el campo archivo', () => {
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'a.pdf', { type: 'application/pdf' });
    service.subirSoporte(file).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/archivos/subir`);
    expect((request.request.body as FormData).get('archivo')).toBeTruthy();
    request.flush({ exitoso: true, datos: { fileId: 'f', nombre: 'a.pdf', url: '/api/v1/archivos/f', tamanio: 5 } });
  });

  describe('reclamos del docente (UTC v2, LB-004D)', () => {
    const reclamo = (extra: Record<string, unknown> = {}) => ({
      id: 'rec-1',
      nombre: 'REC-1',
      fechaSolicitud: '2026-10-19',
      estadoSolicitud: 'PENDIENTE',
      justificacionSolicitud: 'Cita',
      justificacionRespuesta: null,
      estudianteId: 'est-1',
      estudianteNombre: 'Ana Pérez',
      sesionId: 'ses-1',
      sesionNumero: 3,
      fechaSesionUtc: '2026-10-19T15:30:45.1234567Z',
      procedenciaTemporalSesion: 'UTC_V2',
      grupoId: 'g-1',
      grupoCodigo: 1,
      grupoNombre: 'G1',
      materiaId: 'm-1',
      materiaCodigo: 'MAT1',
      materiaNombre: 'Matemáticas',
      soporteAdjunto: {
        fileId: 'f-1',
        nombre: 'evidencia.pdf',
        tipo: 'application/pdf',
        tamanioBytes: 2048,
        fechaSubidaUtc: '2026-10-19T15:00:00.0000000Z',
        url: '/api/v1/archivos/f-1',
      },
      ...extra,
    });

    function cargar(items: unknown[]) {
      let result: { datos: Array<Record<string, any>> } | undefined;
      service.getReclamosDocente({ pagina: 1, tamano: 10 }).subscribe((value) => (result = value as never));
      http.expectOne((r) => r.url === `${environment.apiUrl}/docente/reclamos`).flush({ exitoso: true, datos: items, total: items.length });
      return result!.datos;
    }

    it('mapea reclamo y soporte, conserva el instante UTC y no inventa el correo', () => {
      TestBed.inject(SessionTimeZoneService).setManualTimeZone('America/Bogota');
      const [item] = cargar([reclamo()]);

      expect(item['id']).toBe('rec-1');
      expect(item['estudianteCorreo']).toBe('');
      expect(item['grupo']).toBe('G1');
      expect(item['estadoSolicitud']).toBe('PENDIENTE');
      expect(item['fechaSesionUtc']).toBe('2026-10-19T15:30:45.1234567Z');
      expect(item['fechaSesion']).toBe('2026-10-19');
      expect(item['soporteAdjunto']['fileId']).toBe('f-1');
      expect(item['soporteAdjunto']['tamanioBytes']).toBe(2048);
      expect(item['soporteAdjunto']['tamanioKb']).toBe(2);
      expect(item['soporteAdjunto']['urlSimulada']).toBe('/api/v1/archivos/f-1');
      expect(item['soporteAdjunto']['fechaSubidaUtc']).toBe('2026-10-19T15:00:00.0000000Z');
    });

    it('un reclamo sin soporte no fabrica adjunto', () => {
      const [item] = cargar([reclamo({ soporteAdjunto: null })]);
      expect(item['soporteAdjunto']).toBeUndefined();
    });

    it('sesión histórica sin procedencia no muestra una fecha inventada', () => {
      const [item] = cargar([reclamo({ fechaSesionUtc: null, procedenciaTemporalSesion: null })]);
      expect(item['fechaSesion']).toBe('');
      expect(item['fechaSesionUtc']).toBeUndefined();
    });

    it('presenta el mismo instante UTC en la zona elegida', () => {
      const zone = TestBed.inject(SessionTimeZoneService);
      const instante = '2026-10-19T22:45:00.0000000Z';
      const dias: Record<string, string> = {};
      for (const tz of ['America/Bogota', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata']) {
        zone.setManualTimeZone(tz);
        const [item] = cargar([reclamo({ fechaSesionUtc: instante })]);
        dias[tz] = item['fechaSesion'];
        expect(item['fechaSesionUtc']).toBe(instante);
      }
      expect(dias).toEqual({
        'America/Bogota': '2026-10-19',
        'Europe/London': '2026-10-19',
        'Europe/Berlin': '2026-10-20',
        'Asia/Kolkata': '2026-10-20',
      });
    });

    it('respeta el cambio de horario DST en Londres', () => {
      const zone = TestBed.inject(SessionTimeZoneService);
      zone.setManualTimeZone('Europe/London');
      const [item] = cargar([reclamo({ fechaSesionUtc: '2026-03-29T01:30:00.0000000Z' })]);
      expect(item['fechaSesion']).toBe('2026-03-29');
      expect(zone.displayInstant('2026-03-29T01:30:00.0000000Z').time).toBe('02:30');
    });

    it('propaga el 501 del módulo de reclamos en lugar de simular una lista vacía exitosa', () => {
      let result: unknown;
      let error: { status?: number } | undefined;
      service.getReclamosDocente({ pagina: 1, tamano: 10 }).subscribe({ next: (value) => (result = value), error: (e) => (error = e) });
      http.expectOne((r) => r.url === `${environment.apiUrl}/docente/reclamos`).flush({}, { status: 501, statusText: 'Not Implemented' });
      expect(result).toBeUndefined();
      expect(error?.status).toBe(501);
    });
  });

  describe('APP-05 reclamos del grupo docente', () => {
    const GROUP_A = '3f0c1d2e-0000-4000-8000-000000000001';
    const GROUP_B = '3f0c1d2e-0000-4000-8000-000000000002';
    const LISTA = `${environment.apiUrl}/docente/reclamos`;
    const reclamo = (id: string, grupoId?: string) => ({
      id,
      fechaSolicitud: '2026-11-02',
      estadoSolicitud: 'PENDIENTE',
      justificacionSolicitud: 'Justificación de prueba',
      estudianteId: 'est-1',
      estudianteNombre: 'Estudiante',
      sesionId: 'ses-1',
      sesionNumero: 1,
      grupoId,
      grupoCodigo: 1,
      grupoNombre: 'Grupo visible',
      materiaId: 'mat-1',
      materiaCodigo: 'MAT-1',
      materiaNombre: 'Materia',
      soporteAdjunto: null,
    });

    it('recorre páginas completas y filtra por el UUID DTO sin inventar query params', () => {
      let resultado: SolicitudRevisionItem[] | undefined;
      service.getReclamosDocentePorGrupo(GROUP_A).subscribe((items) => (resultado = items));

      const pagina1 = http.expectOne((request) => request.url === LISTA);
      expect(pagina1.request.params.get('pagina')).toBe('1');
      expect(pagina1.request.params.get('tamano')).toBe('100');
      expect(pagina1.request.params.has('grupoId')).toBeFalse();
      const primeraPagina = [
        reclamo('target-1', GROUP_A),
        ...Array.from({ length: 99 }, (_, index) => reclamo(`other-${index}`, GROUP_B)),
      ];
      pagina1.flush({ exitoso: true, datos: primeraPagina, total: 101 });

      const pagina2 = http.expectOne((request) => request.url === LISTA);
      expect(pagina2.request.params.get('pagina')).toBe('2');
      expect(pagina2.request.params.get('tamano')).toBe('100');
      pagina2.flush({ exitoso: true, datos: [reclamo('target-2', GROUP_A)], total: 101 });

      expect(resultado?.map((item) => item.id)).toEqual(['target-1', 'target-2']);
      expect(resultado?.every((item) => item.grupoId === GROUP_A)).toBeTrue();
    });

    it('solo declara vacío después de recorrer todas las páginas de otros grupos', () => {
      let resultado: SolicitudRevisionItem[] | undefined;
      service.getReclamosDocentePorGrupo(GROUP_A).subscribe((items) => (resultado = items));
      http.expectOne((request) => request.url === LISTA).flush({
        exitoso: true,
        datos: Array.from({ length: 100 }, (_, index) => reclamo(`other-${index}`, GROUP_B)),
        total: 101,
      });
      http.expectOne((request) => request.url === LISTA).flush({
        exitoso: true,
        datos: [reclamo('other-final', GROUP_B)],
        total: 101,
      });
      expect(resultado).toEqual([]);
    });

    it('falla cerrado si una fila no incluye el UUID grupoId requerido por el DTO', () => {
      let resultado: unknown;
      let error: unknown;
      service.getReclamosDocentePorGrupo(GROUP_A).subscribe({
        next: (items) => (resultado = items),
        error: (reason) => (error = reason),
      });
      http.expectOne((request) => request.url === LISTA).flush({
        exitoso: true,
        datos: [reclamo('missing-group')],
        total: 1,
      });
      expect(resultado).toBeUndefined();
      expect(error).toBeTruthy();
    });

    it('falla cerrado si el total cambia mientras se recorren las páginas', () => {
      let resultado: unknown;
      let error: unknown;
      service.getReclamosDocentePorGrupo(GROUP_A).subscribe({
        next: (items) => (resultado = items),
        error: (reason) => (error = reason),
      });
      http.expectOne((request) => request.url === LISTA).flush({
        exitoso: true,
        datos: Array.from({ length: 100 }, (_, index) => reclamo(`row-${index}`, GROUP_B)),
        total: 101,
      });
      http.expectOne((request) => request.url === LISTA).flush({
        exitoso: true,
        datos: [reclamo('row-final', GROUP_B)],
        total: 102,
      });
      expect(resultado).toBeUndefined();
      expect(error).toBeTruthy();
    });

    it('propaga 403, 501 y fallo de conexión sin convertirlos en lista vacía', () => {
      for (const status of [403, 501]) {
        let resultado: unknown;
        let error: { status?: number } | undefined;
        service.getReclamosDocentePorGrupo(GROUP_A).subscribe({
          next: (items) => (resultado = items),
          error: (reason) => (error = reason),
        });
        http.expectOne((request) => request.url === LISTA).flush({}, {
          status,
          statusText: status === 403 ? 'Forbidden' : 'Not Implemented',
        });
        expect(resultado).toBeUndefined();
        expect(error?.status).toBe(status);
      }

      let resultado: unknown;
      let error: { status?: number } | undefined;
      service.getReclamosDocentePorGrupo(GROUP_A).subscribe({
        next: (items) => (resultado = items),
        error: (reason) => (error = reason),
      });
      http.expectOne((request) => request.url === LISTA).error(new ProgressEvent('error'));
      expect(resultado).toBeUndefined();
      expect(error?.status).toBe(0);
    });
  });
});

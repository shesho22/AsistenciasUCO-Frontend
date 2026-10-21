import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AttendanceClaimService, IdentificadorInvalidoError } from './attendance-claim.service';
import { SesionMateriaDetalle } from '../models/role-management.model';
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

  it('getReclamosDocente consulta la lista y conserva el fallback 501', () => {
    let reclamos: any[] = [];
    service.getReclamosDocente().subscribe((res) => (reclamos = res.datos || []));

    const request = http.expectOne(`${environment.apiUrl}/docente/reclamos`);
    expect(request.request.method).toBe('GET');
    request.flush({ exitoso: true, datos: [{ id: 'rec-1', materia: 'Cálculo' }] });
    expect(reclamos.length).toBe(1);

    service.getReclamosDocente().subscribe((res) => (reclamos = res.datos || []));
    http.expectOne(`${environment.apiUrl}/docente/reclamos`).flush({}, { status: 501, statusText: 'Not Implemented' });
    expect(reclamos).toEqual([]);
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

  it('crearReclamo envía solo soporteArchivoId y eliminarReclamo conserva su ruta', () => {
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

    service.eliminarReclamo('rec-99', 'mat-1', 'ses-1').subscribe();
    const deleteRequest = http.expectOne(`${environment.apiUrl}/estudiante/reclamos/rec-99`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({ exitoso: true, datos: true });
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
      service.getReclamosDocente().subscribe((value) => (result = value as never));
      http.expectOne(`${environment.apiUrl}/docente/reclamos`).flush({ exitoso: true, datos: items, total: items.length });
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

    it('conserva el fallback de módulo no disponible para 501', () => {
      let result: { datos: unknown[] } | undefined;
      service.getReclamosDocente().subscribe((value) => (result = value as never));
      http.expectOne(`${environment.apiUrl}/docente/reclamos`).flush({}, { status: 501, statusText: 'Not Implemented' });
      expect(result!.datos).toEqual([]);
    });
  });
});

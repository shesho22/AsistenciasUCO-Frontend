import { ObservedValueOf } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AttendanceClaimService, DEFAULT_CONFIGURACION_RECLAMOS, IdentificadorInvalidoError } from './attendance-claim.service';
import { ConfiguracionReclamosDTO, SesionMateriaDetalle, SolicitudRevisionItem } from '../models/role-management.model';
import { SessionTimeZoneService } from './session-timezone.service';

describe('AttendanceClaimService', () => {
  let service: AttendanceClaimService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AttendanceClaimService, provideHttpClient(withXhr()), provideHttpClientTesting()],
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
    let reclamos: NonNullable<ObservedValueOf<ReturnType<typeof service.getReclamosDocente>>['datos']> = [];
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
      let item: Record<string, unknown> | undefined;
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
      let item: Record<string, unknown> | undefined;
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

    describe('CULM-001 D.1 plazo de justificacion', () => {
      const base = {
        nombre: 'S1', numero: 1, numeroSemana: 1, idGrupo: GRUPO, codigoGrupo: 'G1', nombreGrupo: 'Grupo 001',
        fechaHoraInicio: '2026-11-04T13:00:00Z', fechaHoraFin: '2026-11-04T15:00:00Z',
      };
      const cargar = (sesion: Record<string, unknown>): SesionMateriaDetalle => {
        const zona = TestBed.inject(SessionTimeZoneService);
        zona.setManualTimeZone('America/Bogota');
        let sesiones: SesionMateriaDetalle[] = [];
        service.getSesionesPorMateria(ASIGNATURA).subscribe((res) => (sesiones = res.datos));
        http.expectOne(`${environment.apiUrl}/estudiante/materias/${ASIGNATURA}/sesiones`).flush({
          exitoso: true,
          datos: [{ id: 'd1d2d3d4-0000-4000-8000-000000000001', ...base, ...sesion }],
        });
        return sesiones[0];
      };

      it('vigente: expone la fecha limite en hora local y el indicador', () => {
        const s = cargar({ fechaLimiteJustificacionUtc: '2026-11-10T04:59:59Z', plazoJustificacionVigente: true });
        expect(s.plazoJustificacionVigente).toBeTrue();
        expect(s.fechaLimiteJustificacionUtc).toBe('2026-11-10T04:59:59Z');
        expect(s.fechaLimiteJustificacionLocal).toBe('2026-11-09 23:59');
      });

      it('vencido: conserva la fecha y marca el plazo como no vigente', () => {
        const s = cargar({ fechaLimiteJustificacionUtc: '2026-11-10T04:59:59Z', plazoJustificacionVigente: false });
        expect(s.plazoJustificacionVigente).toBeFalse();
        expect(s.fechaLimiteJustificacionLocal).toBe('2026-11-09 23:59');
      });

      it('fecha null: sin plazo y sin fecha local', () => {
        const s = cargar({ fechaLimiteJustificacionUtc: null, plazoJustificacionVigente: false });
        expect(s.plazoJustificacionVigente).toBeFalse();
        expect(s.fechaLimiteJustificacionUtc).toBeUndefined();
        expect(s.fechaLimiteJustificacionLocal).toBeUndefined();
      });

      it('sesion cancelada: el plazo no esta vigente', () => {
        const s = cargar({ estado: 'CANCELADA', fechaLimiteJustificacionUtc: '2026-11-10T04:59:59Z', plazoJustificacionVigente: false });
        expect(s.estado).toBe('CANCELADA');
        expect(s.plazoJustificacionVigente).toBeFalse();
      });

      it('despliegue anterior sin los campos: el indicador queda indefinido (no bloquea)', () => {
        const s = cargar({});
        expect(s.plazoJustificacionVigente).toBeUndefined();
        expect(s.fechaLimiteJustificacionLocal).toBeUndefined();
      });

      describe('VAL PRU-13: bordes exactos del plazo en UTC y en hora de Bogota', () => {
        const cargarEn = (zonaIana: string, sesion: Record<string, unknown>): SesionMateriaDetalle => {
          TestBed.inject(SessionTimeZoneService).setManualTimeZone(zonaIana);
          let sesiones: SesionMateriaDetalle[] = [];
          service.getSesionesPorMateria(ASIGNATURA).subscribe((res) => (sesiones = res.datos));
          http.expectOne(`${environment.apiUrl}/estudiante/materias/${ASIGNATURA}/sesiones`).flush({
            exitoso: true,
            datos: [{ id: 'd1d2d3d4-0000-4000-8000-000000000001', ...base, ...sesion }],
          });
          return sesiones[0];
        };

        afterEach(() => jasmine.clock().uninstall());

        const casos = [
          // Ultimo minuto valido: 23:59:59 de Bogota (UTC-5) es 04:59:59Z del dia siguiente.
          { zona: 'America/Bogota', utc: '2026-11-10T04:59:59Z', local: '2026-11-09 23:59' },
          { zona: 'UTC', utc: '2026-11-10T04:59:59Z', local: '2026-11-10 04:59' },
          // Primer minuto vencido: medianoche de Bogota; no se corre al dia anterior ni se trunca a 23:59.
          { zona: 'America/Bogota', utc: '2026-11-10T05:00:00Z', local: '2026-11-10 00:00' },
          { zona: 'UTC', utc: '2026-11-10T05:00:00Z', local: '2026-11-10 05:00' },
        ];
        for (const c of casos) {
          it(`${c.utc} se presenta en ${c.zona} como ${c.local}`, () => {
            const s = cargarEn(c.zona, { fechaLimiteJustificacionUtc: c.utc, plazoJustificacionVigente: true });
            expect(s.fechaLimiteJustificacionUtc).toBe(c.utc);
            expect(s.fechaLimiteJustificacionLocal).toBe(c.local);
          });
        }

        it('en el ultimo segundo valido la vigencia es la del backend aunque el reloj local ya haya pasado el limite', () => {
          jasmine.clock().install();
          jasmine.clock().mockDate(new Date('2026-11-10T05:00:30Z'));
          const s = cargarEn('America/Bogota', { fechaLimiteJustificacionUtc: '2026-11-10T04:59:59Z', plazoJustificacionVigente: true });
          expect(s.plazoJustificacionVigente).toBeTrue();
        });

        it('en el primer minuto vencido la vigencia es la del backend aunque el reloj local siga antes del limite', () => {
          jasmine.clock().install();
          jasmine.clock().mockDate(new Date('2026-11-10T04:59:00Z'));
          const s = cargarEn('America/Bogota', { fechaLimiteJustificacionUtc: '2026-11-10T04:59:59Z', plazoJustificacionVigente: false });
          expect(s.plazoJustificacionVigente).toBeFalse();
          expect(s.fechaLimiteJustificacionLocal).toBe('2026-11-09 23:59');
        });
      });

      it('envia pagina y tamano cuando se indican', () => {
        service.getSesionesPorMateria(ASIGNATURA, { pagina: 2, tamano: 25 }).subscribe();
        const req = http.expectOne((r) => r.url === `${environment.apiUrl}/estudiante/materias/${ASIGNATURA}/sesiones`);
        expect(req.request.params.get('pagina')).toBe('2');
        expect(req.request.params.get('tamano')).toBe('25');
        req.flush({ exitoso: true, datos: [] });
      });
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
      let result: ObservedValueOf<ReturnType<typeof service.getReclamosDocente>> | undefined;
      service.getReclamosDocente({ pagina: 1, tamano: 10 }).subscribe((value) => (result = value));
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
      expect(item['soporteAdjunto']?.['fileId']).toBe('f-1');
      expect(item['soporteAdjunto']?.['tamanioBytes']).toBe(2048);
      expect(item['soporteAdjunto']?.['tamanioKb']).toBe(2);
      expect(item['soporteAdjunto']?.['urlSimulada']).toBe('/api/v1/archivos/f-1');
      expect(item['soporteAdjunto']?.['fechaSubidaUtc']).toBe('2026-10-19T15:00:00.0000000Z');
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

  // CIERRE-W1A: el servidor filtra y pagina; el cliente no recorre páginas ni filtra en memoria.
  describe('CIERRE-W1A reclamos del docente filtrados en el servidor', () => {
    const GROUP_A = '3f0c1d2e-0000-4000-8000-000000000001';
    const LISTA = `${environment.apiUrl}/docente/reclamos`;
    const reclamo = (id: string, grupoId?: string, nombre?: string) => ({
      id,
      nombre,
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

    it('getReclamosDocente envía busqueda recortada y grupoId al servidor', () => {
      let resultado: { total?: number; datos: SolicitudRevisionItem[] } | undefined;
      service
        .getReclamosDocente({ pagina: 2, tamano: 10, estado: 'P', busqueda: '  ana  ', grupoId: GROUP_A })
        .subscribe((res) => (resultado = res));

      const peticion = http.expectOne((request) => request.url === LISTA);
      expect(peticion.request.params.get('pagina')).toBe('2');
      expect(peticion.request.params.get('tamano')).toBe('10');
      expect(peticion.request.params.get('estado')).toBe('P');
      expect(peticion.request.params.get('busqueda')).toBe('ana');
      expect(peticion.request.params.get('grupoId')).toBe(GROUP_A);
      peticion.flush({ exitoso: true, datos: [reclamo('r-1', GROUP_A)], total: 31 });

      expect(resultado?.total).toBe(31);
      expect(resultado?.datos.length).toBe(1);
    });

    it('getReclamosDocente no envía busqueda vacía ni grupoId ausente', () => {
      service.getReclamosDocente({ pagina: 1, tamano: 10, busqueda: '   ' }).subscribe();

      const peticion = http.expectOne((request) => request.url === LISTA);
      expect(peticion.request.params.has('busqueda')).toBeFalse();
      expect(peticion.request.params.has('grupoId')).toBeFalse();
      peticion.flush({ exitoso: true, datos: [], total: 0 });
    });

    it('getReclamosDocentePorGrupo pide UNA página con el grupoId y devuelve el total del servidor', () => {
      let resultado: { total?: number; datos: SolicitudRevisionItem[] } | undefined;
      service.getReclamosDocentePorGrupo(GROUP_A, { pagina: 3, tamano: 10 }).subscribe((res) => (resultado = res));

      const peticion = http.expectOne((request) => request.url === LISTA);
      expect(peticion.request.params.get('grupoId')).toBe(GROUP_A);
      expect(peticion.request.params.get('pagina')).toBe('3');
      expect(peticion.request.params.get('tamano')).toBe('10');
      expect(peticion.request.params.has('estado')).toBeFalse();
      peticion.flush({ exitoso: true, datos: [reclamo('r-1', GROUP_A)], total: 41 });
      http.expectNone(LISTA);

      expect(resultado?.total).toBe(41);
      expect(resultado?.datos.map((item) => item.id)).toEqual(['r-1']);
    });

    it('getReclamosDocentePorGrupo con estado y tamano 1 sirve de conteo sin descargar la lista', () => {
      let total: number | undefined;
      service.getReclamosDocentePorGrupo(GROUP_A, { pagina: 1, tamano: 1, estado: 'P' }).subscribe((res) => (total = res.total));

      const peticion = http.expectOne((request) => request.url === LISTA);
      expect(peticion.request.params.get('estado')).toBe('P');
      expect(peticion.request.params.get('tamano')).toBe('1');
      peticion.flush({ exitoso: true, datos: [reclamo('r-1', GROUP_A)], total: 7 });

      expect(total).toBe(7);
    });

    it('getReclamosDocentePorGrupo rechaza un identificador que no es UUID sin emitir petición', () => {
      let error: unknown;
      service.getReclamosDocentePorGrupo('no-es-uuid', { pagina: 1, tamano: 10 }).subscribe({ error: (e) => (error = e) });

      http.expectNone(LISTA);
      expect(error).toBeInstanceOf(IdentificadorInvalidoError);
    });

    it('un grupo sin reclamos devuelve lista vacía con total 0', () => {
      let resultado: { total?: number; datos: SolicitudRevisionItem[] } | undefined;
      service.getReclamosDocentePorGrupo(GROUP_A, { pagina: 1, tamano: 10 }).subscribe((res) => (resultado = res));
      http.expectOne((request) => request.url === LISTA).flush({ exitoso: true, datos: [], total: 0 });

      expect(resultado?.datos).toEqual([]);
      expect(resultado?.total).toBe(0);
    });

    it('propaga 403, 501 y fallo de conexión sin convertirlos en lista vacía', () => {
      for (const status of [403, 501]) {
        let resultado: unknown;
        let error: { status?: number } | undefined;
        service.getReclamosDocentePorGrupo(GROUP_A, { pagina: 1, tamano: 10 }).subscribe({
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
      service.getReclamosDocentePorGrupo(GROUP_A, { pagina: 1, tamano: 10 }).subscribe({
        next: (items) => (resultado = items),
        error: (reason) => (error = reason),
      });
      http.expectOne((request) => request.url === LISTA).error(new ProgressEvent('error'));
      expect(resultado).toBeUndefined();
      expect(error?.status).toBe(0);
    });

    it('el folio es el `nombre` que entrega el backend y la UI no lo compone', () => {
      let items: SolicitudRevisionItem[] = [];
      service.getReclamosDocente({ pagina: 1, tamano: 10 }).subscribe((res) => (items = res.datos));
      http.expectOne((request) => request.url === LISTA).flush({
        exitoso: true,
        datos: [reclamo('1f2e3d4c-aaaa-4bbb-8ccc-000000000001', GROUP_A, 'REC-1F2E3D4C'), reclamo('9a8b7c6d-aaaa-4bbb-8ccc-000000000002', GROUP_A)],
        total: 2,
      });

      expect(items[0].folio).toBe('REC-1F2E3D4C');
      expect(items[1].folio).toBeUndefined();
    });

    it('el folio también llega en los reclamos del estudiante', () => {
      let items: SolicitudRevisionItem[] = [];
      service.getReclamosEstudiante({ pagina: 1, tamano: 10 }).subscribe((res) => (items = res.datos));
      http.expectOne((request) => request.url === `${environment.apiUrl}/estudiante/reclamos`).flush({
        exitoso: true,
        datos: [reclamo('1f2e3d4c-aaaa-4bbb-8ccc-000000000001', GROUP_A, 'REC-1F2E3D4C')],
        total: 1,
      });

      expect(items[0].folio).toBe('REC-1F2E3D4C');
    });
  });

  describe('PAG_001 propagación de mensaje en 400', () => {
    it('getReclamosDocente propaga el mensaje del backend en 400 PAG_001', () => {
      let error!: HttpErrorResponse;
      service.getReclamosDocente({ pagina: 99, tamano: 10 }).subscribe({
        error: (e) => (error = e),
      });

      http.expectOne((r) => r.url === `${environment.apiUrl}/docente/reclamos`).flush(
        { code: 'PAG_001', message: 'La página solicitada supera el total de registros disponibles.' },
        { status: 400, statusText: 'Bad Request' }
      );

      expect(error.status).toBe(400);
      expect(error.error?.message).toBe('La página solicitada supera el total de registros disponibles.');
      expect(error.error?.code).toBe('PAG_001');
    });

    it('getReclamosEstudiante propaga el mensaje del backend en 400 PAG_001', () => {
      let error!: HttpErrorResponse;
      service.getReclamosEstudiante({ pagina: 99, tamano: 10 }).subscribe({
        error: (e) => (error = e),
      });

      http.expectOne((r) => r.url === `${environment.apiUrl}/estudiante/reclamos`).flush(
        { code: 'PAG_001', message: 'La página solicitada supera el total de registros disponibles.' },
        { status: 400, statusText: 'Bad Request' }
      );

      expect(error.status).toBe(400);
      expect(error.error?.message).toBe('La página solicitada supera el total de registros disponibles.');
      expect(error.error?.code).toBe('PAG_001');
    });
  });

  describe('CULM-001 D.2 — soporte múltiple y configuración de reclamos (HU015, HU014)', () => {
    it('getConfiguracionReclamos consulta /configuracion/reclamos y devuelve la configuración', () => {
      let config: ConfiguracionReclamosDTO | undefined;
      service.getConfiguracionReclamos().subscribe((res) => (config = res.datos));

      const req = http.expectOne(`${environment.apiUrl}/configuracion/reclamos`);
      expect(req.request.method).toBe('GET');
      req.flush({
        exitoso: true,
        datos: {
          maximoSoportes: 5,
          tamanioMaximoBytes: 3145728,
          tiposPermitidos: ['application/pdf'],
          limiteSubidasPorMinuto: 6,
          diasLimiteJustificacion: 8,
        },
      });

      expect(config).toEqual({
        maximoSoportes: 5,
        tamanioMaximoBytes: 3145728,
        tiposPermitidos: ['application/pdf'],
        limiteSubidasPorMinuto: 6,
        diasLimiteJustificacion: 8,
      });
    });

    it('getConfiguracionReclamos ante error 500 o desconexión devuelve fallback limpio con valores por defecto', () => {
      let config: ConfiguracionReclamosDTO | undefined;
      service.getConfiguracionReclamos().subscribe((res) => (config = res.datos));

      const req = http.expectOne(`${environment.apiUrl}/configuracion/reclamos`);
      req.flush(null, { status: 500, statusText: 'Server Error' });

      expect(config).toEqual(DEFAULT_CONFIGURACION_RECLAMOS);
      expect(config?.maximoSoportes).toBe(3);
      expect(config?.tamanioMaximoBytes).toBe(5242880);
      expect(config?.limiteSubidasPorMinuto).toBe(10);
    });

    it('crearReclamo envía soporteArchivoIds con la lista de UUIDs de soportes exitosos', () => {
      service
        .crearReclamo({
          sesionId: 'ses-10',
          categoria: 'MED',
          justificacionSolicitud: 'Incapacidad médica',
          soporteArchivoIds: ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'],
        } as never)
        .subscribe();

      const req = http.expectOne(`${environment.apiUrl}/asistencias/revisiones`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        sesionId: 'ses-10',
        categoria: 'MED',
        justificacion: 'Incapacidad médica',
        soporteArchivoIds: ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'],
      });
      req.flush({ exitoso: true });
    });
  });
});

describe('AttendanceClaimService: puntos de control', () => {
  let service: AttendanceClaimService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AttendanceClaimService, provideHttpClient(withXhr()), provideHttpClientTesting()] });
    service = TestBed.inject(AttendanceClaimService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crearReclamo con toma envía tomaId; sin toma no lo envía (reclamo por sesión)', () => {
    service.crearReclamo({ sesionId: 'ses-1', idToma: 'toma-2', categoria: 'Otro', justificacionSolicitud: 'x' } as never).subscribe();
    const conToma = http.expectOne(`${environment.apiUrl}/asistencias/revisiones`);
    expect(conToma.request.body.tomaId).toBe('toma-2');
    conToma.flush({ exitoso: true });

    service.crearReclamo({ sesionId: 'ses-1', idToma: null, categoria: 'Otro', justificacionSolicitud: 'x' } as never).subscribe();
    const sinToma = http.expectOne(`${environment.apiUrl}/asistencias/revisiones`);
    expect('tomaId' in sinToma.request.body).toBeFalse();
    sinToma.flush({ exitoso: true });
  });

  it('resolverReclamo envía resultado solo al aprobar', () => {
    service.resolverReclamo('rec-1', 'APROBADA', 'Ok', 'PRESENTE').subscribe();
    const aprobar = http.expectOne(`${environment.apiUrl}/docente/reclamos/rec-1`);
    expect(aprobar.request.body).toEqual({ accion: 'APROBADA', respuestaDocente: 'Ok', respuesta: 'Ok', resultado: 'PRESENTE' });
    aprobar.flush({ exitoso: true });

    service.resolverReclamo('rec-2', 'RECHAZADA', 'No', 'PRESENTE').subscribe();
    const rechazar = http.expectOne(`${environment.apiUrl}/docente/reclamos/rec-2`);
    expect('resultado' in rechazar.request.body).toBeFalse();
    rechazar.flush({ exitoso: true });
  });
});

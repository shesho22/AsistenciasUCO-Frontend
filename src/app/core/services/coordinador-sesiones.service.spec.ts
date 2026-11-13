import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoordinadorSesionesService } from './coordinador-sesiones.service';
import { environment } from '../../../environments/environment';

describe('CoordinadorSesionesService (DEC-064)', () => {
  let service: CoordinadorSesionesService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/coordinador/sesiones`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    service = TestBed.inject(CoordinadorSesionesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta los motivos de cancelación', () => {
    let total = 0;
    service.getMotivosCancelacion().subscribe((res) => (total = res.datos?.length ?? 0));
    const req = http.expectOne(`${base}/motivos-cancelacion`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [{ codigo: 'DUPLICADA', nombre: 'Sesión duplicada' }], total: 1 });
    expect(total).toBe(1);
  });

  it('cancela con POST /{id}/cancelacion enviando codigoMotivo y observacion', () => {
    let estado = '';
    service.cancelarSesion('ses-1', { codigoMotivo: 'DUPLICADA', observacion: 'ya existe' }).subscribe((res) => {
      estado = res.datos?.estado ?? '';
    });
    const req = http.expectOne(`${base}/ses-1/cancelacion`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ codigoMotivo: 'DUPLICADA', observacion: 'ya existe' });
    req.flush({
      exitoso: true,
      datos: {
        idSesion: 'ses-1', idGrupo: 'g-1', estado: 'CANCELADA',
        cancelacion: { tipo: 'COORDINADOR', motivo: 'Sesión duplicada', nombreFestivo: null, fechaCancelacionUtc: '2026-11-09T10:00:00Z' },
        estudiantesActivos: 20,
      },
    });
    expect(estado).toBe('CANCELADA');
  });

  it('propaga el error 409 con el mensaje del backend', () => {
    let mensaje = '';
    service.cancelarSesion('ses-2', { codigoMotivo: 'X' }).subscribe({
      error: (e) => (mensaje = e.error.message as string),
    });
    http.expectOne(`${base}/ses-2/cancelacion`).flush(
      { code: 'SES_018', message: 'Solo se cancelan sesiones manuales.' },
      { status: 409, statusText: 'Conflict' }
    );
    expect(mensaje).toBe('Solo se cancelan sesiones manuales.');
  });

  describe('solicitudes de sesión extraordinaria (DEC-065 (2))', () => {
    it('consulta la bandeja con soloPendientes, programa y paginación', () => {
      let total = 0;
      service.consultarSolicitudes({ soloPendientes: true, programaId: 'p-1', pagina: 2, tamano: 20 }).subscribe((p) => (total = p.totalElementos));
      const req = http.expectOne((r) => r.url === `${base}/solicitudes`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('soloPendientes')).toBe('true');
      expect(req.request.params.get('programaId')).toBe('p-1');
      expect(req.request.params.get('grupoId')).toBeNull();
      expect(req.request.params.get('pagina')).toBe('2');
      expect(req.request.params.get('tamano')).toBe('20');
      req.flush({ exitoso: true, elementos: [], numeroPagina: 2, tamanoPagina: 20, totalElementos: 41, totalPaginas: 3 });
      expect(total).toBe(41);
    });

    it('contarPendientes pide una fila de pendientes y devuelve totalElementos', () => {
      let n = -1;
      service.contarPendientes('p-1').subscribe((v) => (n = v));
      const req = http.expectOne((r) => r.url === `${base}/solicitudes`);
      expect(req.request.params.get('soloPendientes')).toBe('true');
      expect(req.request.params.get('tamano')).toBe('1');
      req.flush({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 1, totalElementos: 7, totalPaginas: 7 });
      expect(n).toBe(7);
    });

    it('contarPendientes sin programa omite programaId y, sin totalElementos, cuenta los elementos', () => {
      let n = -1;
      service.contarPendientes().subscribe((v) => (n = v));
      const req = http.expectOne((r) => r.url === `${base}/solicitudes`);
      expect(req.request.params.has('programaId')).toBeFalse();
      req.flush({ elementos: [{}], numeroPagina: 1, tamanoPagina: 1 });
      expect(n).toBe(1);
    });

    it('contarPendientes sin totalElementos ni elementos devuelve 0', () => {
      let n = -1;
      service.contarPendientes().subscribe((v) => (n = v));
      http.expectOne((r) => r.url === `${base}/solicitudes`).flush({});
      expect(n).toBe(0);
    });

    it('aprueba con POST /{id}/aprobacion; la observación solo viaja si existe', () => {
      service.aprobar('ses-1', 'Cuenta con aula').subscribe();
      const conObs = http.expectOne(`${base}/ses-1/aprobacion`);
      expect(conObs.request.method).toBe('POST');
      expect(conObs.request.body).toEqual({ observacion: 'Cuenta con aula' });
      conObs.flush({ exitoso: true, datos: null });

      service.aprobar('ses-2').subscribe();
      const sinObs = http.expectOne(`${base}/ses-2/aprobacion`);
      expect(sinObs.request.body).toEqual({});
      sinObs.flush({ exitoso: true, datos: null });
    });

    it('rechaza con POST /{id}/rechazo enviando el motivo y la observación opcional', () => {
      service.rechazar('ses-1', 'SIN_AULA', 'No hay aula').subscribe();
      const conObs = http.expectOne(`${base}/ses-1/rechazo`);
      expect(conObs.request.method).toBe('POST');
      expect(conObs.request.body).toEqual({ codigoMotivo: 'SIN_AULA', observacion: 'No hay aula' });
      conObs.flush({ exitoso: true, datos: null });

      service.rechazar('ses-2', 'SIN_AULA').subscribe();
      const sinObs = http.expectOne(`${base}/ses-2/rechazo`);
      expect(sinObs.request.body).toEqual({ codigoMotivo: 'SIN_AULA' });
      sinObs.flush({ exitoso: true, datos: null });
    });
  });
});

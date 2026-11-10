import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoordinadorSesionesService } from './coordinador-sesiones.service';
import { environment } from '../../../environments/environment';

describe('CoordinadorSesionesService (DEC-064)', () => {
  let service: CoordinadorSesionesService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/coordinador/sesiones`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
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
});

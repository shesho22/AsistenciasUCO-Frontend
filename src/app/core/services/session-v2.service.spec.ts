import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { SessionV2Service } from './session-v2.service';
import { SessionTimeZoneService } from './session-timezone.service';

describe('SessionV2Service', () => {
  let service: SessionV2Service;
  let http: HttpTestingController;
  let timeZone: SessionTimeZoneService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SessionV2Service, SessionTimeZoneService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SessionV2Service);
    http = TestBed.inject(HttpTestingController);
    timeZone = TestBed.inject(SessionTimeZoneService);
    timeZone.setManualTimeZone('America/Bogota');
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('asistenciasuco.session-timezone');
  });

  it('consulta por grupo en /api/v2 y no transforma una sesión indeterminada', () => {
    let result: any;
    service.getSessionsByGroup('grupo-1').subscribe((response) => (result = response));
    const request = http.expectOne(`${environment.apiV2Url}/sesiones/grupo/grupo-1`);
    expect(request.request.method).toBe('GET');
    request.flush({ exitoso: true, total: 2, datos: [
      {
        sesion: 'ses-1', grupo: 'grupo-1', nombre: 'Confirmada', numero: 1,
        codigo: 'S1', numeroSemana: 1, codigoGrupo: 'G1', nombreGrupo: 'Grupo',
        fechaHoraInicio: '2026-07-16T01:00:00Z', fechaHoraFin: '2026-07-16T03:00:00Z',
        estadoTemporal: 'CONFIRMADA', procedenciaTemporal: 'UTC_V2',
      },
      {
        sesion: 'ses-2', grupo: 'grupo-1', nombre: 'Histórica', numero: 2,
        codigo: 'S2', numeroSemana: 2, codigoGrupo: 'G1', nombreGrupo: 'Grupo',
        fechaHoraInicio: null, fechaHoraFin: null,
        estadoTemporal: 'INDETERMINADA', procedenciaTemporal: null,
      },
    ]});

    expect(result.datos[0]).toEqual(jasmine.objectContaining({
      date: '2026-07-15', startTime: '20:00', endTime: '22:00',
      fechaHoraInicio: '2026-07-16T01:00:00Z', estadoTemporal: 'CONFIRMADA',
    }));
    expect(result.datos[1]).toEqual(jasmine.objectContaining({
      date: '', startTime: '', endTime: '', estadoTemporal: 'INDETERMINADA',
      procedenciaTemporal: null,
    }));
  });

  it('envía POST UTC-D02 con offset explícito y sin campos extra', () => {
    service.createSession('grupo-1', {
      title: 'Sesión UTC', date: '2026-07-15', startTime: '20:00', endTime: '22:00',
    }).subscribe();
    const request = http.expectOne(`${environment.apiV2Url}/sesiones`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      grupo: 'grupo-1', nombre: 'Sesión UTC',
      fechaHoraInicio: '2026-07-15T20:00:00-05:00',
      fechaHoraFin: '2026-07-15T22:00:00-05:00',
    });
    request.flush({ exitoso: true, mensaje: 'creada' }, { status: 201, statusText: 'Created' });
  });

  it('PATCH conserva exactamente los instantes al editar solo el nombre', () => {
    const original = {
      id: 'ses-1', courseId: 'grupo-1', sessionNumber: 1,
      title: 'Anterior', date: '2026-07-15', startTime: '20:00', endTime: '22:00', records: [],
      fechaHoraInicio: '2026-07-16T01:00:00.1234567Z',
      fechaHoraFin: '2026-07-16T03:00:00.7654321Z',
      estadoTemporal: 'CONFIRMADA' as const, procedenciaTemporal: 'UTC_V2' as const,
    };
    service.updateSession('ses-1', {
      title: 'Nuevo nombre', date: '2026-07-15', startTime: '20:00', endTime: '22:00',
      originalSession: original,
    }).subscribe();
    const request = http.expectOne(`${environment.apiV2Url}/sesiones/ses-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      nombre: 'Nuevo nombre',
      fechaHoraInicio: '2026-07-16T01:00:00.1234567Z',
      fechaHoraFin: '2026-07-16T03:00:00.7654321Z',
    });
    request.flush({ exitoso: true, datos: null });
  });
});


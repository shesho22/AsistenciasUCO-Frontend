import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { SessionService } from './session.service';
import { environment } from '../../../environments/environment';

describe('SessionService', () => {
  let service: SessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SessionService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('USE_MOCKS');
  });

  it('consulta exclusivamente GET /sesiones/grupo/{grupo}', () => {
    let mappedSession:
      | {
          id: string;
          date: string;
          startTime: string;
          endTime: string;
        }
      | undefined;
    service
      .getSessionsByGroup('grupo-1')
      .subscribe((response) => (mappedSession = response.datos[0]));

    const request = http.expectOne(
      `${environment.apiUrl}/sesiones/grupo/grupo-1`
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      exitoso: true,
      total: 1,
      datos: [
        {
          sesion: 'ses-1',
          grupo: 'grupo-1',
          nombre: 'Sesión 1',
          numero: 1,
          codigo: 'S1',
          numeroSemana: 1,
          codigoGrupo: 'G1',
          nombreGrupo: 'Grupo 1',
          fechaHoraInicio: '2026-09-16T08:00:00',
          fechaHoraFin: '2026-09-16T10:00:00',
        },
      ],
    });

    expect(mappedSession).toEqual(
      jasmine.objectContaining({
        id: 'ses-1',
        date: '2026-09-16',
        startTime: '08:00',
        endTime: '10:00',
      })
    );
  });

  it('mapea LocalDateTime mediante strings sin construir Date', () => {
    const dateConstructor = spyOn(window, 'Date').and.callThrough();
    let mappedDate = '';

    service
      .getSessionsByGroup('grupo-1')
      .subscribe((response) => (mappedDate = response.datos[0].date));

    http.expectOne(`${environment.apiUrl}/sesiones/grupo/grupo-1`).flush({
      exitoso: true,
      total: 1,
      datos: [
        {
          sesion: 'ses-1',
          grupo: 'grupo-1',
          nombre: 'Sesión 1',
          numero: 1,
          codigo: 'S1',
          numeroSemana: 1,
          codigoGrupo: 'G1',
          nombreGrupo: 'Grupo 1',
          fechaHoraInicio: '2026-09-14T08:00:00',
          fechaHoraFin: '2026-09-14T09:30:00',
        },
      ],
    });

    expect(mappedDate).toBe('2026-09-14');
    expect(dateConstructor).not.toHaveBeenCalled();
  });

  it('propaga el error del GET sin invocar POST /sesiones/consultas', () => {
    let receivedError: unknown;
    service
      .getSessionsByGroup('grupo-1')
      .subscribe({ error: (error) => (receivedError = error) });

    http
      .expectOne(`${environment.apiUrl}/sesiones/grupo/grupo-1`)
      .flush('error', { status: 500, statusText: 'Server Error' });

    expect(receivedError).toBeTruthy();
    http.expectNone(`${environment.apiUrl}/sesiones/consultas`);
  });

  // --- LB-001B.1B: retiro de topic/room/tipo/status sintéticos (DB source of truth cleanup) ---

  it('mapea la respuesta real de /sesiones/grupo sin topic/room/tipo/status sintéticos', () => {
    let mapped: unknown;
    service
      .getSessionsByGroup('grupo-1')
      .subscribe((response) => (mapped = response.datos[0]));

    http.expectOne(`${environment.apiUrl}/sesiones/grupo/grupo-1`).flush({
      exitoso: true,
      total: 1,
      datos: [
        {
          sesion: 'ses-1',
          grupo: 'grupo-1',
          nombre: 'Sesión 1',
          numero: 1,
          codigo: 'S1',
          numeroSemana: 1,
          codigoGrupo: 'G1',
          nombreGrupo: 'Grupo 1',
          fechaHoraInicio: '2026-09-16T08:00:00',
          fechaHoraFin: '2026-09-16T10:00:00',
        },
      ],
    });

    // TARGET (PLAN.md LB-001B.1B, AS-IS #4): topic/status ya no se sintetizan en el mapeo real;
    // room/tipo nunca se asignaron en esta rama, se confirma que se mantienen ausentes.
    expect(mapped).not.toEqual(
      jasmine.objectContaining({ topic: jasmine.anything() })
    );
    expect((mapped as Record<string, unknown>)['status']).toBeUndefined();
    expect((mapped as Record<string, unknown>)['room']).toBeUndefined();
    expect((mapped as Record<string, unknown>)['tipo']).toBeUndefined();
  });

  it('los mocks de sesiones (rama useMocks) no inventan topic/room/tipo/status', fakeAsync(() => {
    localStorage.setItem('USE_MOCKS', 'true');
    let sessions: any[] = [];
    service
      .getSessionsByGroup('crs-1')
      .subscribe((response) => (sessions = response.datos));

    tick(200);

    expect(sessions.length).toBeGreaterThan(0);
    for (const session of sessions) {
      expect(session.topic).toBeUndefined();
      expect(session.room).toBeUndefined();
      expect(session.tipo).toBeUndefined();
      expect(session.status).toBeUndefined();
    }
  }));

  it('cancelarSesion (mock) no muta status ni prefija topic con [CANCELADA]', fakeAsync(() => {
    localStorage.setItem('USE_MOCKS', 'true');
    let sessionsAfterCancel: any[] = [];

    service.getSessionsByGroup('crs-1').subscribe((res) => {
      const sesionId = res.datos[0].id;
      service.cancelarSesion(sesionId, 'Fuerza mayor').subscribe(() => {
        service
          .getSessionsByGroup('crs-1')
          .subscribe((updated) => (sessionsAfterCancel = updated.datos));
      });
    });

    tick(200 + 250 + 200);

    expect(sessionsAfterCancel.length).toBeGreaterThan(0);
    for (const session of sessionsAfterCancel) {
      expect(session.status).toBeUndefined();
      expect(String(session.topic ?? '')).not.toContain('[CANCELADA]');
    }
  }));

  it('closeSession, cancelarSesion, getQrToken y registrarAutoAsistencia funcionan en modo HTTP', () => {
    service.closeSession('ses-1').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });
    const reqClose = http.expectOne(`${environment.apiUrl}/sesiones/cierres`);
    expect(reqClose.request.method).toBe('POST');
    reqClose.flush({ exitoso: true, datos: null });

    service.cancelarSesion('ses-1', 'Motivo fuerza mayor').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });
    const reqCancel = http.expectOne(`${environment.apiUrl}/docente/sesiones/ses-1/cancelar`);
    expect(reqCancel.request.method).toBe('PATCH');
    reqCancel.flush({ exitoso: true, datos: { id: 'ses-1' } });

    service.getQrToken('ses-1').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });
    const reqQr = http.expectOne(`${environment.apiUrl}/sesiones/ses-1/qr-token`);
    expect(reqQr.request.method).toBe('GET');
    reqQr.flush({ exitoso: true, datos: { token: 'tok-123' } });

    service.registrarAutoAsistencia({ token: 'tok-123' }).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });
    const reqAuto = http.expectOne(`${environment.apiUrl}/estudiante/asistencia-qr`);
    expect(reqAuto.request.method).toBe('POST');
    reqAuto.flush({ exitoso: true, datos: true });
  });
});

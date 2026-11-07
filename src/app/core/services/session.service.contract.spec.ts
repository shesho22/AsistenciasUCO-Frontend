import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SessionService } from './session.service';
import { SessionTimeZoneService } from './session-timezone.service';

describe('SessionService contract operations', () => {
  let service: SessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SessionService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionTimeZoneService).setManualTimeZone('UTC');
  });

  afterEach(() => http.verify());

  it('rechaza un instante RFC3339 que no cumple el formato explícito', () => {
    let receivedError: unknown;
    service.getSessionsByGroup('grupo-1').subscribe({
      error: (error) => (receivedError = error),
    });

    http.expectOne(`${environment.apiV2Url}/sesiones/grupo/grupo-1`).flush({
      exitoso: true,
      datos: [{
        sesion: 'ses-1',
        grupo: 'grupo-1',
        nombre: 'Sesión',
        numero: 1,
        estadoTemporal: 'CONFIRMADA',
        fechaHoraInicio: 'fecha-inválida',
        fechaHoraFin: '2026-09-22T10:00:00Z',
      }],
    });

    expect(receivedError).toEqual(jasmine.any(Error));
  });

  it('crea una sesión serializando instantes UTC y sin parámetros fantasma', () => {
    // TARGET (PLAN.md LB-001B.1B, AS-IS #5): createSession() deja de aceptar/enviar
    // topic/room/tipo — descripcion/aula/tipo eran ghost parameters que usp_crear_sesion
    // acepta y descarta (confirmado por el PLAN.md del backend LB-001B.1). El body real
    // enviado a POST /sesiones debe limitarse exactamente a los campos persistidos por el SP.
    let response: unknown;
    service.createSession('grupo-1', {
      title: 'Sesión local',
      date: '2026-09-22',
      startTime: '08:00',
      endTime: '10:00',
    } as any).subscribe((value) => (response = value));

    const request = http.expectOne(`${environment.apiV2Url}/sesiones`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      grupo: 'grupo-1',
      nombre: 'Sesión local',
      fechaHoraInicio: '2026-09-22T08:00:00Z',
      fechaHoraFin: '2026-09-22T10:00:00Z',
    });
    expect(request.request.body.descripcion).toBeUndefined();
    expect(request.request.body.aula).toBeUndefined();
    expect(request.request.body.tipo).toBeUndefined();
    request.flush({ exitoso: true, mensaje: 'creada' });
    expect(response).toEqual({ exitoso: true, mensaje: 'creada' });
  });

  it('actualiza una sesión con el payload HTTP exacto del backend, sin campos UI ni fantasma', () => {
    let response: any;
    service.updateSession('grupo-1', 'ses-1', {
      title: 'Sesión editada',
      date: '2026-09-23',
      startTime: '09:15',
      endTime: '11:45',
    })
      .subscribe((value) => (response = value));

    const request = http.expectOne(`${environment.apiV2Url}/sesiones/ses-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      nombre: 'Sesión editada',
      fechaHoraInicio: '2026-09-23T09:15:00Z',
      fechaHoraFin: '2026-09-23T11:45:00Z',
    });
    for (const ghostField of [
      'room',
      'aula',
      'topic',
      'descripcion',
      'tipo',
      'status',
      'title',
      'date',
      'startTime',
      'endTime',
    ]) {
      expect(request.request.body[ghostField]).toBeUndefined();
    }
    // BACKEND_GOLDEN_PATH_CONTRACT §C.8: ApiDataResponse<Void> = { exitoso: true, datos: null }.
    request.flush({ exitoso: true, datos: null });

    expect(response).toEqual({ exitoso: true, datos: null });
    expect(response.datos).toBeNull();
    expect('idTransaccion' in response).toBeFalse();
    expect('mensajeUsuario' in response).toBeFalse();
  });

  it('LB-001C.2B: PATCH /sesiones/{id} sin fallback PUT (ni en éxito ni en fallo)', () => {
    const isSessionPut = (r: { method: string; url: string }) =>
      r.method === 'PUT' && /\/sesiones\/[^/]+$/.test(r.url);
    const input = { title: 'Editada', date: '2026-09-23', startTime: '09:00', endTime: '11:00' };

    service.updateSession('grupo-1', 'ses-1', input).subscribe();
    http.expectOne((r) => r.method === 'PATCH' && r.url === `${environment.apiV2Url}/sesiones/ses-1`)
      .flush({ exitoso: true, datos: null });

    let failed = false;
    service.updateSession('grupo-1', 'ses-2', input).subscribe({ error: () => (failed = true) });
    http.expectOne((r) => r.method === 'PATCH' && r.url === `${environment.apiV2Url}/sesiones/ses-2`)
      .flush({ codigo: 'X' }, { status: 500, statusText: 'Server Error' });

    expect(failed).toBeTrue();
    expect(http.match(isSessionPut).length).toBe(0);
  });

  it('el tipo de updateSession es ApiDataResponse<null>, no ApiResponse<ClassSession>', () => {
    const observable = service.updateSession('grupo-1', 'ses-1', {
      title: 'x',
      date: '2026-09-23',
      startTime: '09:00',
      endTime: '10:00',
    });
    observable.subscribe((value) => {
      // Compila solo si `datos` es exactamente `null` (no una ClassSession).
      const datos: null = value.datos;
      expect(datos).toBeNull();
    });
    http.expectOne(`${environment.apiV2Url}/sesiones/ses-1`).flush({ exitoso: true, datos: null });
  });

  it('rechaza por diseño de tipos datos fantasma al actualizar sesión', () => {
    // @ts-expect-error room pertenece al contrato de Grupo/Course, no al input de actualizar Sesion.
    service.updateSession('grupo-1', 'ses-1', { room: 'B-202' });
    // @ts-expect-error topic/descripcion no forman parte del contrato persistido de Sesion.
    service.updateSession('grupo-1', 'ses-1', { topic: 'Tema libre' });
    // @ts-expect-error status no existe en el contrato backend de Sesion.
    service.updateSession('grupo-1', 'ses-1', { status: 'CONCLUIDA' });
    expect(service).toBeTruthy();
  });

  it('cierra la sesión con el endpoint contractual', () => {
    let response: any;
    service.closeSession('ses-1').subscribe((value) => (response = value));

    const request = http.expectOne(`${environment.apiUrl}/sesiones/cierres`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ sesion: 'ses-1' });
    request.flush({ exitoso: true });

    expect(response.mensajeUsuario).toContain('consolidada');
    expect(response.datos).toBeUndefined();
  });

  it('B1-F-01 cancela la sesión con PATCH {motivo} y devuelve la respuesta del backend sin transformarla', () => {
    let response: any;
    service.cancelarSesion('ses-1', 'Fuerza mayor del docente')
      .subscribe((value) => (response = value));

    const request = http.expectOne(
      `${environment.apiUrl}/docente/sesiones/ses-1/cancelar`
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ motivo: 'Fuerza mayor del docente' });
    const body = {
      exitoso: true,
      datos: {
        idSesion: 'ses-1',
        idGrupo: 'grp-1',
        estado: 'CANCELADA',
        cancelacion: {
          tipo: 'DOCENTE',
          motivo: 'Fuerza mayor del docente',
          nombreFestivo: null,
          fechaCancelacionUtc: '2026-11-10T14:00:00Z',
        },
        estudiantesNotificados: 38,
      },
    };
    request.flush(body);

    expect(response).toEqual(body);
  });

  it('B1-F-02 cancelarSesion usa HTTP aunque estén activos los mocks (ya no existe respuesta simulada)', () => {
    localStorage.setItem('USE_MOCKS', 'true');
    try {
      let response: any;
      service.cancelarSesion('ses-9', 'Motivo suficientemente largo').subscribe((value) => (response = value));
      http.expectOne(`${environment.apiUrl}/docente/sesiones/ses-9/cancelar`).flush({ exitoso: true, datos: {} });
      expect(response).toEqual({ exitoso: true, datos: {} });
    } finally {
      localStorage.removeItem('USE_MOCKS');
    }
  });

  for (const [status, code, message] of [
    [400, 'SES_013', 'El motivo de cancelación debe tener entre 10 y 500 caracteres.'],
    [409, 'SES_011', 'La sesión ya estaba cancelada.'],
    [409, 'SES_012', 'No es posible cancelar una sesión que ya tiene asistencia registrada.'],
    [409, 'SES_016', 'La sesión ya terminó y tiene asistencia registrada; no se puede cancelar.'],
  ] as const) {
    it(`B1-F-03 propaga el error ${status} ${code} con el mensaje del backend (sin traducirlo)`, () => {
      let error: any;
      service.cancelarSesion('ses-1', 'Motivo de prueba largo').subscribe({ error: (e) => (error = e) });

      http.expectOne(`${environment.apiUrl}/docente/sesiones/ses-1/cancelar`).flush(
        { timestamp: 't', status, error: 'x', code, message, path: '/p', correlationId: null },
        { status, statusText: 'x' }
      );

      expect(error.status).toBe(status);
      expect(error.error.message).toBe(message);
    });
  }

  it('B2-F-15 ya no expone getQrToken ni el auto-registro legado (el QR vive en tomas y asistencia-qr)', () => {
    expect((service as unknown as Record<string, unknown>)['getQrToken']).toBeUndefined();
    expect((service as unknown as Record<string, unknown>)['registrarAutoAsistencia']).toBeUndefined();
  });
});

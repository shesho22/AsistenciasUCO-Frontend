import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AttendanceService } from './attendance.service';
import { environment } from '../../../environments/environment';
import { RegistrarAsistenciasSesionRequest } from '../api/models/registrar-asistencias-sesion-request.model';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AttendanceService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AttendanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía exclusivamente el contrato batch canónico', () => {
    const payload: RegistrarAsistenciasSesionRequest = {
      sesionId: 'ses-1',
      registros: [{ estudianteId: 'est-1', estado: 'EX' }],
    };

    service.saveBatchAttendance(payload).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/asistencias/lote`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body.grupoId).toBeUndefined();
    expect(request.request.body.registros[0].studentId).toBeUndefined();
    expect(request.request.body.registros[0].status).toBeUndefined();
    expect(request.request.body.registros[0].notes).toBeUndefined();
    expect(request.request.body.registros[0].observaciones).toBeUndefined();
    request.flush({ exitoso: true, mensaje: 'ok' });
  });

  it('consulta asistencias de un grupo sin sesionId', () => {
    service.getAttendancesByGroup('grupo-1').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/grupos/grupo-1/asistencias`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [] });
  });

  it('consulta asistencias de un grupo filtradas por sesionId', () => {
    service.getAttendancesByGroup('grupo-1', 'sesion-456').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/grupos/grupo-1/asistencias?sesionId=sesion-456`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [] });
  });

  it('solicita revisión de asistencia con justificación válida', () => {
    service
      .requestAttendanceRevision({
        sesionId: 'ses-1',
        categoria: 'Médico / Salud',
        justificacion: 'Estuve en cita médica certificada',
      })
      .subscribe();

    const req = http.expectOne(`${environment.apiUrl}/asistencias/revisiones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.justificacion).toBe('Estuve en cita médica certificada');
    req.flush({ exitoso: true, mensajeUsuario: 'Solicitud enviada' });
  });

  it('rechaza revisión si la justificación tiene menos de 5 caracteres', () => {
    let error: any;
    service
      .requestAttendanceRevision({
        sesionId: 'ses-1',
        categoria: 'Médico / Salud',
        justificacion: 'hola',
      })
      .subscribe({ error: (err) => (error = err) });

    expect(error?.message).toContain('entre 5 y 500 caracteres');
    http.expectNone(`${environment.apiUrl}/asistencias/revisiones`);
  });
});


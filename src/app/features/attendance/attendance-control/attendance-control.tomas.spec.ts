import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherAttendanceSummaryService } from '../../../core/services/teacher-attendance-summary.service';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { AttendanceService } from '../../../core/services/attendance.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { CourseService } from '../../../core/services/course.service';
import { GroupService } from '../../../core/services/group.service';
import { SessionService } from '../../../core/services/session.service';
import { StudentService } from '../../../core/services/student.service';
import { StudentRegistrationConfigService } from '../../../core/services/student-registration-config.service';
import { EmailVerificationService } from '../../../core/services/email-verification.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { TomaAsistenciaService } from '../../../core/services/toma-asistencia.service';
import { AsistenciaQrService } from '../../../core/services/asistencia-qr.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { ATTENDANCE_NOW } from '../../../core/utils/attendance-now.token';
import { TomaAsistencia, TomasSesion } from '../../../core/models/toma-asistencia.model';
import { QrToma } from '../../../core/models/asistencia-qr.model';
import { apiHttpError } from '../../../core/testing/api-error.fixture';
import { AttendanceControlComponent } from './attendance-control.component';
import { AttendanceRealtimeSyncService } from './attendance-realtime-sync.service';
import { SessionTomasPanelComponent } from './components/session-tomas-panel.component';
import { TomaQrProyeccionComponent } from './components/toma-qr-proyeccion.component';
import { TomaFaltantesComponent } from './components/toma-faltantes.component';

function toma(parcial: Partial<TomaAsistencia> = {}): TomaAsistencia {
  return {
    idToma: 'toma-1', idSesion: 'session-1', idGrupo: 'group-1', numero: 1, modo: 'MANUAL', estado: 'ABIERTA',
    esImplicita: false, fechaAperturaUtc: '2026-11-03T13:00:00Z', fechaCierreUtc: null, horasToma: 1,
    totalRegistros: 0, totalPresentes: 0, totalAusentes: 0, totalExcusas: 0, tieneQrActivo: false, ...parcial,
  };
}

function tomasSesion(tomas: TomaAsistencia[], abierta = true): TomasSesion {
  return {
    idSesion: 'session-1', estado: 'PROGRAMADA', cancelacion: null,
    ventana: { aperturaUtc: '2026-11-03T12:50:00Z', cierreUtc: '2026-11-03T15:15:00Z', abierta },
    horasSesion: 2, maximoTomas: 4, tomas,
  };
}

const qr: QrToma = {
  idToma: 'toma-1', idSesion: 'session-1', idGrupo: 'group-1', pin: '482913', urlAsistencia: 'https://x/app/asistencia/qr?t=T',
  qrPngBase64: 'AAAA', fechaRotacionUtc: '2026-11-03T14:00:00Z', fechaExpiracionUtc: '2026-11-03T15:15:00Z', rotacionSegundos: 60,
};

describe('AttendanceControlComponent tomas (CULM-001 B.2)', () => {
  let fixture: ComponentFixture<AttendanceControlComponent>;
  let attendanceService: jasmine.SpyObj<AttendanceService>;
  let tomaService: jasmine.SpyObj<TomaAsistenciaService>;
  let qrService: jasmine.SpyObj<AsistenciaQrService>;
  let tomasEvents$: Subject<unknown>;
  let nowMs: number;

  const course = {
    id: 'group-1', code: 'MAT-1', name: 'Materia', section: '1', schedule: 'Lunes', room: 'Aula 1',
    enrolledStudentsCount: 1, docenteName: 'Docente', colorCategory: 'emerald',
  };
  const session = {
    id: 'session-1', courseId: 'group-1', sessionNumber: 1, title: 'Sesión', date: '2026-11-03',
    startTime: '08:00', endTime: '10:00', records: [], estadoTemporal: 'CONFIRMADA', procedenciaTemporal: 'UTC_V2',
    fechaHoraInicio: '2026-11-03T13:00:00Z', fechaHoraFin: '2026-11-03T15:00:00Z',
  };

  beforeEach(() => {
    localStorage.setItem('USE_MOCKS', 'false');
    nowMs = Date.parse('2026-11-03T14:00:00Z');
    tomasEvents$ = new Subject<unknown>();
    const courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getCurrentTeacherCourses']);
    const sessionService = jasmine.createSpyObj('SessionService', ['getSessionsByGroup', 'createSession']);
    const groupService = jasmine.createSpyObj('GroupService', ['getStudentsByGroup']);
    attendanceService = jasmine.createSpyObj('AttendanceService', ['getAttendancesByGroup', 'saveBatchAttendance']);
    tomaService = jasmine.createSpyObj('TomaAsistenciaService', [
      'abrirToma', 'consultarTomas', 'cerrarToma', 'registrarAsistencias', 'consultarFaltantes',
    ]);
    qrService = jasmine.createSpyObj('AsistenciaQrService', ['abrirQr', 'rotarQr', 'cerrarQr']);
    const realtime = jasmine.createSpyObj<AttendanceRealtimeSyncService>('AttendanceRealtimeSyncService', [
      'watch', 'watchCancelaciones', 'watchTomas', 'connectionAlerts', 'connectGroup', 'disconnect',
    ]);
    const claims = jasmine.createSpyObj<AttendanceClaimService>('AttendanceClaimService', [
      'getReclamosDocente', 'getReclamosDocentePorGrupo', 'resolverReclamo',
    ]);

    courseService.getCurrentTeacherCourses.and.returnValue(of({ exitoso: true, datos: [course] } as any));
    sessionService.getSessionsByGroup.and.returnValue(of({ exitoso: true, datos: [session], total: 1 } as any));
    groupService.getStudentsByGroup.and.returnValue(of({
      exitoso: true, total: 1,
      datos: [{ id: 'm-1', idEstudiante: 'student-1', documento: '1', nombreCompleto: 'Ada', correo: 'a@x.test', codigoEstado: 'A', nombreEstado: 'Activo' }],
    }));
    attendanceService.getAttendancesByGroup.and.returnValue(of({ exitoso: true, datos: [], total: 0 }));
    attendanceService.saveBatchAttendance.and.returnValue(of({ exitoso: true, mensaje: 'Guardada' }));
    tomaService.consultarTomas.and.returnValue(of({ exitoso: true, datos: tomasSesion([]) }));
    tomaService.consultarFaltantes.and.returnValue(of({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 50, totalElementos: 0, totalPaginas: 0 }));
    realtime.watch.and.returnValue(NEVER);
    (realtime as never as { watchCancelaciones: jasmine.Spy }).watchCancelaciones.and.returnValue(NEVER);
    (realtime as never as { watchTomas: jasmine.Spy }).watchTomas.and.returnValue(tomasEvents$.asObservable());
    realtime.connectionAlerts.and.returnValue(NEVER);
    claims.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: [] }) as any);
    claims.getReclamosDocentePorGrupo.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [AttendanceControlComponent],
      providers: [
        { provide: CourseService, useValue: courseService },
        { provide: SessionService, useValue: sessionService },
        { provide: GroupService, useValue: groupService },
        { provide: StudentService, useValue: jasmine.createSpyObj('StudentService', ['enrollStudentInGroup']) },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: AttendanceClaimService, useValue: claims },
        { provide: CatalogService, useValue: { getIdentityDocumentTypes: () => of([]) } },
        { provide: AttendanceRealtimeSyncService, useValue: realtime },
        { provide: StudentRegistrationConfigService, useValue: { getEmailDomain: () => of('') } },
        { provide: EmailVerificationService, useValue: { resendVerification: () => NEVER } },
        { provide: TomaAsistenciaService, useValue: tomaService },
        { provide: TeacherAttendanceSummaryService, useValue: { consultarResumen: () => NEVER } },
        { provide: AsistenciaQrService, useValue: qrService },
        { provide: RealtimeService, useValue: { startForGroup: () => undefined, listenType: () => NEVER, connectionState$: NEVER } },
        { provide: ATTENDANCE_NOW, useValue: () => nowMs },
      ],
    });
  });

  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem('USE_MOCKS');
  });

  function entrar(): AttendanceControlComponent {
    fixture = TestBed.createComponent(AttendanceControlComponent);
    fixture.detectChanges();
    fixture.componentInstance.onSessionSelect('session-1');
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const hijo = <T>(tipo: new (...a: never[]) => T): T | null =>
    (fixture.debugElement.query((el) => el.componentInstance instanceof tipo)?.componentInstance as T) ?? null;

  it('B2-F-09 al entrar a la sesion consulta sus tomas y muestra el panel', () => {
    entrar();
    expect(tomaService.consultarTomas).toHaveBeenCalledWith('session-1');
    expect(hijo(SessionTomasPanelComponent)).not.toBeNull();
  });

  it('B2-F-09 elegir modo Manual abre la toma MANUAL sin pedir QR', () => {
    const c = entrar();
    tomaService.abrirToma.and.returnValue(of({ exitoso: true, datos: toma() }));
    c.abrirSelectorModo();
    c.onModoElegido('MANUAL');
    expect(tomaService.abrirToma).toHaveBeenCalledOnceWith('session-1', 'MANUAL');
    expect(qrService.abrirQr).not.toHaveBeenCalled();
  });

  it('B2-F-09 elegir modo QR abre la toma, pide el QR y muestra la proyeccion', () => {
    const c = entrar();
    tomaService.abrirToma.and.returnValue(of({ exitoso: true, datos: toma({ modo: 'QR' }) }));
    qrService.abrirQr.and.returnValue(of({ exitoso: true, datos: qr }));
    c.onModoElegido('QR');
    fixture.detectChanges();
    expect(qrService.abrirQr).toHaveBeenCalledOnceWith('toma-1');
    expect(hijo(TomaQrProyeccionComponent)).not.toBeNull();
  });

  it('B2-F-09 si abrir la toma falla muestra el mensaje del backend y no pide QR', () => {
    const c = entrar();
    tomaService.abrirToma.and.returnValue(throwError(() => apiHttpError(409, 'Ya hay una toma abierta.', 'TOM_003')));
    c.onModoElegido('QR');
    expect(c.toastMessage()).toBe('Ya hay una toma abierta.');
    expect(qrService.abrirQr).not.toHaveBeenCalled();
  });

  it('B2-F-10 con una toma abierta, guardar envia el lote a /tomas/{id}/asistencias y no al lote legado', () => {
    tomaService.consultarTomas.and.returnValue(of({ exitoso: true, datos: tomasSesion([toma()]) }));
    tomaService.registrarAsistencias.and.returnValue(of({ exitoso: true, datos: { idToma: 'toma-1', idSesion: 'session-1', totalRegistros: 1 } }));
    const c = entrar();
    c.markAllPresent();
    c.saveAttendance();
    expect(tomaService.registrarAsistencias).toHaveBeenCalledOnceWith('toma-1', [{ estudianteId: 'student-1', estado: 'AN' }]);
    expect(attendanceService.saveBatchAttendance).not.toHaveBeenCalled();
  });

  it('B2-F-10 sin toma abierta conserva el lote legado de la sesion', () => {
    const c = entrar();
    c.markAllPresent();
    c.saveAttendance();
    expect(attendanceService.saveBatchAttendance).toHaveBeenCalled();
    expect(tomaService.registrarAsistencias).not.toHaveBeenCalled();
  });

  it('B2-F-10 la ventana la decide el backend: ventana.abierta=false cierra la toma aunque el reloj local la vea abierta', () => {
    tomaService.consultarTomas.and.returnValue(of({ exitoso: true, datos: tomasSesion([], false) }));
    const c = entrar();
    expect(c.attendanceWindowState()).not.toBe('ABIERTA');
  });

  it('B2-F-11 cerrar la toma pide confirmacion, envia marcarAusentes=true y muestra los faltantes', () => {
    tomaService.consultarTomas.and.returnValue(of({ exitoso: true, datos: tomasSesion([toma()]) }));
    tomaService.cerrarToma.and.returnValue(of({
      exitoso: true,
      datos: { toma: toma({ estado: 'CERRADA' }), totalAusentesMarcados: 1, totalFaltantes: 1, yaEstabaCerrada: false },
    }));
    const c = entrar();
    c.solicitarCierreToma();
    expect(tomaService.cerrarToma).not.toHaveBeenCalled();
    c.confirmarCierreToma(true);
    fixture.detectChanges();
    expect(tomaService.cerrarToma).toHaveBeenCalledOnceWith('toma-1', true);
    expect(hijo(TomaFaltantesComponent)).not.toBeNull();
  });

  it('B2-F-12 los eventos TOMA_* del grupo recargan las tomas', () => {
    entrar();
    tomaService.consultarTomas.calls.reset();
    tomasEvents$.next({});
    expect(tomaService.consultarTomas).toHaveBeenCalledWith('session-1');
  });

  it('B2-F-13 el componente no usa setInterval', () => {
    tomaService.abrirToma.and.returnValue(of({ exitoso: true, datos: toma() }));
    const intervalo = spyOn(window, 'setInterval').and.callThrough();
    const c = entrar();
    c.onModoElegido('MANUAL');
    expect(intervalo).not.toHaveBeenCalled();
  });
});

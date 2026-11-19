import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherMatrizAsistenciaService } from '../../../core/services/teacher-matriz-asistencia.service';
import { resumenSesiones } from '../../../core/testing/resumen-sesiones-grupo.fixture';
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

function toma(parcial: Partial<TomaAsistencia> = {}): TomaAsistencia {
  return {
    idToma: 'toma-1', idSesion: 'session-1', idGrupo: 'group-1', numero: 1, modo: 'MANUAL', estado: 'ABIERTA',
    esImplicita: false, fechaAperturaUtc: '2026-11-03T13:00:00Z', fechaCierreUtc: null, horasToma: 1,
    fechaPuntoControlUtc: '2026-11-10T13:00:00Z', ordenPuntoControl: 1, minutosTramoAnterior: 0, minutosTramoSiguiente: 60, esEditable: true, editableHastaUtc: null,
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
      'abrirToma', 'consultarTomas', 'cerrarToma', 'registrarAsistencias', 'consultarFaltantes', 'consultarAsistencias',
    ]);
    qrService = jasmine.createSpyObj('AsistenciaQrService', ['abrirQr', 'rotarQr', 'cerrarQr']);
    const realtime = jasmine.createSpyObj<AttendanceRealtimeSyncService>('AttendanceRealtimeSyncService', [
      'watch', 'watchCancelaciones', 'watchTomas', 'connectionAlerts', 'connectGroup', 'disconnect',
    ]);
    const claims = jasmine.createSpyObj<AttendanceClaimService>('AttendanceClaimService', [
      'getReclamosDocente', 'getReclamosDocentePorGrupo', 'resolverReclamo',
    ]);

    courseService.getCurrentTeacherCourses.and.returnValue(of<never>({ exitoso: true, datos: [course] } as never));
    sessionService.getSessionsByGroup.and.returnValue(of({ exitoso: true, datos: [session], total: 1 } as never));
    groupService.getStudentsByGroup.and.returnValue(of({
      exitoso: true, total: 1,
      datos: [{ id: 'm-1', idEstudiante: 'student-1', documento: '1', nombreCompleto: 'Ada', correo: 'a@x.test', codigoEstado: 'A', nombreEstado: 'Activo' }],
    }));
    attendanceService.getAttendancesByGroup.and.returnValue(of({ exitoso: true, datos: [], total: 0 }));
    attendanceService.saveBatchAttendance.and.returnValue(of({ exitoso: true, mensaje: 'Guardada' }));
    tomaService.consultarTomas.and.returnValue(of({ exitoso: true, datos: tomasSesion([]) }));
    tomaService.consultarFaltantes.and.returnValue(of({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 50, totalElementos: 0, totalPaginas: 0 }));
    tomaService.consultarAsistencias.and.returnValue(of({
      exitoso: true,
      elementos: [{ estudianteId: 'student-1', nombreCompleto: 'Ada', estado: null, registradoPorEstudiante: false, fechaRegistroUtc: null }],
      numeroPagina: 1, tamanoPagina: 100, totalElementos: 1, totalPaginas: 1,
    }));
    realtime.watch.and.returnValue(NEVER);
    (realtime as never as { watchCancelaciones: jasmine.Spy }).watchCancelaciones.and.returnValue(NEVER);
    (realtime as never as { watchTomas: jasmine.Spy }).watchTomas.and.returnValue(tomasEvents$.asObservable());
    realtime.connectionAlerts.and.returnValue(NEVER);
    claims.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: [] }) as never);
    claims.getReclamosDocentePorGrupo.and.returnValue(of({ exitoso: true, datos: [], total: 0 }));

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
        { provide: TeacherMatrizAsistenciaService, useValue: { consultarResumenSesiones: () => NEVER } },
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

  it('ATA D9 si el servidor cerro la toma anterior, el aviso dice cuantos ausentes se marcaron y la toma nueva', () => {
    const c = entrar();
    tomaService.abrirToma.and.returnValue(of({
      exitoso: true,
      datos: toma({ numero: 3, tomaCerradaAnterior: { idToma: 'toma-prev', numero: 2, totalAusentesMarcados: 5 } }),
    }));
    c.onModoElegido('MANUAL');
    expect(c.toastType()).toBe('success');
    expect(c.toastMessage()).toBe('Se cerró la toma 2 (5 ausentes) y se abrió la toma 3.');
    expect(c.showToast()).toBeTrue();
  });

  it('ATA D9 con un solo ausente marcado usa el singular', () => {
    const c = entrar();
    tomaService.abrirToma.and.returnValue(of({
      exitoso: true,
      datos: toma({ numero: 2, tomaCerradaAnterior: { idToma: 'toma-prev', numero: 1, totalAusentesMarcados: 1 } }),
    }));
    c.onModoElegido('MANUAL');
    expect(c.toastMessage()).toBe('Se cerró la toma 1 (1 ausente) y se abrió la toma 2.');
  });

  it('ATA D9 sin toma cerrada anterior (null o ausente) el aviso es el de apertura normal', () => {
    const c = entrar();
    tomaService.abrirToma.and.returnValue(of({ exitoso: true, datos: toma({ numero: 1, tomaCerradaAnterior: null }) }));
    c.onModoElegido('MANUAL');
    expect(c.toastMessage()).toBe('Se abrió la toma 1.');
    tomaService.abrirToma.and.returnValue(of({ exitoso: true, datos: toma({ numero: 2 }) }));
    c.onModoElegido('MANUAL');
    expect(c.toastMessage()).toBe('Se abrió la toma 2.');
    expect(c.toastType()).toBe('success');
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

  it('VAL PRU-11 si el backend rechaza la toma 21 (TOM_004, tope alcanzado) muestra su mensaje y no pide QR', () => {
    const c = entrar();
    const mensaje = 'Se alcanzó el máximo de tomas permitidas para esta sesión.';
    tomaService.abrirToma.and.returnValue(throwError(() => apiHttpError(409, mensaje, 'TOM_004')));
    c.onModoElegido('QR');
    expect(c.toastMessage()).toBe(mensaje);
    expect(qrService.abrirQr).not.toHaveBeenCalled();
  });

  it('B2-F-10 con una toma abierta la lista y el Guardar viven en la toma; guardar envia el lote a /tomas/{id}/asistencias y no al lote legado', () => {
    tomaService.consultarTomas.and.returnValue(of({ exitoso: true, datos: tomasSesion([toma()]) }));
    tomaService.registrarAsistencias.and.returnValue(of({ exitoso: true, datos: { idToma: 'toma-1', idSesion: 'session-1', totalRegistros: 1 } }));
    entrar();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-attendance-control-table')).toBeNull();
    (el.querySelector('[data-testid="marcar-todos-presentes"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const guardar = el.querySelector('[data-testid="guardar-toma"]') as HTMLButtonElement;
    expect(guardar.disabled).toBeFalse();
    guardar.click();
    expect(tomaService.registrarAsistencias).toHaveBeenCalledOnceWith('toma-1', [{ estudianteId: 'student-1', estado: 'AN' }]);
    expect(attendanceService.saveBatchAttendance).not.toHaveBeenCalled();
  });

  it('UX-toma las notificaciones de la toma se muestran como aviso con el mensaje del backend', () => {
    tomaService.consultarTomas.and.returnValue(of({ exitoso: true, datos: tomasSesion([toma()]) }));
    tomaService.registrarAsistencias.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Asistencia de la toma guardada.', datos: { idToma: 'toma-1', idSesion: 'session-1', totalRegistros: 1 } }));
    const c = entrar();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('[data-testid="marcar-todos-presentes"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('[data-testid="guardar-toma"]') as HTMLButtonElement).click();
    expect(c.toastMessage()).toBe('Asistencia de la toma guardada.');
    expect(c.toastType()).toBe('success');
  });

  it('UX-toma con tomas el encabezado ya no ofrece el marcado masivo de la sesion', () => {
    tomaService.consultarTomas.and.returnValue(of({ exitoso: true, datos: tomasSesion([toma()]) }));
    entrar();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Todos Presentes');
  });

  it('UX-toma sin tomas el encabezado conserva el marcado masivo del lote de la sesion', () => {
    entrar();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Todos Presentes');
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

  it('B2-F-11 cerrar la toma pide confirmacion, envia marcarAusentes=true y marca en la lista unica a los pendientes de validar', () => {
    let cerrada = false;
    tomaService.consultarTomas.and.callFake(() => of({
      exitoso: true,
      datos: tomasSesion([cerrada ? toma({ estado: 'CERRADA', fechaCierreUtc: '2026-11-03T14:30:00Z' }) : toma()]),
    }));
    tomaService.cerrarToma.and.callFake(() => {
      cerrada = true;
      return of({
        exitoso: true,
        datos: { toma: toma({ estado: 'CERRADA' }), totalAusentesMarcados: 1, totalFaltantes: 1, yaEstabaCerrada: false },
      });
    });
    const c = entrar();
    c.solicitarCierreToma();
    expect(tomaService.cerrarToma).not.toHaveBeenCalled();
    c.confirmarCierreToma(true);
    fixture.detectChanges();
    expect(tomaService.cerrarToma).toHaveBeenCalledOnceWith('toma-1', true);
    expect(tomaService.consultarFaltantes).toHaveBeenCalledWith('toma-1', 1, jasmine.any(Number));
  });

  it('B2-F-12 los eventos TOMA_* del grupo recargan las tomas', () => {
    entrar();
    tomaService.consultarTomas.calls.reset();
    tomasEvents$.next({});
    expect(tomaService.consultarTomas).toHaveBeenCalledWith('session-1');
  });

  it('CIERRE-W3M el resumen de sesiones del grupo lo calcula el servidor y se pide una vez al elegir el grupo', () => {
    const servicio = TestBed.inject(TeacherMatrizAsistenciaService) as unknown as { consultarResumenSesiones: jasmine.Spy };
    const resumen = resumenSesiones({ sesionesProgramadas: 4, estudiantesEnRiesgo: 2, promedioAsistencia: 91 });
    servicio.consultarResumenSesiones = jasmine.createSpy('consultarResumenSesiones').and.returnValue(of({ exitoso: true, datos: resumen }));
    const c = entrar();
    expect(servicio.consultarResumenSesiones.calls.allArgs()).toEqual([['group-1']]);
    expect(c.resumenSesiones()).toEqual(resumen);
  });

  it('B2-F-13 el componente no usa setInterval', () => {
    tomaService.abrirToma.and.returnValue(of({ exitoso: true, datos: toma() }));
    const intervalo = spyOn(window, 'setInterval').and.callThrough();
    const c = entrar();
    c.onModoElegido('MANUAL');
    expect(intervalo).not.toHaveBeenCalled();
  });
});

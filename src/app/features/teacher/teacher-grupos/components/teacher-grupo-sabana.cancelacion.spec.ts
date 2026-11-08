import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { TeacherGrupoSabanaComponent } from './teacher-grupo-sabana.component';
import { TeacherAttendanceSummaryService } from '../../../../core/services/teacher-attendance-summary.service';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { RealtimeConnectionState } from '../../../../core/realtime/model/realtime-connection-state.model';
import { RealtimeEvent, REALTIME_EVENT_TYPE } from '../../../../core/realtime/model/realtime-event.model';
import { ResumenAsistenciaEstudiante } from '../../../../core/models/indicadores-asistencia.model';
import { ClassSession } from '../../../../core/models/attendance.model';

describe('TeacherGrupoSabanaComponent — Cancelación por inasistencia y recarga SSE (CULM-001 C.1 §4.1, §4.4, §4.8)', () => {
  let fixture: ComponentFixture<TeacherGrupoSabanaComponent>;
  let summaryServiceSpy: jasmine.SpyObj<TeacherAttendanceSummaryService>;
  let realtimeSpy: jasmine.SpyObj<RealtimeService>;
  let connectionState$: Subject<RealtimeConnectionState>;
  let events$: Subject<RealtimeEvent>;

  const mockResumen: ResumenAsistenciaEstudiante = {
    estudianteId: 'st-1',
    nombreCompleto: 'Estudiante Alfa',
    codigoEstadoEstudiante: 'A',
    sesionesEjecutadas: 10,
    horasDictadas: 20,
    horasAsistidas: 15,
    horasFalta: 5,
    horasExcusa: 0,
    horasSinRegistro: 0,
    porcentajeInasistencia: 25,
    porcentajeAsistencia: 75,
    codigoPermanencia: 'PERDIDA',
    umbralAdvertencia: 15,
    umbralPerdida: 20,
    marca: {
      advertenciaVigente: false,
      fechaAdvertenciaUtc: null,
      perdidaVigente: true,
      fechaPerdidaUtc: '2026-11-08T10:00:00Z',
      revision: {
        id: 'rev-1',
        estado: 'PENDIENTE_DOCENTE',
        nombreEstado: 'Pendiente de decisión',
        requiereAccionDocente: true,
        perfilResolutorActual: null,
        accionesPermitidas: ['MANTENER', 'PROPONER'],
      },
    },
  };

  const sesion: ClassSession = {
    id: 'ses-1',
    courseId: 'grp-1',
    sessionNumber: 1,
    title: 'S1',
    date: '2026-09-14',
    startTime: '08:00',
    endTime: '10:00',
    records: [],
  };

  beforeEach(() => {
    connectionState$ = new Subject<RealtimeConnectionState>();
    events$ = new Subject<RealtimeEvent>();

    summaryServiceSpy = jasmine.createSpyObj('TeacherAttendanceSummaryService', ['consultarResumen']);
    summaryServiceSpy.consultarResumen.and.returnValue(
      of({
        exitoso: true,
        elementos: [mockResumen],
        numeroPagina: 1,
        tamanoPagina: 50,
        totalElementos: 1,
        totalPaginas: 1,
      })
    );

    realtimeSpy = jasmine.createSpyObj('RealtimeService', ['startForGroup', 'stop', 'events', 'listenType'], {
      connectionState$: connectionState$.asObservable(),
    });
    realtimeSpy.events.and.returnValue(events$.asObservable());
    realtimeSpy.listenType.and.returnValue(events$.asObservable());

    TestBed.configureTestingModule({
      imports: [TeacherGrupoSabanaComponent],
      providers: [
        { provide: TeacherAttendanceSummaryService, useValue: summaryServiceSpy },
        { provide: RealtimeService, useValue: realtimeSpy },
      ],
    });

    fixture = TestBed.createComponent(TeacherGrupoSabanaComponent);
    fixture.componentRef.setInput('grupoId', 'grp-1');
    fixture.componentRef.setInput('estudiantes', [
      { studentId: 'st-1', studentName: 'Estudiante Alfa', studentCode: '001' },
    ]);
    fixture.componentRef.setInput('sessions', [sesion]);
    fixture.componentRef.setInput('cargando', false);
    fixture.detectChanges();
  });

  it('C-F-31 renderiza la columna Seguimiento con InasistenciaMarcaBadgeComponent', () => {
    const thSeguimiento = fixture.nativeElement.querySelector('th[data-testid="col-seguimiento"]') as HTMLElement;
    expect(thSeguimiento).toBeTruthy();
    expect(thSeguimiento.textContent).toContain('Seguimiento');

    const badge = fixture.nativeElement.querySelector('[data-testid="marca-inasistencia"]') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Pérdida: decide');
  });

  it('C-F-32 renderiza el botón "Decidir" cuando accionesPermitidas tiene opciones y abre el modal', () => {
    const btnDecidir = fixture.nativeElement.querySelector('[data-testid="btn-decidir-st-1"]') as HTMLButtonElement;
    expect(btnDecidir).toBeTruthy();
    expect(btnDecidir.textContent).toContain('Decidir');

    btnDecidir.click();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('app-revision-decision-modal');
    expect(modal).toBeTruthy();
  });

  it('C-F-33 regla de recarga SSE: exactamente 3 cargas con CONNECTING -> CONNECTED -> RECONNECTING -> CONNECTED + evento', () => {
    // 1. Carga inicial al entrar ya ocurrió en ngOnInit / constructor
    expect(summaryServiceSpy.consultarResumen).toHaveBeenCalledTimes(1);

    // 2. Primera conexión: no debe recargar
    connectionState$.next('CONNECTING');
    connectionState$.next('CONNECTED');
    expect(summaryServiceSpy.consultarResumen).toHaveBeenCalledTimes(1);

    // 3. Reconexión: RECONNECTING seguido de CONNECTED -> debe recargar (Carga 2)
    connectionState$.next('RECONNECTING');
    connectionState$.next('CONNECTED');
    expect(summaryServiceSpy.consultarResumen).toHaveBeenCalledTimes(2);

    // 4. Evento de tiempo real de grupo (ALERTA_INASISTENCIA) -> debe recargar (Carga 3)
    events$.next({
      eventId: 'evt-1',
      type: REALTIME_EVENT_TYPE.ALERTA_INASISTENCIA,
      occurredAt: '2026-11-08T10:00:00Z',
      correlationId: null,
      payload: { grupo: 'grp-1', alerta: 'alt-1', estudianteGrupo: 'eg-1', tipo: 'ADVERTENCIA', porcentajeInasistencia: 16, umbral: 15 },
    });
    expect(summaryServiceSpy.consultarResumen).toHaveBeenCalledTimes(3);
  });

  it('C-F-34 regla de recarga SSE: exactamente 1 carga cuando ocurre CONNECTING -> ERROR', () => {
    expect(summaryServiceSpy.consultarResumen).toHaveBeenCalledTimes(1);

    connectionState$.next('CONNECTING');
    connectionState$.next('ERROR');

    // No debe recargar, se mantiene solo la carga inicial
    expect(summaryServiceSpy.consultarResumen).toHaveBeenCalledTimes(1);
  });

  it('C-F-35 no utiliza setInterval ni polling recurrente', () => {
    const intervalSpy = spyOn(window, 'setInterval');
    fixture.detectChanges();
    expect(intervalSpy).not.toHaveBeenCalled();
  });
});

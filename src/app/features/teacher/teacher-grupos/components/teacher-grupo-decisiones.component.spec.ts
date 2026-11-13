import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject, of, throwError } from 'rxjs';
import { TeacherGrupoDecisionesComponent } from './teacher-grupo-decisiones.component';
import { RevisionCancelacionService } from '../../../../core/services/revision-cancelacion.service';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { RealtimeEvent } from '../../../../core/realtime/model/realtime-event.model';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { RevisionCancelacion } from '../../../../core/models/revision-cancelacion.model';
import { apiHttpError } from '../../../../core/testing/api-error.fixture';
import { environment } from '../../../../../environments/environment';

describe('TeacherGrupoDecisionesComponent', () => {
  let fixture: ComponentFixture<TeacherGrupoDecisionesComponent>;
  let servicio: jasmine.SpyObj<RevisionCancelacionService>;
  let realtime: jasmine.SpyObj<RealtimeService>;
  let toast: jasmine.SpyObj<ToastService>;
  let eventos$: Subject<RealtimeEvent>;

  const revision: RevisionCancelacion = {
    id: 'rev-1',
    estado: 'PENDIENTE_DOCENTE',
    estudiante: { id: 'e1', nombreCompleto: 'Ana Pérez' },
    numeroIdentificacionEstudiante: '1020304050',
    porcentajeActual: 22.5,
    umbralPerdida: 20,
    fechaCreacionUtc: '2026-11-08T10:00:00Z',
    accionesPermitidas: ['MANTENER', 'PROPONER'],
  };
  const pagina = (items: RevisionCancelacion[]) => ({
    exitoso: true,
    elementos: items,
    numeroPagina: 1,
    tamanoPagina: 50,
    totalElementos: items.length,
    totalPaginas: 1,
  });
  const evento = (type: string): RealtimeEvent => ({
    eventId: 'ev', type, occurredAt: '2026-11-09T10:00:00Z', correlationId: null, payload: {},
  });

  function crear(grupoId = 'g1', mostrarVacio = false): void {
    fixture = TestBed.createComponent(TeacherGrupoDecisionesComponent);
    fixture.componentRef.setInput('grupoId', grupoId);
    fixture.componentRef.setInput('mostrarVacio', mostrarVacio);
    fixture.detectChanges();
    fixture.detectChanges();
  }
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    eventos$ = new Subject<RealtimeEvent>();
    servicio = jasmine.createSpyObj('RevisionCancelacionService', ['consultarDocente', 'decidir']);
    servicio.consultarDocente.and.returnValue(of(pagina([revision])));
    realtime = jasmine.createSpyObj('RealtimeService', ['startForGroup', 'stop', 'events']);
    realtime.events.and.returnValue(eventos$.asObservable());
    toast = jasmine.createSpyObj('ToastService', ['info', 'success', 'error']);
    TestBed.configureTestingModule({
      imports: [TeacherGrupoDecisionesComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: RevisionCancelacionService, useValue: servicio },
        { provide: RealtimeService, useValue: realtime },
        { provide: ToastService, useValue: toast },
      ],
    });
  });

  it('lista las decisiones pendientes del grupo con estudiante, documento, semáforo y botón Decidir', () => {
    crear();
    expect(servicio.consultarDocente).toHaveBeenCalledWith({ soloPendientes: true, grupoId: 'g1', pagina: 1, tamano: 50 });
    const texto = el().textContent ?? '';
    expect(texto).toContain('Decisiones pendientes');
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('1020304050');
    expect(el().querySelector('app-semaforo-asistencia')).toBeTruthy();
    expect(el().querySelector('[data-testid="decision-decidir"]')).toBeTruthy();
    expect(texto).toContain('22.5');
  });

  it('usa el nombre plano del estudiante y no pinta documento ni fecha si no vienen', () => {
    servicio.consultarDocente.and.returnValue(
      of(pagina([{ id: 'r2', estado: 'PENDIENTE_DOCENTE', nombreEstudiante: 'Luis Gil' }]))
    );
    crear();
    expect(el().textContent).toContain('Luis Gil');
    expect(el().querySelector('[data-testid="decision-documento"]')).toBeNull();
    expect(el().querySelector('[data-testid="decision-fecha"]')).toBeNull();
  });

  it('sin pendientes no pinta la tarjeta', () => {
    servicio.consultarDocente.and.returnValue(of(pagina([])));
    crear();
    expect(el().querySelector('[data-testid="decisiones-tarjeta"]')).toBeNull();
    expect(el().querySelector('[data-testid="decisiones-vacio"]')).toBeNull();
  });

  it('en modo Grupo sin pendientes muestra un estado vacío', () => {
    servicio.consultarDocente.and.returnValue(of(pagina([])));
    crear('g1', true);
    expect(el().querySelector('[data-testid="decisiones-vacio"]')).toBeTruthy();
  });

  it('si la carga falla (500) muestra el mensaje del backend y oculta la tarjeta', () => {
    servicio.consultarDocente.and.returnValue(throwError(() => apiHttpError(500, 'Error al consultar las decisiones.')));
    crear();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Error al consultar las decisiones.');
    expect(el().querySelector('[data-testid="decisiones-tarjeta"]')).toBeNull();
  });

  it('un 403 deja el mensaje del backend', () => {
    servicio.consultarDocente.and.returnValue(throwError(() => apiHttpError(403, 'Sin permiso.')));
    crear();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Sin permiso.');
  });

  it('Decidir abre el modal y, al registrar la decisión, recarga y avisa a la planilla', () => {
    crear();
    const registrada = jasmine.createSpy('registrada');
    fixture.componentInstance.decisionRegistrada.subscribe(registrada);
    (el().querySelector('[data-testid="decision-decidir"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el().querySelector('app-revision-decision-modal')).toBeTruthy();
    expect(el().querySelector('[role="dialog"]')?.textContent).toContain('Ana Pérez');

    servicio.consultarDocente.calls.reset();
    servicio.consultarDocente.and.returnValue(of(pagina([])));
    fixture.componentInstance['alRegistrarDecision']();
    fixture.detectChanges();
    expect(servicio.consultarDocente).toHaveBeenCalledTimes(1);
    expect(registrada).toHaveBeenCalled();
    expect(el().querySelector('[data-testid="decisiones-tarjeta"]')).toBeNull();
  });

  it('abre el canal del grupo y, al llegar REVISION_CANCELACION_CREADA, recarga y avisa con un toast', () => {
    crear();
    expect(realtime.startForGroup).not.toHaveBeenCalled();
    servicio.consultarDocente.calls.reset();
    eventos$.next(evento('REVISION_CANCELACION_CREADA'));
    expect(servicio.consultarDocente).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith('Un estudiante cruzó el umbral de cancelación: revisa Decisiones pendientes');
  });

  for (const tipo of ['REVISION_CANCELACION_DECIDIDA', 'REVISION_CANCELACION_RESUELTA', 'ALERTA_INASISTENCIA']) {
    it(`recarga sin toast al llegar ${tipo}`, () => {
      crear();
      servicio.consultarDocente.calls.reset();
      eventos$.next(evento(tipo));
      expect(servicio.consultarDocente).toHaveBeenCalledTimes(1);
      expect(toast.info).not.toHaveBeenCalled();
    });
  }

  it('ignora eventos ajenos y eventos vacíos', () => {
    crear();
    servicio.consultarDocente.calls.reset();
    eventos$.next(evento('SESION_CANCELADA'));
    eventos$.next(null as unknown as RealtimeEvent);
    expect(servicio.consultarDocente).not.toHaveBeenCalled();
  });

  it('al cambiar de grupo recarga; no abre ni cierra el canal y, al destruirse, deja de escuchar', () => {
    crear();
    fixture.componentRef.setInput('grupoId', 'g2');
    fixture.detectChanges();
    expect(servicio.consultarDocente).toHaveBeenCalledWith(jasmine.objectContaining({ grupoId: 'g2' }));
    fixture.destroy();
    expect(realtime.startForGroup).not.toHaveBeenCalled();
    expect(realtime.stop).not.toHaveBeenCalled();
    servicio.consultarDocente.calls.reset();
    eventos$.next(evento('REVISION_CANCELACION_CREADA'));
    expect(servicio.consultarDocente).not.toHaveBeenCalled();
  });

  it('sin grupo no consulta aunque llegue un evento', () => {
    crear('');
    expect(servicio.consultarDocente).not.toHaveBeenCalled();
    eventos$.next(evento('REVISION_CANCELACION_CREADA'));
    expect(servicio.consultarDocente).not.toHaveBeenCalled();
  });
});

describe('TeacherGrupoDecisionesComponent sin RealtimeService ni ToastService', () => {
  it('carga por HTTP y no falla sin canal', () => {
    TestBed.configureTestingModule({
      imports: [TeacherGrupoDecisionesComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: RealtimeService, useValue: null },
        { provide: ToastService, useValue: null },
      ],
    });
    const fixture = TestBed.createComponent(TeacherGrupoDecisionesComponent);
    fixture.componentRef.setInput('grupoId', 'g1');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url === `${environment.apiUrl}/docente/revisiones-cancelacion`).flush({
      exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 50, totalElementos: 0, totalPaginas: 1,
    });
    fixture.destroy();
    http.verify();
    expect(fixture.componentInstance).toBeTruthy();
  });
});

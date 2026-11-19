import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceNewSessionModalComponent } from './attendance-new-session-modal.component';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';
import { ClassSession } from '../../../../core/models/attendance.model';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';

describe('AttendanceNewSessionModalComponent', () => {
  let fixture: ComponentFixture<AttendanceNewSessionModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AttendanceNewSessionModalComponent],
    });
    fixture = TestBed.createComponent(AttendanceNewSessionModalComponent);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  });

  it('no muestra inputs fantasma de Sesion', () => {
    const text = fixture.nativeElement.textContent as string;
    const html = fixture.nativeElement.innerHTML as string;

    expect(text).toContain('Título de la Sesión');
    expect(text).toContain('Fecha de la Sesión');
    expect(text).toContain('Hora Inicio');
    expect(text).toContain('Hora Fin');

    expect(text).not.toContain('Tipo de Sesión');
    expect(text).not.toContain('Aula / Espacio Físico');
    expect(text).not.toContain('Temática');
    expect(text).not.toContain('Descripción');
    expect(html).not.toContain('name="tipoSesion"');
    expect(html).not.toContain('name="aula"');
    expect(html).not.toContain('name="descripcion"');
  });

  it('emite solo datos persistibles de Sesion', () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.submitted.subscribe((payload) => emitted.push(payload));

    fixture.componentInstance.title.set('Sesion contractual');
    fixture.componentInstance.date.set('2026-09-23');
    fixture.componentInstance.startTime.set('08:00');
    fixture.componentInstance.endTime.set('10:00');
    fixture.componentInstance.onSubmit(new Event('submit'));

    expect(emitted).toEqual([
      {
        title: 'Sesion contractual',
        date: '2026-09-23',
        startTime: '08:00',
        endTime: '10:00',
      },
    ]);
  });

  it('DEC-072: con hora de fin anterior a la de inicio avisa, deshabilita Crear y no emite', () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.submitted.subscribe((payload) => emitted.push(payload));

    fixture.componentInstance.title.set('Test nueva clase');
    fixture.componentInstance.date.set('2026-11-13');
    fixture.componentInstance.startTime.set('20:30');
    fixture.componentInstance.endTime.set('10:00');
    fixture.detectChanges();

    const alerta = fixture.nativeElement.querySelector('p[role="alert"]') as HTMLElement | null;
    expect(alerta?.textContent).toContain(mensajeUi('UI_SESION_HORARIO_MISMO_DIA'));
    expect(fixture.componentInstance.horarioInvalido()).toBeTrue();

    fixture.componentInstance.onSubmit(new Event('submit'));
    expect(emitted).toEqual([]);
  });

  it('DEC-072: con hora de fin igual a la de inicio tampoco permite crear', () => {
    fixture.componentInstance.startTime.set('08:00');
    fixture.componentInstance.endTime.set('08:00');
    expect(fixture.componentInstance.horarioInvalido()).toBeTrue();
  });

  it('DEC-072: con el horario por defecto (08:00 - 10:00) no muestra el aviso', () => {
    expect(fixture.componentInstance.horarioInvalido()).toBeFalse();
    expect(fixture.nativeElement.querySelector('p[role="alert"]')).toBeNull();
  });
});

describe('AttendanceNewSessionModalComponent nombre 1..50', () => {
  it('limita a 50, muestra mensaje y no emite con 51 caracteres', () => {
    TestBed.configureTestingModule({ imports: [AttendanceNewSessionModalComponent] });
    const fixture = TestBed.createComponent(AttendanceNewSessionModalComponent);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    const emitted: unknown[] = [];
    fixture.componentInstance.submitted.subscribe((p) => emitted.push(p));

    fixture.componentInstance.title.set('x'.repeat(51));
    fixture.detectChanges();
    fixture.componentInstance.onSubmit(new Event('submit'));

    const input = fixture.nativeElement.querySelector('input[name="titulo"]') as HTMLInputElement;
    expect(input.maxLength).toBe(50);
    expect(emitted).toEqual([]);
    expect(fixture.nativeElement.textContent as string).toContain('entre 1 y 50');

    fixture.componentInstance.title.set('x'.repeat(50));
    fixture.componentInstance.onSubmit(new Event('submit'));
    expect(emitted).toHaveSize(1);
  });
});

// Ajustar horario desde el menú "Acciones" del historial (antes en el cronograma del grupo del docente).
describe('AttendanceNewSessionModalComponent: ajustar horario de una sesión', () => {
  let fixture: ComponentFixture<AttendanceNewSessionModalComponent>;
  const sesion = (extra: Partial<ClassSession> = {}): ClassSession => ({
    id: 'ses-1', courseId: 'crs-1', sessionNumber: 3, title: 'Sesión guardada',
    date: '2026-09-10', startTime: '08:00', endTime: '10:00', records: [], ...extra,
  });

  // La zona manual se guarda en el navegador: se vuelve a la automática para no afectar otras pruebas.
  afterEach(() => TestBed.inject(SessionTimeZoneService).setAutomatic());

  function abrir(s: ClassSession, zona?: string): AttendanceNewSessionModalComponent {
    TestBed.configureTestingModule({ imports: [AttendanceNewSessionModalComponent] });
    if (zona) TestBed.inject(SessionTimeZoneService).setManualTimeZone(zona);
    fixture = TestBed.createComponent(AttendanceNewSessionModalComponent);
    fixture.componentRef.setInput('sesion', s);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('precarga título, fecha y horario de la sesión y cambia el título y el botón', () => {
    const modal = abrir(sesion());
    const texto = (fixture.nativeElement as HTMLElement).ownerDocument.body.textContent ?? '';

    expect(modal.title()).toBe('Sesión guardada');
    expect([modal.date(), modal.startTime(), modal.endTime()]).toEqual(['2026-09-10', '08:00', '10:00']);
    expect(modal.tituloModal()).toBe('Ajustar horario de la Sesión #3');
    expect(texto).toContain('Guardar horario');
    expect(texto).not.toContain(mensajeUi('UI_SESION_SOLICITUD_REGISTRADA'));
  });

  it('emite los cambios del formulario', () => {
    const modal = abrir(sesion());
    const emitidos: unknown[] = [];
    modal.submitted.subscribe((p) => emitidos.push(p));

    modal.startTime.set('09:00');
    modal.endTime.set('11:00');
    modal.onSubmit(new Event('submit'));

    expect(emitidos).toEqual([{ date: '2026-09-10', startTime: '09:00', endTime: '11:00', title: 'Sesión guardada' }]);
  });

  it('DEC-072: una sesión guardada que cruza medianoche se puede renombrar sin tocar su horario', () => {
    const modal = abrir(sesion({ startTime: '22:30', endTime: '00:35', title: 'Nocturna' }));
    const emitidos: unknown[] = [];
    modal.submitted.subscribe((p) => emitidos.push(p));

    modal.title.set('Nocturna renombrada');
    expect(modal.horarioInvalido()).toBeFalse();
    modal.onSubmit(new Event('submit'));

    expect(emitidos).toHaveSize(1);
  });

  it('DEC-072: cambiar el horario a uno que cruza medianoche lo marca inválido y no emite', () => {
    const modal = abrir(sesion());
    const emitidos: unknown[] = [];
    modal.submitted.subscribe((p) => emitidos.push(p));

    modal.startTime.set('20:30');
    modal.endTime.set('10:00');
    fixture.detectChanges();
    modal.onSubmit(new Event('submit'));

    expect(modal.horarioInvalido()).toBeTrue();
    expect(emitidos).toEqual([]);
  });

  it('si la zona horaria cambia con el formulario abierto, recarga el horario en la zona nueva, conserva el título y avisa', () => {
    const modal = abrir(
      sesion({ fechaHoraInicio: '2026-09-10T13:00:00Z', fechaHoraFin: '2026-09-10T15:00:00Z', estadoTemporal: 'CONFIRMADA' } as Partial<ClassSession>),
      'America/Bogota'
    );
    const zonas = TestBed.inject(SessionTimeZoneService);
    expect([modal.startTime(), modal.endTime()]).toEqual(['08:00', '10:00']);
    modal.title.set('Título editado');
    modal.startTime.set('09:15');
    const body = (fixture.nativeElement as HTMLElement).ownerDocument.body;
    expect(body.querySelector('[data-testid="aviso-zona-cambiada"]')).toBeNull();

    zonas.setManualTimeZone('Europe/Madrid');
    fixture.detectChanges();

    expect(modal.title()).toBe('Título editado');
    expect([modal.date(), modal.startTime(), modal.endTime()]).toEqual(['2026-09-10', '15:00', '17:00']);
    expect(body.querySelector('[data-testid="aviso-zona-cambiada"]')?.textContent?.trim()).toBe(mensajeUi('UI_TEACHER_GRUPOS_007'));
  });

  it('DEC-065 (2): al crear (sin sesión) avisa que la sesión queda como solicitud pendiente', () => {
    TestBed.configureTestingModule({ imports: [AttendanceNewSessionModalComponent] });
    fixture = TestBed.createComponent(AttendanceNewSessionModalComponent);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    const body = (fixture.nativeElement as HTMLElement).ownerDocument.body;

    expect(body.querySelector('[data-testid="nota-solicitud-sesion"]')?.textContent?.trim())
      .toBe(mensajeUi('UI_SESION_SOLICITUD_REGISTRADA'));
    expect(fixture.componentInstance.tituloModal()).toBe('Crear Nueva Sesión de Clase');
  });
});

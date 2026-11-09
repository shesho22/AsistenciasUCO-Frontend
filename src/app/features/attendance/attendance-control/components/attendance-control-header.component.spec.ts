import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClassSession } from '../../../../core/models/attendance.model';
import { AttendanceControlHeaderComponent } from './attendance-control-header.component';

// LB-001B.5A: la Sesion no tiene lifecycle/status en el frontend (BACKEND_GOLDEN_PATH_CONTRACT §C.2).
// SESSION_SYNTHETIC_LIFECYCLE_COUNT = 0: nada de "Clase Activa", "Asistencia Consolidada",
// "Sesión Finalizada y Consolidada" ni "Registro Cerrado", y tampoco un sustituto inventado.

describe('AttendanceControlHeaderComponent', () => {
  let fixture: ComponentFixture<AttendanceControlHeaderComponent>;
  let component: AttendanceControlHeaderComponent;

  const session: ClassSession = {
    id: 'ses-1',
    courseId: 'g1',
    sessionNumber: 1,
    title: 'Sesión 1',
    date: '2026-09-14',
    startTime: '08:00',
    endTime: '10:00',
    records: [],
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent || '';
  const button = (label: RegExp) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => label.test(b.textContent || '')
    )!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceControlHeaderComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AttendanceControlHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('selectedCourseId', 'g1');
    fixture.componentRef.setInput('sessions', [session]);
    fixture.componentRef.setInput('currentSession', session);
    fixture.componentRef.setInput('isDetailMode', true);
    fixture.detectChanges();
  });

  it('SESSION_SYNTHETIC_LIFECYCLE_COUNT = 0: no aparece ningún estado sintético de sesión', () => {
    for (const synthetic of [
      'Clase Activa',
      'Asistencia Consolidada',
      'Sesión Finalizada',
      'Consolidada',
      'Registro Cerrado',
      'Solo Lectura',
      'PROGRAMADA',
      'EN_CURSO',
      'CONCLUIDA',
    ]) {
      expect(text()).not.toContain(synthetic);
    }
  });

  it('no existe el input isSessionConcluded', () => {
    expect('isSessionConcluded' in component).toBeFalse();
  });

  it('con features activas, sesión seleccionada y sin guardado, "Todos Presentes/Ausentes" están habilitados', () => {
    expect(button(/Todos Presentes/).disabled).toBeFalse();
    expect(button(/Todos Ausentes/).disabled).toBeFalse();
  });

  it('deshabilita el marcado masivo solo por features, guardado en curso o falta de sesión', () => {
    fixture.componentRef.setInput('isSaving', true);
    fixture.detectChanges();
    expect(button(/Todos Presentes/).disabled).toBeTrue();
    fixture.componentRef.setInput('isSaving', false);

    fixture.componentRef.setInput('sessionsEnabled', false);
    fixture.detectChanges();
    expect(button(/Todos Ausentes/).disabled).toBeTrue();
    expect(text()).toContain('Sesiones deshabilitadas');
    fixture.componentRef.setInput('sessionsEnabled', true);

    fixture.componentRef.setInput('attendanceEnabled', false);
    fixture.detectChanges();
    expect(button(/Todos Presentes/).disabled).toBeTrue();
    fixture.componentRef.setInput('attendanceEnabled', true);

    fixture.componentRef.setInput('currentSession', undefined);
    fixture.detectChanges();
    expect(button(/Todos Presentes/).disabled).toBeTrue();
  });

  // HU175 (CULM-001 B.2): la ventana de asistencia la calcula la BD. Con la ventana cerrada (sesion futura,
  // finalizada o cancelada) no se ofrece proyectar un QR: el backend respondería 409 al abrir la toma.
  describe('Proyectar QR segun la ventana de asistencia', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('selectedSessionId', 'ses-1');
    });

    it('queda deshabilitado con la ventana cerrada', () => {
      fixture.componentRef.setInput('attendanceWindowOpen', false);
      fixture.detectChanges();
      expect(button(/Proyectar QR/).disabled).toBeTrue();
    });

    it('queda habilitado con la ventana abierta y una sesion seleccionada', () => {
      fixture.componentRef.setInput('attendanceWindowOpen', true);
      fixture.detectChanges();
      expect(button(/Proyectar QR/).disabled).toBeFalse();
    });

    it('sigue deshabilitado sin sesion seleccionada aunque la ventana este abierta', () => {
      fixture.componentRef.setInput('attendanceWindowOpen', true);
      fixture.componentRef.setInput('selectedSessionId', '');
      fixture.detectChanges();
      expect(button(/Proyectar QR/).disabled).toBeTrue();
    });
  });
});

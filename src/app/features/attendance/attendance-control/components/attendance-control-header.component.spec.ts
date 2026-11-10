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

  /** Las acciones secundarias viven en el menu "Mas acciones": se abre y se busca la accion por su texto. */
  const accionMenu = (label: RegExp): HTMLButtonElement => {
    const el = fixture.nativeElement as HTMLElement;
    if (!el.querySelector('[role="menu"]')) {
      el.querySelector<HTMLButtonElement>('[data-testid="action-menu-trigger"]')!.click();
      fixture.detectChanges();
    }
    return Array.from(el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find((b) => label.test(b.textContent || ''))!;
  };

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
    expect(accionMenu(/Todos ausentes/i).disabled).toBeFalse();
  });

  it('deshabilita el marcado masivo solo por features, guardado en curso o falta de sesión', () => {
    fixture.componentRef.setInput('isSaving', true);
    fixture.detectChanges();
    expect(button(/Todos Presentes/).disabled).toBeTrue();
    fixture.componentRef.setInput('isSaving', false);

    fixture.componentRef.setInput('sessionsEnabled', false);
    fixture.detectChanges();
    expect(accionMenu(/Todos ausentes/i).disabled).toBeTrue();
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
      expect(accionMenu(/Proyectar QR/).disabled).toBeTrue();
    });

    it('queda habilitado con la ventana abierta y una sesion seleccionada', () => {
      fixture.componentRef.setInput('attendanceWindowOpen', true);
      fixture.detectChanges();
      expect(accionMenu(/Proyectar QR/).disabled).toBeFalse();
    });

    it('sigue deshabilitado sin sesion seleccionada aunque la ventana este abierta', () => {
      fixture.componentRef.setInput('attendanceWindowOpen', true);
      fixture.componentRef.setInput('selectedSessionId', '');
      fixture.detectChanges();
      expect(accionMenu(/Proyectar QR/).disabled).toBeTrue();
    });
  });

  describe('UX densidad: una accion primaria y un menu "Mas acciones"', () => {
    const botonesCabecera = (): HTMLButtonElement[] =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('header button')).filter(
        (b) => !b.hasAttribute('role')
      );

    it('en detalle con marcado masivo solo hay "Todos Presentes" y el menu, no "Todos Ausentes" ni "Proyectar QR" sueltos', () => {
      const etiquetas = botonesCabecera().map((b) => (b.textContent || '').trim());
      expect(etiquetas.some((e) => /Todos Presentes/.test(e))).toBeTrue();
      expect(etiquetas.some((e) => /Todos Ausentes/i.test(e))).toBeFalse();
      expect(etiquetas.some((e) => /Proyectar QR/.test(e))).toBeFalse();
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="action-menu-trigger"]')).not.toBeNull();
    });

    it('elegir "Todos ausentes" y "Proyectar QR" del menu emite sus eventos', () => {
      fixture.componentRef.setInput('selectedSessionId', 'ses-1');
      fixture.componentRef.setInput('attendanceWindowOpen', true);
      fixture.detectChanges();
      const emitidos: string[] = [];
      component.markAllAbsent.subscribe(() => emitidos.push('ausentes'));
      component.openProjection.subscribe(() => emitidos.push('proyectar'));
      accionMenu(/Todos ausentes/i).click();
      fixture.detectChanges();
      accionMenu(/Proyectar QR/).click();
      expect(emitidos).toEqual(['ausentes', 'proyectar']);
    });

    it('sin marcado masivo (sesion con tomas) "Proyectar QR" queda como boton visible, sin menu', () => {
      fixture.componentRef.setInput('bulkActions', false);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="action-menu-trigger"]')).toBeNull();
      expect(button(/Proyectar QR/)).toBeTruthy();
    });

    it('en la vista general sin sesiones no duplica el estado vacio (lo muestra el historial del grupo)', () => {
      fixture.componentRef.setInput('isDetailMode', false);
      fixture.componentRef.setInput('sessions', []);
      fixture.detectChanges();
      expect(text()).not.toContain('Programar Primera Sesión');
    });

    it('en la vista general no repite "+ Sesion" (la accion vive en el historial del grupo)', () => {
      fixture.componentRef.setInput('isDetailMode', false);
      fixture.detectChanges();
      expect(text()).not.toContain('+ Sesión');
    });
  });
});

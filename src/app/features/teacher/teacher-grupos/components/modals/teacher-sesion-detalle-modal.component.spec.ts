import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherSesionDetalleModalComponent } from './teacher-sesion-detalle-modal.component';
import { ClassSession } from '../../../../../core/models/attendance.model';

// LB-001B.1B (DB source of truth cleanup, PLAN.md AS-IS #26): el badge de estado de la
// sesión lee ClassSession.status (distinto de StudentAttendance.status / rec.status, que
// SÍ es un campo real y queda fuera de alcance). TARGET: se retira sin sustituto.

describe('TeacherSesionDetalleModalComponent', () => {
  let fixture: ComponentFixture<TeacherSesionDetalleModalComponent>;

  const sesion: ClassSession = {
    id: 'ses-1',
    courseId: 'crs-1',
    sessionNumber: 1,
    title: 'Sesión 1',
    date: '2026-09-14',
    startTime: '08:00',
    endTime: '10:00',
    records: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TeacherSesionDetalleModalComponent],
    });
    fixture = TestBed.createComponent(TeacherSesionDetalleModalComponent);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('sesion', sesion);
    fixture.detectChanges();
  });

  it('no renderiza el status sintético de la sesión ("PROGRAMADA") en el header del modal', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('PROGRAMADA');
  });

  it('no presenta aula ni estado de cierre: el contrato no los entrega (LB-001B.5A)', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('Aula');
    expect(text).not.toContain('Inmutable');
    expect(text).not.toContain('consolidad');
    expect('room' in fixture.componentInstance).toBeFalse();
  });

  it('bloque E: sin registros muestra el mensaje vacío de la tabla', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="tabla-datos-vacia"]')?.textContent)
      .toContain('Sin registros individuales para esta sesión.');
  });

  it('bloque E: los registros son filas de una tabla paginada de 15 en 15', () => {
    const records = Array.from({ length: 17 }, (_, i) => ({
      studentId: `e-${i}`, studentName: `Estudiante ${i}`, studentCode: `C${i}`, status: i === 0 ? ('AN' as const) : null,
    }));
    fixture.componentRef.setInput('sesion', { ...sesion, records } as ClassSession);
    fixture.detectChanges();

    const filas = () =>
      (fixture.nativeElement as HTMLElement).querySelectorAll('app-tabla-datos tbody tr[data-testid="sesion-detalle-registro"]');
    expect(filas().length).toBe(15);
    expect(filas()[0].textContent).toContain('Estudiante 0');
    expect(filas()[0].textContent).toContain('Presente');

    fixture.componentInstance.pagina.set(2);
    fixture.detectChanges();
    expect(filas().length).toBe(2);
  });

  it('mapea explicitamente null y estados reales de asistencia', () => {
    expect(fixture.componentInstance.statusLabel(null)).toBe('Sin registrar');
    expect(fixture.componentInstance.statusLabel('AN')).toBe('Presente');
    expect(fixture.componentInstance.statusLabel('SJC')).toBe('Falta SJC');
    expect(fixture.componentInstance.statusLabel('EX')).toBe('Excusa');
    expect(fixture.componentInstance.statusBadgeClasses(null)).toContain('warm');
  });
});

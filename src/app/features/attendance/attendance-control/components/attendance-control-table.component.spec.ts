import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentAttendance } from '../../../../core/models/attendance.model';
import { AttendanceControlTableComponent } from './attendance-control-table.component';

describe('AttendanceControlTableComponent', () => {
  let fixture: ComponentFixture<AttendanceControlTableComponent>;
  let component: AttendanceControlTableComponent;

  const students: StudentAttendance[] = [
    { studentId: '1', studentName: 'Ada Lovelace', studentCode: 'A001', status: null },
    { studentId: '2', studentName: 'Grace Hopper', studentCode: 'G002', status: 'AN' },
    { studentId: '3', studentName: 'Katherine Johnson', studentCode: 'K003', status: 'SJC' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceControlTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceControlTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('students', students);
    fixture.detectChanges();
  });

  it('presenta el estado local sin registrar sin convertirlo en ausencia', () => {
    expect(fixture.nativeElement.textContent).toContain('Sin registrar');
    expect(component.filteredStudents()[0].status).toBeNull();
  });

  it('filtra por estado, nombre y código', () => {
    component.filterStatus.set('AN');
    expect(component.filteredStudents().map((student) => student.studentId)).toEqual(['2']);

    component.filterStatus.set('TODOS');
    component.searchQuery.set('katherine');
    expect(component.filteredStudents().map((student) => student.studentId)).toEqual(['3']);

    component.searchQuery.set('a001');
    expect(component.filteredStudents().map((student) => student.studentId)).toEqual(['1']);

    component.searchQuery.set('sin coincidencias');
    expect(component.filteredStudents()).toEqual([]);
  });

  it('aplica estilos seleccionados, no seleccionados y de foco', () => {
    component.filterStatus.set('AN');
    expect(component.filterBtnClasses('AN')).toContain('font-bold');
    expect(component.filterBtnClasses('SJC')).toContain('font-medium');

    component.activeFocusedIndex.set(1);
    expect(component.mobileCardClasses(1)).toContain('border-primary-500');
    expect(component.mobileCardClasses(0)).toContain('border-warm-200');
    expect(component.desktopRowClasses(1)).toContain('bg-primary-50');
    expect(component.desktopRowClasses(0)).toContain('hover:bg-warm-50');

    expect(component.mobileStatusBtnClasses('AN', 'AN')).toContain('bg-success-600');
    expect(component.mobileStatusBtnClasses(null, 'AN')).toContain('bg-warm-100');
    expect(component.mobileStatusBtnClasses('SJC', 'SJC')).toContain('bg-danger-600');
    expect(component.mobileStatusBtnClasses(null, 'SJC')).toContain('bg-warm-100');
    expect(component.mobileStatusBtnClasses('EX', 'EX')).toContain('bg-warning-600');
    expect(component.mobileStatusBtnClasses(null, 'EX')).toContain('bg-warm-100');

    expect(component.segmentedChipClasses('AN', 'AN')).toContain('bg-success-600');
    expect(component.segmentedChipClasses(null, 'AN')).toContain('font-medium');
    expect(component.segmentedChipClasses('SJC', 'SJC')).toContain('bg-danger-600');
    expect(component.segmentedChipClasses(null, 'SJC')).toContain('font-medium');
    expect(component.segmentedChipClasses('EX', 'EX')).toContain('bg-warning-600');
    expect(component.segmentedChipClasses(null, 'EX')).toContain('font-medium');
  });

  it('navega y registra con teclado incluyendo el estado nulo', () => {
    const statusChanges: unknown[] = [];
    const excuses: unknown[] = [];
    component.statusChange.subscribe((change) => statusChanges.push(change));
    component.openExcuseModal.subscribe((student) => excuses.push(student));

    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.activeFocusedIndex()).toBe(1);
    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.activeFocusedIndex()).toBe(0);
    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: '1' }));
    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: '2' }));
    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: '3' }));

    expect(statusChanges).toEqual([
      { studentId: '1', status: 'AN' },
      { studentId: '1', status: 'EX' },
      { studentId: '1', status: 'AN' },
      { studentId: '1', status: 'SJC' },
    ]);
    expect(excuses).toEqual([students[0]]);
  });

  it('ignora atajos si el control está bloqueado, el foco está en un campo o no hay filas', () => {
    const statusChanges: unknown[] = [];
    component.statusChange.subscribe((change) => statusChanges.push(change));

    fixture.componentRef.setInput('sessionsEnabled', false);
    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: '1' }));
    fixture.componentRef.setInput('sessionsEnabled', true);
    fixture.componentRef.setInput('attendanceEnabled', false);
    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: '1' }));
    fixture.componentRef.setInput('attendanceEnabled', true);
    fixture.componentRef.setInput('isSaving', true);
    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: '1' }));
    fixture.componentRef.setInput('isSaving', false);

    const inputEvent = new KeyboardEvent('keydown', { key: '1' });
    Object.defineProperty(inputEvent, 'target', { value: document.createElement('input') });
    component.handleKeyboardEvent(inputEvent);

    component.searchQuery.set('ninguno');
    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(statusChanges).toEqual([]);
  });

  // --- LB-001B.5A: la Sesion no tiene estado; los controles solo dependen de features + isSaving ---

  // Controles de registro (estado por estudiante + guardar): excluye la barra de filtros (`<section>`).
  const statusButtons = () =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).filter(
      (b) =>
        !b.closest('section') &&
        /Asistencia Normal|Sin Justa Causa|Excusa|Guardar Asistencia/.test(b.textContent || '')
    );

  it('no existe el input sintético isSessionConcluded ni textos de sesión cerrada/consolidada', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect('isSessionConcluded' in component).toBeFalse();
    expect(text).not.toContain('Consolid');
    expect(text).not.toContain('Registro Cerrado');
    expect(text).toContain('Guardar Asistencia');
  });

  it('con sessionsEnabled, attendanceEnabled y sin guardado en curso, todos los controles están habilitados', () => {
    fixture.detectChanges();
    const buttons = statusButtons();
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((b) => !b.disabled)).toBeTrue();
  });

  it('deshabilita los controles solo por features o guardado en curso', () => {
    fixture.componentRef.setInput('isSaving', true);
    fixture.detectChanges();
    expect(statusButtons().every((b) => b.disabled)).toBeTrue();
    fixture.componentRef.setInput('isSaving', false);

    fixture.componentRef.setInput('sessionsEnabled', false);
    fixture.detectChanges();
    expect(statusButtons().every((b) => b.disabled)).toBeTrue();
    fixture.componentRef.setInput('sessionsEnabled', true);

    fixture.componentRef.setInput('attendanceEnabled', false);
    fixture.detectChanges();
    expect(statusButtons().every((b) => b.disabled)).toBeTrue();
  });

  it('rota estados persistidos hacia adelante y hacia atrás', () => {
    const statusChanges: unknown[] = [];
    component.statusChange.subscribe((change) => statusChanges.push(change));
    component.activeFocusedIndex.set(1);

    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    expect(statusChanges).toEqual([
      { studentId: '2', status: 'SJC' },
      { studentId: '2', status: 'EX' },
    ]);
  });
});

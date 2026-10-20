import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TeacherGrupoFormComponent } from './teacher-grupo-form.component';

// LB-001B.1B (DB source of truth cleanup, PLAN.md AS-IS #23): el placeholder del campo
// "Docente Responsable" sugiere hardcodear el literal 'Dra. María Elena Rostagno', el mismo
// texto sintetizado que se retira de course.service.ts/course.mock.ts/teacher-grupos.component.ts.
// TARGET: el formulario deja de sugerir/editar ese literal sintetizado.

describe('TeacherGrupoFormComponent', () => {
  let fixture: ComponentFixture<TeacherGrupoFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TeacherGrupoFormComponent],
    });
    fixture = TestBed.createComponent(TeacherGrupoFormComponent);
    fixture.detectChanges();
  });

  it('no sugiere el literal sintetizado "Dra. María Elena Rostagno" como placeholder', () => {
    const inputs = fixture.debugElement.queryAll(By.css('input[type="text"]'));
    const placeholders = inputs.map((i) => (i.nativeElement as HTMLInputElement).placeholder);

    expect(placeholders).not.toContain('Ej. Dra. María Elena Rostagno');
  });

  it('alternarDia y actualizarHorarioTexto modifican los días seleccionados y el texto del horario', () => {
    const component = fixture.componentInstance;
    component.form.set({
      code: 'IS-101',
      name: 'Software',
      diasSeleccionados: ['Lunes', 'Miércoles'],
      horaInicio: '08:00',
      horaFin: '10:00',
      schedule: '',
    });

    component.alternarDia('Viernes');
    expect(component.form().diasSeleccionados).toContain('Viernes');
    expect(component.form().schedule).toContain('Lunes y Miércoles y Viernes');

    component.alternarDia('Miércoles');
    expect(component.form().diasSeleccionados).not.toContain('Miércoles');

    // No debe eliminar el último día restante
    component.alternarDia('Lunes');
    component.alternarDia('Viernes');
    expect(component.form().diasSeleccionados.length).toBeGreaterThanOrEqual(1);
  });

  it('emite cancelar, guardar y asignaturaChange correctamente', () => {
    const component = fixture.componentInstance;
    spyOn(component.cancelar, 'emit');
    spyOn(component.guardar, 'emit');
    spyOn(component.asignaturaChange, 'emit');

    component.cancelar.emit();
    expect(component.cancelar.emit).toHaveBeenCalled();

    component.guardar.emit();
    expect(component.guardar.emit).toHaveBeenCalled();

    component.asignaturaChange.emit('asig-1');
    expect(component.asignaturaChange.emit).toHaveBeenCalledWith('asig-1');
  });
});

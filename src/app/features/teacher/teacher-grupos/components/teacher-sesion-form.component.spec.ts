import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherSesionFormComponent } from './teacher-sesion-form.component';

describe('TeacherSesionFormComponent', () => {
  let fixture: ComponentFixture<TeacherSesionFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TeacherSesionFormComponent],
    });
    fixture = TestBed.createComponent(TeacherSesionFormComponent);
    fixture.detectChanges();
  });

  it('solo renderiza campos persistibles de Sesion', () => {
    const text = fixture.nativeElement.textContent as string;
    const html = fixture.nativeElement.innerHTML as string;

    expect(text).toContain('Título de la Sesión');
    expect(text).toContain('Fecha de la Sesión');
    expect(text).toContain('Hora de Inicio');
    expect(text).toContain('Hora de Fin');

    expect(text).not.toContain('Tipo de Sesión');
    expect(text).not.toContain('Temática');
    expect(text).not.toContain('Descripción');
    expect(text).not.toContain('Aula Asignada');
    expect(html).not.toContain('ng-reflect-name="tipo"');
    expect(html).not.toContain('ng-reflect-name="topic"');
    expect(html).not.toContain('ng-reflect-name="room"');
  });
});

describe('TeacherSesionFormComponent nombre 1..50', () => {
  it('limita el input a 50 caracteres y deshabilita guardar con 51', () => {
    TestBed.configureTestingModule({ imports: [TeacherSesionFormComponent] });
    const fixture = TestBed.createComponent(TeacherSesionFormComponent);
    fixture.componentRef.setInput('form', {
      title: 'x'.repeat(51),
      date: '2026-09-23',
      startTime: '08:00',
      endTime: '10:00',
    });
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.maxLength).toBe(50);
    expect(fixture.nativeElement.textContent as string).toContain('entre 1 y 50');
    expect(fixture.componentInstance.nombreInvalido()).toBeTrue();
  });
});

describe('TeacherSesionFormComponent solicitud (DEC-065 (2))', () => {
  let fixture: ComponentFixture<TeacherSesionFormComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TeacherSesionFormComponent] });
    fixture = TestBed.createComponent(TeacherSesionFormComponent);
  });

  it('en modo CREAR se titula "Solicitar sesión extraordinaria" y avisa que queda pendiente', () => {
    fixture.detectChanges();
    expect(el().querySelector('h2')?.textContent).toContain('Solicitar sesión extraordinaria');
    expect(el().querySelector('[data-testid="nota-solicitud-sesion"]')?.textContent)
      .toContain('La sesión queda pendiente hasta que el coordinador del programa la apruebe');
  });

  it('en modo EDITAR no muestra la nota de solicitud', () => {
    fixture.componentRef.setInput('modo', 'EDITAR');
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="nota-solicitud-sesion"]')).toBeNull();
    expect(el().querySelector('h2')?.textContent).toContain('Modificar Sesión');
  });
});

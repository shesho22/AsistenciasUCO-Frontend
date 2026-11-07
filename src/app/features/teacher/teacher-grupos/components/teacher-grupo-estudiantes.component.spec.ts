import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherGrupoEstudiantesComponent } from './teacher-grupo-estudiantes.component';
import { Course } from '../../../../core/models/course.model';

describe('TeacherGrupoEstudiantesComponent', () => {
  let fixture: ComponentFixture<TeacherGrupoEstudiantesComponent>;
  let component: TeacherGrupoEstudiantesComponent;

  const mockCourse: Course = {
    id: 'crs-1',
    name: 'Algoritmos I',
    code: 'SIS-101',
    section: 'Grupo 01',
    cupoMaximo: 30,
    enrolledStudentsCount: 2,
    colorCategory: 'emerald',
    schedule: 'Lunes 08:00 - 10:00',
  };

  const mockEstudiantes = [
    {
      studentId: 'est-1',
      studentName: 'Ana Gómez',
      studentCode: '1017001',
    },
    {
      studentId: 'est-2',
      studentName: 'Carlos López',
      studentCode: '1017002',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherGrupoEstudiantesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherGrupoEstudiantesComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente en estado vacío', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No hay estudiantes matriculados');
  });

  it('muestra la lista de estudiantes cuando se suministran', () => {
    fixture.componentRef.setInput('curso', mockCourse);
    fixture.componentRef.setInput('estudiantes', mockEstudiantes);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Ana Gómez');
    expect(text).toContain('Carlos López');
    expect(text).toContain('2 de 30 Cupos');
  });

  it('HU051 RT-07 muestra la forma del backend y solo los activos tienen "Retirar"', () => {
    const retirar = jasmine.createSpy('retirar');
    component.retirar.subscribe(retirar);
    fixture.componentRef.setInput('estudiantes', [
      { id: 'm-1', idEstudiante: 'est-1', nombreCompleto: 'Ana Gómez', documento: '1017001', codigoEstado: 'A', nombreEstado: 'activo' },
      { id: 'm-2', idEstudiante: 'est-2', nombreCompleto: 'Luis Ruiz', documento: '1017003', codigoEstado: 'I', nombreEstado: 'inactivo' },
    ]);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ana Gómez');
    expect(texto).toContain('1017001');
    expect(texto).toContain('inactivo');
    const botones = fixture.nativeElement.querySelectorAll('button[data-accion="retirar"]');
    expect(botones).toHaveSize(1);
    botones[0].click();
    expect(retirar).toHaveBeenCalledWith(jasmine.objectContaining({ idEstudiante: 'est-1' }));
  });

  it('muestra estado cargando cuando cargando es true', () => {
    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('No hay estudiantes');
  });

  it('F-DOC-007: el padron se pinta por paginas (12) y no completo', () => {
    const muchos = Array.from({ length: 30 }, (_, i) => ({ idEstudiante: `e-${i}`, nombreCompleto: `Estudiante ${i}`, documento: `${i}` }));
    fixture.componentRef.setInput('estudiantes', muchos);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-testid="padron-fila"]').length).toBe(12);
    expect(fixture.nativeElement.querySelector('app-pagination')).not.toBeNull();
    component.pagina.set(3);
    fixture.detectChanges();
    expect(component.estudiantesPagina().length).toBe(6);
  });
});

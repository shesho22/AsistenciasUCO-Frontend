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

  it('muestra estado cargando cuando cargando es true', () => {
    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('No hay estudiantes');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherGrupoHorariosComponent } from './teacher-grupo-horarios.component';
import { Course } from '../../../../core/models/course.model';

describe('TeacherGrupoHorariosComponent', () => {
  let fixture: ComponentFixture<TeacherGrupoHorariosComponent>;
  let component: TeacherGrupoHorariosComponent;

  const mockCourse: Course = {
    id: 'crs-1',
    name: 'Algoritmos I',
    code: 'SIS-101',
    section: 'Grupo 01',
    cupoMaximo: 35,
    enrolledStudentsCount: 15,
    colorCategory: 'emerald',
    schedule: 'Martes y Jueves 06:00 - 08:00',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherGrupoHorariosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherGrupoHorariosComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente y mostrar franja lectiva y aforo', () => {
    fixture.componentRef.setInput('curso', mockCourse);
    fixture.componentRef.setInput('totalMatriculados', 15);
    fixture.detectChanges();

    expect(component).toBeTruthy();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Martes y Jueves 06:00 - 08:00');
    expect(text).toContain('35 Cupos Máximos');
    expect(text).toContain('15 matriculados');
  });
});

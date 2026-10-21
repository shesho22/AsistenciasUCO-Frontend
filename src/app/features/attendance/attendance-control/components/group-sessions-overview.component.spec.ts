import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GroupSessionsOverviewComponent } from './group-sessions-overview.component';
import { ClassSession } from '../../../../core/models/attendance.model';
import { Course } from '../../../../core/models/course.model';

describe('GroupSessionsOverviewComponent', () => {
  let fixture: ComponentFixture<GroupSessionsOverviewComponent>;

  const course: Course = {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    name: 'Arquitectura de Software',
    section: 'Grupo 001 - Arq Software',
    schedule: '',
    colorCategory: 'emerald',
  };

  const session = (n: number, records: ClassSession['records'] = []): ClassSession => ({
    id: `sesion-${n}`,
    courseId: course.id,
    sessionNumber: n,
    title: `Sesión ${n}`,
    date: '2026-09-14',
    startTime: '08:00',
    endTime: '10:00',
    records,
  });

  function render(sessions: ClassSession[]): GroupSessionsOverviewComponent {
    fixture = TestBed.createComponent(GroupSessionsOverviewComponent);
    fixture.componentRef.setInput('course', course);
    fixture.componentRef.setInput('sessions', sessions);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [GroupSessionsOverviewComponent] });
  });

  it('sin registros de asistencia no muestra 100%: el promedio es desconocido', () => {
    const component = render([session(1), session(2)]);

    expect(component.promedioAsistencia()).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('100%');
    expect(text).toContain('Sin registros de asistencia para calcular');
  });

  it('filas de estudiantes sin estado registrado tampoco generan un promedio', () => {
    const component = render([
      session(1, [
        { studentId: 'e1', status: null },
        { studentId: 'e2', status: null },
      ] as ClassSession['records']),
    ]);

    expect(component.promedioAsistencia()).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Sin registros de asistencia para calcular');
    expect(text).not.toContain('0% Institucional');
  });

  it('con registros calcula el promedio real', () => {
    const component = render([
      session(1, [
        { studentId: 'e1', status: 'AN' },
        { studentId: 'e2', status: 'SJC' },
      ] as ClassSession['records']),
    ]);

    expect(component.promedioAsistencia()).toBe(50);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('50%');
  });

  it('muestra las dos sesiones y el grupo sin código ni separador huérfano', () => {
    render([session(1), session(2)]);

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Sesión 1');
    expect(text).toContain('Sesión 2');
    expect(text).toContain('Grupo 001 - Arq Software');
    expect(text).not.toContain('undefined');
  });
});

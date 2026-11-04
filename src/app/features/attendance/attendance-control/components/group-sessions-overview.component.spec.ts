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

  describe('SES-05: EX es una ausencia justificada, no una asistencia presencial', () => {
    const conJustificada = () =>
      session(1, [
        { studentId: 'e1', status: 'AN' },
        { studentId: 'e2', status: 'EX' },
        { studentId: 'e3', status: 'SJC' },
      ] as ClassSession['records']);

    it('la columna Asistentes cuenta solo AN', () => {
      const component = render([conJustificada()]);

      expect(component.getPresentesCount(conJustificada())).toBe(1);
      const celda = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="asistentes-sesion-1"]');
      expect(celda?.textContent?.replace(/\s+/g, ' ').trim()).toContain('1 / 3');
    });

    it('las ausencias justificadas se muestran aparte', () => {
      const component = render([conJustificada()]);

      expect(component.getJustificadasCount(conJustificada())).toBe(1);
      const celda = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="asistentes-sesion-1"]');
      expect(celda?.textContent).toContain('1 justificada');
    });

    it('una sesión sin registros cuenta 0 asistentes y 0 justificadas', () => {
      const component = render([session(1)]);
      const sinRegistros = { ...session(1), records: undefined } as unknown as ClassSession;

      expect(component.getPresentesCount(sinRegistros)).toBe(0);
      expect(component.getJustificadasCount(sinRegistros)).toBe(0);
    });

    it('con varias EX usa el plural «justificadas»', () => {
      render([session(1, [
        { studentId: 'e1', status: 'EX' },
        { studentId: 'e2', status: 'EX' },
      ] as ClassSession['records'])]);

      const celda = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="asistentes-sesion-1"]');
      expect(celda?.textContent).toContain('2 justificadas');
    });

    it('sin EX no muestra el indicador de justificadas', () => {
      render([session(1, [{ studentId: 'e1', status: 'AN' }] as ClassSession['records'])]);

      const celda = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="asistentes-sesion-1"]');
      expect(celda?.textContent).not.toContain('justificada');
    });

    // Fórmula oficial PENDIENTE DE DECISIÓN FUNCIONAL: hoy el promedio suma EX con AN. Esta prueba fija el
    // comportamiento vigente para que el cambio de política sea explícito (debe cambiarse junto con la decisión).
    it('el promedio conserva la fórmula vigente (AN + EX) hasta que exista la decisión académica', () => {
      const component = render([conJustificada()]);

      expect(component.promedioAsistencia()).toBe(67);
    });
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

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
  });

  it('muestra las dos sesiones y el grupo sin código ni separador huérfano', () => {
    render([session(1), session(2)]);

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Sesión 1');
    expect(text).toContain('Sesión 2');
    expect(text).toContain('Grupo 001 - Arq Software');
    expect(text).not.toContain('undefined');
  });

  function abrirMenu(): void {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="action-menu-trigger"]')!.click();
    fixture.detectChanges();
  }
  const opcion = (id: string): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!;

  it('HU051: la accion "Padrón" del menu emite gestionarPadron', () => {
    const comp = render([session(1)]);
    let emitido = false;
    comp.gestionarPadron.subscribe(() => (emitido = true));
    abrirMenu();
    opcion('padron').click();
    expect(emitido).toBeTrue();
  });

  it('UX densidad: la cabecera muestra una accion primaria (+ Nueva Sesion) y un menu "Mas acciones"', () => {
    render([session(1)]);
    const el = fixture.nativeElement as HTMLElement;
    const cabecera = el.querySelector('[data-testid="acciones-grupo"]') as HTMLElement;
    expect(cabecera.querySelectorAll('button').length).toBe(2);
    expect(cabecera.textContent).toContain('Nueva Sesión');
    expect(el.querySelector('[data-testid="action-menu-trigger"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="padron"]')).toBeNull();
  });

  it('UX densidad: el menu ofrece matricula QR, matricular, info y alumnos y reclamos, y cada uno emite su evento', () => {
    const comp = render([session(1)]);
    const emitidos: string[] = [];
    comp.openMatriculaQr.subscribe(() => emitidos.push('qr'));
    comp.openEnrollment.subscribe(() => emitidos.push('matricular'));
    comp.verAlumnos.subscribe(() => emitidos.push('alumnos'));
    comp.verReclamos.subscribe(() => emitidos.push('reclamos'));
    for (const id of ['grupo-matricula-qr', 'grupo-matricular', 'grupo-alumnos', 'grupo-reclamos']) {
      abrirMenu();
      opcion(id).click();
      fixture.detectChanges();
    }
    expect(emitidos).toEqual(['qr', 'matricular', 'alumnos', 'reclamos']);
  });

  it('UX densidad: los reclamos pendientes se ven en el menu y en el boton', () => {
    render([session(1)]);
    fixture.componentRef.setInput('totalReclamosPendientes', 3);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="action-menu-trigger"]')?.textContent).toContain('3');
    abrirMenu();
    expect(opcion('grupo-reclamos').textContent).toContain('Reclamos (3)');
  });

  it('UX densidad: sin sesiones usa el estado vacio compartido con su accion de crear la primera', () => {
    const comp = render([]);
    const el = fixture.nativeElement as HTMLElement;
    const vacio = el.querySelector('[data-testid="sesiones-vacio"] app-empty-state') as HTMLElement;
    expect(vacio).not.toBeNull();
    expect(vacio.textContent).toContain('No hay sesiones registradas');
    let creadas = 0;
    comp.openNewSession.subscribe(() => creadas++);
    (vacio.querySelector('button') as HTMLButtonElement).click();
    expect(creadas).toBe(1);
  });

  it('B1-F-14 las sesiones canceladas no cuentan en el total', () => {
    const cancelada: ClassSession = { ...session(3), estado: 'CANCELADA' };
    const component = render([
      session(1, [{ studentId: 'e1', status: 'SJC' }] as ClassSession['records']),
      session(2),
      cancelada,
    ]);

    expect(component.totalSesiones()).toBe(2);
  });

  it('B1-F-14 una sesión cancelada se muestra con la etiqueta Cancelada en el listado', () => {
    render([{ ...session(1), estado: 'CANCELADA', cancelacion: { tipo: 'DOCENTE', motivo: 'Paro', nombreFestivo: null, fechaCancelacionUtc: null } }]);

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Cancelada');
  });
});

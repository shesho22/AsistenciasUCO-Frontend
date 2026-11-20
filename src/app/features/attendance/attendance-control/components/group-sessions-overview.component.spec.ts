import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GroupSessionsOverviewComponent } from './group-sessions-overview.component';
import { ClassSession } from '../../../../core/models/attendance.model';
import { Course } from '../../../../core/models/course.model';
import { ResumenSesionesGrupo } from '../../../../core/models/resumen-sesiones-grupo.model';
import { resumenSesiones, sesionResumen } from '../../../../core/testing/resumen-sesiones-grupo.fixture';

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

  function render(sessions: ClassSession[], resumen: ResumenSesionesGrupo | null = null): GroupSessionsOverviewComponent {
    fixture = TestBed.createComponent(GroupSessionsOverviewComponent);
    fixture.componentRef.setInput('course', course);
    fixture.componentRef.setInput('sessions', sessions);
    fixture.componentRef.setInput('resumenSesiones', resumen);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [GroupSessionsOverviewComponent] });
  });

  it('sin horas dictadas el servidor no entrega promedio y no se muestra 100%', () => {
    const component = render([session(1), session(2)], resumenSesiones({ promedioAsistencia: null }));

    expect(component.promedio()).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('100%');
    expect(text).toContain('Sin registros de asistencia para calcular');
  });

  it('las filas locales sin estado no generan promedio: solo cuenta el que entrega el servidor', () => {
    const component = render([
      session(1, [
        { studentId: 'e1', status: null },
        { studentId: 'e2', status: null },
      ] as ClassSession['records']),
    ]);

    expect(component.promedio()).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Sin registros de asistencia para calcular');
    expect(text).not.toContain('0% Institucional');
  });

  describe('SES-05: EX es una ausencia justificada, no una asistencia presencial (conteo del servidor)', () => {
    const conteo = (parcial: Parameters<typeof sesionResumen>[1]) =>
      resumenSesiones({ sesiones: [sesionResumen('sesion-1', { totalEstudiantes: 3, ...parcial })] });
    const celda = () => (fixture.nativeElement as HTMLElement).querySelector('[data-testid="asistentes-sesion-1"]');

    it('la columna Asistentes muestra los presentes y el total de activos que cuenta la base', () => {
      const component = render([session(1)], conteo({ presentes: 1, justificadas: 1, ausentes: 1 }));

      expect(component.conteoDe('sesion-1')?.presentes).toBe(1);
      expect(celda()?.textContent?.replace(/\s+/g, ' ').trim()).toContain('1 / 3');
    });

    it('las ausencias justificadas se muestran aparte', () => {
      const component = render([session(1)], conteo({ presentes: 1, justificadas: 1, ausentes: 1 }));

      expect(component.conteoDe('sesion-1')?.justificadas).toBe(1);
      expect(celda()?.textContent).toContain('1 justificada');
    });

    it('una sesión sin conteo del servidor cuenta 0 asistentes y 0 justificadas', () => {
      const component = render([session(1)], resumenSesiones());

      expect(component.conteoDe('sesion-1')).toBeUndefined();
      expect(celda()?.textContent?.replace(/\s+/g, ' ').trim()).toContain('0 / 0');
      expect(celda()?.textContent).not.toContain('justificada');
    });

    it('con varias EX usa el plural «justificadas»', () => {
      render([session(1)], conteo({ justificadas: 2 }));

      expect(celda()?.textContent).toContain('2 justificadas');
    });

    it('sin EX no muestra el indicador de justificadas', () => {
      render([session(1)], conteo({ presentes: 1 }));

      expect(celda()?.textContent).not.toContain('justificada');
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
    expect(cabecera.querySelectorAll('button')).toHaveSize(2);
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
    expect(opcion('grupo-reclamos').textContent).toContain('Justificaciones (3)');
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

  it('UX densidad: sin sesiones la accion de crear no se repite en la tarjeta de sesion seleccionada', () => {
    render([]);
    const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter((b) =>
      (b.textContent || '').includes('Nueva Sesión')
    );
    expect(botones).toHaveSize(1);
  });

  it('B1-F-14 el total de sesiones y las canceladas son los que cuenta el servidor', () => {
    const cancelada: ClassSession = { ...session(3), estado: 'CANCELADA' };
    render([session(1), session(2), cancelada], resumenSesiones({ sesionesProgramadas: 3, sesionesEjecutadas: 1, sesionesCanceladas: 1 }));

    const text = ((fixture.nativeElement as HTMLElement).textContent || '').replace(/\s+/g, ' ');
    expect(text).toContain('3 sesiones programadas');
    expect(text).toContain('1 ejecutadas · 1 canceladas');
  });

  it('B1-F-14 una sesión cancelada se muestra con la etiqueta Cancelada en el listado', () => {
    render([{ ...session(1), estado: 'CANCELADA', cancelacion: { tipo: 'DOCENTE', motivo: 'Paro', nombreFestivo: null, fechaCancelacionUtc: null } }]);

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Cancelada');
  });

  // Las acciones por sesión del cronograma del docente viven ahora en el menú "Acciones" de cada fila del historial.
  describe('menú "Acciones" por sesión', () => {
    const disparador = (n: number): HTMLButtonElement =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        `[data-testid="acciones-sesion-${n}"] [data-testid="action-menu-trigger"]`
      )!;
    const etiquetas = (): string[] =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="menuitem"]')).map((b) => b.textContent!.trim());
    function renderConBanderas(sessions: ClassSession[], qr = true, cancelar = true): GroupSessionsOverviewComponent {
      const comp = render(sessions);
      fixture.componentRef.setInput('qrHabilitado', qr);
      fixture.componentRef.setInput('cancelacionHabilitada', cancelar);
      fixture.detectChanges();
      return comp;
    }
    function abrirAcciones(n: number): void {
      disparador(n).click();
      fixture.detectChanges();
    }

    it('cada sesión tiene su botón "Acciones" y ya no hay un botón suelto de Tomar Asistencia', () => {
      renderConBanderas([session(1), session(2)]);
      expect(disparador(1).textContent).toContain('Acciones');
      expect(disparador(1).getAttribute('aria-label')).toBe('Acciones de la sesión #1');
      expect(disparador(2)).not.toBeNull();
      const filas = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
      expect(Array.from(filas).some((f) => /Tomar Asistencia/.test(f.textContent ?? ''))).toBeFalse();
    });

    it('una sesión programada ofrece tomar asistencia, QR, detalles, ajustar horario y cancelar', () => {
      renderConBanderas([session(1)]);
      abrirAcciones(1);
      expect(etiquetas()).toEqual(['Tomar asistencia', 'Proyectar QR / PIN', 'Ver detalles', 'Ajustar horario', 'Cancelar sesión']);
    });

    it('sin las banderas de QR y cancelación esas acciones no aparecen', () => {
      renderConBanderas([session(1)], false, false);
      abrirAcciones(1);
      expect(etiquetas()).toEqual(['Tomar asistencia', 'Ver detalles', 'Ajustar horario']);
    });

    it('una sesión cancelada no se toma, no se proyecta, no se reprograma ni se vuelve a cancelar; sí muestra detalles', () => {
      const comp = renderConBanderas([{ ...session(1), estado: 'CANCELADA' }]);
      const items = comp.accionesDe({ ...session(1), estado: 'CANCELADA' });
      expect(items.map((i) => [i.id, !!i.disabled])).toEqual([
        ['tomar', true], ['proyectar', true], ['detalle', false], ['ajustar', true],
      ]);
    });

    it('una sesión pendiente de aprobación no se toma ni se proyecta, pero sí se puede ajustar o cancelar', () => {
      const comp = renderConBanderas([session(1)]);
      const pendiente = { ...session(1), pendienteAprobacion: true };
      const items = comp.accionesDe(pendiente);
      expect(items.map((i) => [i.id, !!i.disabled])).toEqual([
        ['tomar', true], ['proyectar', true], ['detalle', false], ['ajustar', false], ['cancelar', false],
      ]);
    });

    it('DEC-065 (2): una sesión pendiente explica por qué no se puede tomar todavía', () => {
      renderConBanderas([{ ...session(1), pendienteAprobacion: true }, session(2)]);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="sesion-pendiente-1"]')?.textContent?.trim()).toBe('Disponible cuando la coordinación apruebe la sesión.');
      expect(el.querySelector('[data-testid="sesion-pendiente-2"]')).toBeNull();
    });

    it('elegir una acción la emite con su sesión y no abre la toma por el clic de la fila', () => {
      const comp = renderConBanderas([session(1), session(2)]);
      const acciones: string[] = [];
      const abiertas: string[] = [];
      comp.accionSesion.subscribe((e) => acciones.push(`${e.accion}:${e.sesion.id}`));
      comp.selectSession.subscribe((id) => abiertas.push(id));

      for (const id of ['accion-detalle-2', 'accion-ajustar-2', 'accion-cancelar-2', 'accion-tomar-2', 'accion-proyectar-2']) {
        abrirAcciones(2);
        opcion(id).click();
        fixture.detectChanges();
      }

      expect(acciones).toEqual(['detalle:sesion-2', 'ajustar:sesion-2', 'cancelar:sesion-2', 'tomar:sesion-2', 'proyectar:sesion-2']);
      expect(abiertas).toEqual([]);
    });

    it('el clic en el resto de la fila sigue abriendo la toma de esa sesión', () => {
      const comp = renderConBanderas([session(1)]);
      const abiertas: string[] = [];
      comp.selectSession.subscribe((id) => abiertas.push(id));
      ((fixture.nativeElement as HTMLElement).querySelector('tbody tr td') as HTMLElement).click();
      expect(abiertas).toEqual(['sesion-1']);
    });

    it('el panel del menú flota sobre la tabla para que no lo recorte su desplazamiento', () => {
      renderConBanderas([session(1)]);
      abrirAcciones(1);
      const panel = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="acciones-sesion-1"] [role="menu"]') as HTMLElement;
      expect(panel.className).toContain('fixed');
      // La celda es whitespace-nowrap: el panel restablece el ajuste para que cada opcion vaya en su renglon.
      expect(panel.className).toContain('whitespace-normal');
    });
  });
});

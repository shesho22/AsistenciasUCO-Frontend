import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TeacherGrupoHubComponent } from './teacher-grupo-hub.component';
import { Course } from '../../../../core/models/course.model';
import { ClassSession } from '../../../../core/models/attendance.model';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { NEVER, of } from 'rxjs';
import { RevisionCancelacionService } from '../../../../core/services/revision-cancelacion.service';

// LB-001B.1B (DB source of truth cleanup, PLAN.md AS-IS #13): retiro de la lectura de
// Course.docenteName sintetizado en la ficha del hub.

describe('TeacherGrupoHubComponent', () => {
  let fixture: ComponentFixture<TeacherGrupoHubComponent>;

  const MARCADOR_DOCENTE = 'MARCADOR-DOCENTE-NO-DEBE-RENDERIZARSE';

  const course: Course = {
    id: 'crs-1',
    code: 'MAT-301',
    name: 'Matemática Avanzada III',
    section: 'Sección A',
    schedule: 'Lun, Mié 08:00 - 10:00 AM',
    room: 'Aula A-204',
    enrolledStudentsCount: 32,
    cupoMaximo: 35,
    docenteName: MARCADOR_DOCENTE,
    colorCategory: 'emerald',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TeacherGrupoHubComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RealtimeService, useValue: { startForGroup: () => undefined, stop: () => undefined, events: () => NEVER, connectionState$: NEVER } },
      ],
    });
    fixture = TestBed.createComponent(TeacherGrupoHubComponent);
  });

  /** Abre el menu "Mas acciones" del grupo y devuelve el texto de sus opciones. */
  const textoMenu = (): string => {
    const el = fixture.nativeElement as HTMLElement;
    if (!el.querySelector('[role="menu"]')) {
      el.querySelector<HTMLButtonElement>('[data-testid="action-menu-trigger"]')?.click();
      fixture.detectChanges();
    }
    return el.querySelector('[role="menu"]')?.textContent ?? '';
  };

  it('no renderiza docenteName en la ficha de encabezado del grupo', () => {
    fixture.componentRef.setInput('selectedCourse', course);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain(MARCADOR_DOCENTE);
  });

  // LB-001B.5A: HorarioDocente no entrega aula; QR de sesión y Cancelar no tienen contrato.
  it('no presenta aula aunque el curso la traiga (legacy) ni la pestaña "Horario & Aula"', () => {
    fixture.componentRef.setInput('selectedCourse', course);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('Aula');
    expect(text).not.toContain('A-204');
    expect(text).toContain('Horario');
  });

  it('oculta "Proyectar Auto-Registro" (QR de sesión) por defecto y lo muestra solo con feature explícita', () => {
    fixture.componentRef.setInput('selectedCourse', course);
    fixture.detectChanges();
    expect(textoMenu()).not.toContain('Proyectar Auto-Registro');

    fixture.componentRef.setInput('sessionQrEnabled', true);
    fixture.detectChanges();
    expect(textoMenu()).toContain('Proyectar Auto-Registro');
  });

  it('F-RED-06 el hub no renderiza la pestaña ni la bandeja de solicitudes de ingreso', () => {
    fixture.componentRef.setInput('selectedCourse', course);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-tab="solicitudes"]')).toBeNull();
    expect(el.querySelector('app-teacher-grupo-solicitudes')).toBeNull();
    expect(el.textContent).not.toContain('Solicitudes');
  });

  it('HU051 RT-10 propaga Retirar del padrón al padre', () => {
    const retirar = jasmine.createSpy('retirarEstudiante');
    fixture.componentInstance.retirarEstudiante.subscribe(retirar);
    fixture.componentRef.setInput('selectedCourse', course);
    fixture.componentRef.setInput('estudiantes', [{ idEstudiante: 'est-1', nombreCompleto: 'Ana Gómez', codigoEstado: 'A' }]);
    fixture.componentInstance.subPestanaHub.set('ESTUDIANTES');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button[data-accion="retirar"]') as HTMLButtonElement).click();

    expect(retirar).toHaveBeenCalledWith(jasmine.objectContaining({ idEstudiante: 'est-1' }));
  });

  it('el badge muestra el conteo solo después de una carga completa', () => {
    fixture.componentRef.setInput('selectedCourse', course);
    fixture.componentInstance.subPestanaHub.set('RECLAMOS');
    fixture.componentRef.setInput('reclamos', [{ id: 'r1' }, { id: 'r2' }]);
    fixture.componentRef.setInput('estadoCargaReclamos', 'LOADING');
    fixture.detectChanges();
    const count = fixture.nativeElement.querySelector('[data-testid="grupo-reclamos-count"]') as HTMLElement;
    expect(count.textContent?.trim()).not.toBe('0');
    expect(count.textContent?.trim()).toBe('…');

    fixture.componentRef.setInput('estadoCargaReclamos', 'LOADED');
    fixture.detectChanges();
    expect(count.textContent?.trim()).toBe('2');

    fixture.componentRef.setInput('estadoCargaReclamos', 'UNAVAILABLE');
    fixture.detectChanges();
    expect(count.textContent?.trim()).toBe('—');
  });

  describe('UX densidad: una accion primaria y un menu', () => {
    it('la ficha del grupo solo conserva el menu de acciones; la accion primaria vive en el modo Hoy', () => {
      fixture.componentRef.setInput('selectedCourse', course);
      fixture.componentRef.setInput('sessionQrEnabled', true);
      fixture.detectChanges();
      const ficha = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="hub-acciones"]') as HTMLElement;
      const visibles = Array.from(ficha.querySelectorAll('button')).filter((b) => !b.hasAttribute('role'));
      expect(visibles.length).toBe(1);
      expect(ficha.querySelector('[data-testid="hub-tomar-asistencia"]')).toBeNull();
    });

    it('"QR / PIN Matricula" y "Proyectar Auto-Registro" del menu emiten matricular y proyectarQr', () => {
      const matricular = jasmine.createSpy('matricular');
      const proyectar = jasmine.createSpy('proyectarQr');
      fixture.componentInstance.matricular.subscribe(matricular);
      fixture.componentInstance.proyectarQr.subscribe(proyectar);
      fixture.componentRef.setInput('selectedCourse', course);
      fixture.componentRef.setInput('sessionQrEnabled', true);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      textoMenu();
      (el.querySelector('[data-testid="hub-matricula-qr"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      textoMenu();
      (el.querySelector('[data-testid="hub-proyectar-qr"]') as HTMLButtonElement).click();
      expect(matricular).toHaveBeenCalledOnceWith(course);
      expect(proyectar).toHaveBeenCalledOnceWith(course);
    });

    it('la barra superior no repite el codigo del grupo ni el chip "Grupo Activo"', () => {
      fixture.componentRef.setInput('selectedCourse', course);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Grupo Activo');
    });
  });

  describe('F3-DOC-03 modos Hoy y Grupo, y conteo unico de sesiones', () => {
    const AHORA = new Date('2026-09-14T15:00:00Z');
    const sesion = (id: string, n: number, inicio: string, fin: string, extra: Partial<ClassSession> = {}): ClassSession => ({
      id, courseId: 'crs-1', sessionNumber: n, title: `Sesion ${n}`, date: '2026-09-14', startTime: '08:00', endTime: '10:00',
      records: [], fechaHoraInicio: inicio, fechaHoraFin: fin, ...extra,
    });
    const enCurso = sesion('ses-hoy', 3, '2026-09-14T14:00:00Z', '2026-09-14T16:00:00Z');
    const pasada = sesion('ses-1', 1, '2026-09-07T13:00:00Z', '2026-09-07T15:00:00Z');
    const cancelada = sesion('ses-2', 2, '2026-09-08T13:00:00Z', '2026-09-08T15:00:00Z', { estado: 'CANCELADA' });
    const proxima = sesion('ses-4', 4, '2026-09-21T13:00:00Z', '2026-09-21T15:00:00Z');

    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const q = (sel: string): HTMLElement | null => el().querySelector(sel);

    function abrir(sesiones: ClassSession[] = [pasada, cancelada, enCurso, proxima]): void {
      fixture.componentRef.setInput('selectedCourse', course);
      fixture.componentRef.setInput('sessions', sesiones);
      fixture.componentRef.setInput('ahora', AHORA);
      fixture.detectChanges();
    }

    it('abre en el modo Hoy y no muestra las pestañas del grupo', () => {
      abrir();
      expect(q('[data-testid="hub-hoy"]')).not.toBeNull();
      expect(q('[data-testid="hub-grupo-tabs"]')).toBeNull();
      expect(q('[data-testid="hub-modo-hoy"]')?.getAttribute('aria-selected')).toBe('true');
      expect(q('[data-testid="hub-modo-grupo"]')?.getAttribute('aria-selected')).toBe('false');
    });

    it('Hoy muestra la sesion en curso con "Tomar asistencia" como accion primaria que emite esa sesion', () => {
      const tomar = jasmine.createSpy('tomarAsistenciaSesion');
      fixture.componentInstance.tomarAsistenciaSesion.subscribe(tomar);
      abrir();
      expect(q('[data-testid="hub-hoy"]')?.textContent).toContain('Sesión en curso');
      expect(q('[data-testid="hub-hoy"]')?.textContent).toContain('Sesion 3');
      (q('[data-testid="hub-tomar-asistencia"]') as HTMLButtonElement).click();
      expect(tomar).toHaveBeenCalledOnceWith(enCurso);
      expect(el().querySelectorAll('[data-testid="hub-tomar-asistencia"]').length).toBe(1);
    });

    it('sin sesion en curso Hoy muestra la proxima sesion', () => {
      abrir([pasada, proxima]);
      expect(q('[data-testid="hub-hoy"]')?.textContent).toContain('Próxima sesión');
      expect(q('[data-testid="hub-hoy"]')?.textContent).toContain('Sesion 4');
    });

    it('Hoy muestra el estado de la sesion y el QR solo si el QR esta habilitado', () => {
      const proyectar = jasmine.createSpy('proyectarSesion');
      fixture.componentInstance.proyectarSesion.subscribe(proyectar);
      abrir();
      expect(q('[data-testid="hub-hoy-estado"]')?.textContent).toContain('En curso');
      expect(q('[data-testid="hub-hoy-qr"]')).toBeNull();

      fixture.componentRef.setInput('sessionQrEnabled', true);
      fixture.detectChanges();
      (q('[data-testid="hub-hoy-qr"]') as HTMLButtonElement).click();
      expect(proyectar).toHaveBeenCalledOnceWith(enCurso);
    });

    it('sin sesiones vigentes Hoy lo dice con un estado vacio y "Tomar asistencia" abre la toma del grupo', () => {
      const irAsistencia = jasmine.createSpy('irAsistencia');
      fixture.componentInstance.irAsistencia.subscribe(irAsistencia);
      abrir([pasada, cancelada]);
      expect(q('[data-testid="hub-hoy"] app-empty-state')).not.toBeNull();
      (q('[data-testid="hub-tomar-asistencia"]') as HTMLButtonElement).click();
      expect(irAsistencia).toHaveBeenCalledOnceWith(course);
    });

    it('el modo Grupo ofrece planilla, cronograma, reclamos y matricula, sin pestaña de horario', () => {
      abrir();
      (q('[data-testid="hub-modo-grupo"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.subPestanaHub()).toBe('SABANA');
      const tabs = Array.from(el().querySelectorAll('[data-testid="hub-grupo-tabs"] [role="tab"]')).map((t) => t.textContent!.replace(/\s+/g, ' ').trim());
      expect(tabs.length).toBe(4);
      expect(tabs[0]).toContain('Planilla');
      expect(tabs[1]).toContain('Cronograma');
      expect(tabs[2]).toContain('Reclamos');
      expect(tabs[3]).toContain('Matrícula');
      expect(q('[data-testid="hub-hoy"]')).toBeNull();
      expect(el().querySelector('app-teacher-grupo-horarios')).toBeNull();
    });

    it('cambiar de pestaña del grupo y volver a Hoy', () => {
      abrir();
      (q('[data-testid="hub-modo-grupo"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      (q('[data-testid="hub-tab-sesiones"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.subPestanaHub()).toBe('SESIONES');
      expect(el().querySelector('app-teacher-grupo-sesiones')).not.toBeNull();

      (q('[data-testid="hub-modo-hoy"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.subPestanaHub()).toBe('HOY');
      expect(q('[data-testid="hub-hoy"]')).not.toBeNull();
    });

    it('el conteo de sesiones es uno solo y trae su definicion', () => {
      abrir();
      const conteo = q('[data-testid="hub-conteo-sesiones"]') as HTMLElement;
      expect(conteo.textContent!.replace(/\s+/g, ' ').trim()).toContain('4 programadas · 1 ejecutada · 1 cancelada');
      expect(conteo.getAttribute('title')).toContain('Programadas:');
      expect(el().textContent!.match(/programada/g)?.length).toBe(1);
    });

    it('las pestañas del grupo ya no muestran el total de sesiones como badge', () => {
      abrir();
      fixture.componentInstance.subPestanaHub.set('SESIONES');
      fixture.detectChanges();
      const tab = q('[data-testid="hub-tab-sesiones"]') as HTMLElement;
      expect(tab.textContent).not.toMatch(/\d/);
    });

    it('la barra de modos tiene scroll horizontal propio para movil', () => {
      abrir();
      fixture.componentInstance.subPestanaHub.set('SABANA');
      fixture.detectChanges();
      expect((q('[data-testid="hub-grupo-tabs"]') as HTMLElement).className).toContain('overflow-x-auto');
    });
  });
  describe('DEC-065 decisiones pendientes a un clic', () => {
    const pendiente = {
      id: 'rev-1',
      estado: 'PENDIENTE_DOCENTE',
      estudiante: { id: 'e1', nombreCompleto: 'Ana Pérez' },
      porcentajeActual: 23,
      umbralPerdida: 20,
    };
    const respuesta = (items: unknown[]) => ({
      exitoso: true, elementos: items, numeroPagina: 1, tamanoPagina: 50, totalElementos: items.length, totalPaginas: 1,
    });

    function abrir(items: unknown[]): void {
      const servicio = TestBed.inject(RevisionCancelacionService);
      spyOn(servicio, 'consultarDocente').and.returnValue(of(respuesta(items)) as never);
      fixture.componentRef.setInput('selectedCourse', course);
      fixture.detectChanges();
      fixture.detectChanges();
    }
    const el = () => fixture.nativeElement as HTMLElement;

    it('en el modo Hoy muestra la tarjeta de Decisiones pendientes cuando hay revisiones', () => {
      abrir([pendiente]);
      expect(el().querySelector('[data-testid="hub-hoy"]')).toBeTruthy();
      expect(el().querySelector('[data-testid="decisiones-tarjeta"]')?.textContent).toContain('Ana Pérez');
    });

    it('en el modo Hoy sin pendientes no muestra la tarjeta ni el estado vacío', () => {
      abrir([]);
      expect(el().querySelector('[data-testid="decisiones-tarjeta"]')).toBeNull();
      expect(el().querySelector('[data-testid="decisiones-vacio"]')).toBeNull();
    });

    it('en la Planilla del modo Grupo sin pendientes muestra el estado vacío discreto', () => {
      abrir([]);
      fixture.componentRef.setInput('subPestanaHub', 'SABANA');
      fixture.detectChanges();
      expect(el().querySelector('[data-testid="decisiones-vacio"]')).toBeTruthy();
    });

    it('al registrar una decisión sube el contador de refresco de la planilla', () => {
      abrir([pendiente]);
      fixture.componentRef.setInput('subPestanaHub', 'SABANA');
      fixture.detectChanges();
      const hub = fixture.componentInstance as unknown as { refrescoPlanilla: () => number };
      expect(hub.refrescoPlanilla()).toBe(0);
      const tarjeta = fixture.debugElement.query((d) => d.name === 'app-teacher-grupo-decisiones');
      tarjeta.componentInstance['decisionRegistrada'].emit();
      expect(hub.refrescoPlanilla()).toBe(1);
    });
  });
});

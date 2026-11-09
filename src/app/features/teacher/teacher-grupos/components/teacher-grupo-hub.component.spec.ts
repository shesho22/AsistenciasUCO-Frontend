import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherGrupoHubComponent } from './teacher-grupo-hub.component';
import { Course } from '../../../../core/models/course.model';

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
    it('la ficha ofrece "Tomar Asistencia Hoy" como unica accion visible y emite irAsistencia', () => {
      const irAsistencia = jasmine.createSpy('irAsistencia');
      fixture.componentInstance.irAsistencia.subscribe(irAsistencia);
      fixture.componentRef.setInput('selectedCourse', course);
      fixture.componentRef.setInput('sessionQrEnabled', true);
      fixture.detectChanges();
      const ficha = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="hub-acciones"]') as HTMLElement;
      const visibles = Array.from(ficha.querySelectorAll('button')).filter((b) => !b.hasAttribute('role'));
      expect(visibles.length).toBe(2);
      (ficha.querySelector('[data-testid="hub-tomar-asistencia"]') as HTMLButtonElement).click();
      expect(irAsistencia).toHaveBeenCalledOnceWith(course);
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
});

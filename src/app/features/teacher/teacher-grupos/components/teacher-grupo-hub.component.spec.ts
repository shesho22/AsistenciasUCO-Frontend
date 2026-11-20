import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { TeacherGrupoHubComponent, pestanaDeGrupo } from './teacher-grupo-hub.component';
import { TeacherGrupoEstudiantesComponent } from './teacher-grupo-estudiantes.component';
import { TeacherGrupoReclamosComponent } from './teacher-grupo-reclamos.component';
import { Course } from '../../../../core/models/course.model';
import { ClassSession } from '../../../../core/models/attendance.model';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { NEVER, of } from 'rxjs';
import { RevisionCancelacionService } from '../../../../core/services/revision-cancelacion.service';
import { TeacherMatrizAsistenciaService } from '../../../../core/services/teacher-matriz-asistencia.service';
import { ResumenSesionesGrupo } from '../../../../core/models/resumen-sesiones-grupo.model';
import { resumenSesiones } from '../../../../core/testing/resumen-sesiones-grupo.fixture';

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
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: RealtimeService, useValue: { startForGroup: () => undefined, stop: () => undefined, events: () => NEVER, connectionState$: NEVER } },
        // La planilla del hub pide su pagina al servidor: aqui no llega nada (estas pruebas no la verifican).
        { provide: TeacherMatrizAsistenciaService, useValue: { consultarMatriz: () => NEVER, consultarResumenSesiones: () => NEVER } },
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
    // CIERRE-W1A: la pestaña Matrícula pinta la página que entrega el servidor (`padronPagina`), no el padrón completo.
    fixture.componentRef.setInput('padronPagina', [{ idEstudiante: 'est-1', nombreCompleto: 'Ana Gómez', codigoEstado: 'A' }]);
    fixture.componentInstance.subPestanaHub.set('ESTUDIANTES');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button[data-accion="retirar"]') as HTMLButtonElement).click();

    expect(retirar).toHaveBeenCalledWith(jasmine.objectContaining({ idEstudiante: 'est-1' }));
  });

  it('CIERRE-W1A la pestaña Matrícula muestra la página y el total del servidor y reenvía página, tamaño y búsqueda', () => {
    const pagina = jasmine.createSpy('pagina');
    const tamano = jasmine.createSpy('tamano');
    const busqueda = jasmine.createSpy('busqueda');
    fixture.componentInstance.paginaPadronChange.subscribe(pagina);
    fixture.componentInstance.tamanoPadronChange.subscribe(tamano);
    fixture.componentInstance.busquedaPadronChange.subscribe(busqueda);
    fixture.componentRef.setInput('selectedCourse', course);
    fixture.componentRef.setInput('padronPagina', [{ idEstudiante: 'est-1', nombreCompleto: 'Ana Gómez', codigoEstado: 'A' }]);
    fixture.componentRef.setInput('totalEstudiantes', 40);
    fixture.componentRef.setInput('paginaPadron', 2);
    fixture.componentInstance.subPestanaHub.set('ESTUDIANTES');
    fixture.detectChanges();

    const padron = fixture.debugElement.query(By.directive(TeacherGrupoEstudiantesComponent)).componentInstance as TeacherGrupoEstudiantesComponent;
    expect(padron.estudiantes().map((e) => e.idEstudiante)).toEqual(['est-1']);
    expect(padron.totalEstudiantes()).toBe(40);
    expect(padron.pagina()).toBe(2);
    padron.paginaChange.emit(3);
    padron.tamanoChange.emit(24);
    padron.busquedaChange.emit('ana');

    expect(pagina).toHaveBeenCalledOnceWith(3);
    expect(tamano).toHaveBeenCalledOnceWith(24);
    expect(busqueda).toHaveBeenCalledOnceWith('ana');
  });

  it('CIERRE-W1A la pestaña Reclamos muestra el total del servidor y reenvía el cambio de página', () => {
    const pagina = jasmine.createSpy('paginaReclamos');
    fixture.componentInstance.paginaReclamosChange.subscribe(pagina);
    fixture.componentRef.setInput('selectedCourse', course);
    fixture.componentRef.setInput('estadoCargaReclamos', 'LOADED');
    fixture.componentRef.setInput('reclamos', [{ id: 'r-1', estudianteNombre: 'Ana', estadoSolicitud: 'PENDIENTE', justificacionSolicitud: 'x', fechaSolicitud: '2026-11-01' }]);
    fixture.componentRef.setInput('totalReclamos', 23);
    fixture.componentRef.setInput('paginaReclamos', 2);
    fixture.componentInstance.subPestanaHub.set('RECLAMOS');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="grupo-reclamos-count"]').textContent.trim()).toBe('23');
    const lista = fixture.debugElement.query(By.directive(TeacherGrupoReclamosComponent)).componentInstance as TeacherGrupoReclamosComponent;
    expect(lista.pagina()).toBe(2);
    expect(lista.totalReclamos()).toBe(23);
    lista.paginaChange.emit(3);

    expect(pagina).toHaveBeenCalledOnceWith(3);
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
    it('la ficha del grupo tiene una accion primaria "Tomar asistencia" y el menu de acciones', () => {
      const irAsistencia = jasmine.createSpy('irAsistencia');
      fixture.componentInstance.irAsistencia.subscribe(irAsistencia);
      fixture.componentRef.setInput('selectedCourse', course);
      fixture.componentRef.setInput('sessionQrEnabled', true);
      fixture.detectChanges();
      const ficha = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="hub-acciones"]') as HTMLElement;
      const visibles = Array.from(ficha.querySelectorAll('button')).filter((b) => !b.hasAttribute('role'));
      expect(visibles).toHaveSize(2);
      const tomar = ficha.querySelector('[data-testid="hub-tomar-asistencia"]') as HTMLButtonElement;
      expect(tomar.textContent).toContain('Tomar asistencia');
      tomar.click();
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

  describe('ATA D9: grupo sin modo Hoy y conteo unico de sesiones (CIERRE-W3M: lo decide el servidor)', () => {
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

    const resumenDelServidor = (parcial: Partial<ResumenSesionesGrupo> = {}): ResumenSesionesGrupo =>
      resumenSesiones({
        sesionesProgramadas: 4, sesionesEjecutadas: 1, sesionesCanceladas: 1, sesionesEnCurso: 1,
        idSesionEnCurso: 'ses-hoy', idSesionProxima: 'ses-4', ...parcial,
      });

    function abrir(sesiones: ClassSession[] = [pasada, cancelada, enCurso, proxima], resumen: ResumenSesionesGrupo | null = resumenDelServidor()): void {
      fixture.componentRef.setInput('selectedCourse', course);
      fixture.componentRef.setInput('sessions', sesiones);
      fixture.componentRef.setInput('resumenSesiones', resumen);
      fixture.detectChanges();
    }

    it('abre en la Planilla, sin conmutador Hoy/Grupo ni seccion Hoy', () => {
      abrir();
      expect(fixture.componentInstance.subPestanaHub()).toBe('SABANA');
      expect(q('[data-testid="hub-modo-hoy"]')).toBeNull();
      expect(q('[data-testid="hub-modo-grupo"]')).toBeNull();
      expect(q('[data-testid="hub-hoy"]')).toBeNull();
      expect(q('[data-testid="hub-tab-sabana"]')?.getAttribute('aria-selected')).toBe('true');
      expect(el().querySelector('app-teacher-grupo-sabana')).not.toBeNull();
    });

    it('ofrece planilla, reclamos y matricula; el cronograma vive en el historial de la toma de asistencia', () => {
      abrir();
      const tabs = Array.from(el().querySelectorAll('[data-testid="hub-grupo-tabs"] [role="tab"]')).map((t) => t.textContent!.replace(/\s+/g, ' ').trim());
      expect(tabs).toHaveSize(3);
      expect(tabs[0]).toContain('Planilla');
      expect(tabs[1]).toContain('Justificaciones');
      expect(tabs[2]).toContain('Matrícula');
      expect(q('[data-testid="hub-tab-sesiones"]')).toBeNull();
      expect(el().textContent).not.toContain('Cronograma');
      expect(el().querySelector('app-teacher-grupo-horarios')).toBeNull();
    });

    it('cambiar de pestaña del grupo muestra su contenido', () => {
      abrir();
      (q('[data-testid="hub-tab-estudiantes"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.subPestanaHub()).toBe('ESTUDIANTES');
      expect(el().querySelector('app-teacher-grupo-estudiantes')).not.toBeNull();
    });

    it('pestanaDeGrupo acepta las tres pestañas y devuelve Planilla para lo desconocido o retirado', () => {
      expect(pestanaDeGrupo('ESTUDIANTES')).toBe('ESTUDIANTES');
      // Un enlace viejo a la pestaña Cronograma (retirada el 2026-11-18) abre la planilla.
      expect(pestanaDeGrupo('SESIONES')).toBe('SABANA');
      expect(pestanaDeGrupo('RECLAMOS')).toBe('RECLAMOS');
      expect(pestanaDeGrupo('SABANA')).toBe('SABANA');
      expect(pestanaDeGrupo('HOY')).toBe('SABANA');
      expect(pestanaDeGrupo('x')).toBe('SABANA');
      expect(pestanaDeGrupo(null)).toBe('SABANA');
      expect(pestanaDeGrupo(undefined)).toBe('SABANA');
    });

    it('el conteo de sesiones es uno solo y trae su definicion', () => {
      abrir();
      const conteo = q('[data-testid="hub-conteo-sesiones"]') as HTMLElement;
      expect(conteo.textContent!.replace(/\s+/g, ' ').trim()).toContain('4 programadas · 1 ejecutada · 1 cancelada');
      expect(conteo.getAttribute('title')).toContain('Programadas:');
      expect(el().textContent!.match(/programada/g)?.length).toBe(1);
    });

    it('sin resumen del servidor no inventa conteos', () => {
      abrir([pasada, enCurso, proxima], null);
      expect((q('[data-testid="hub-conteo-sesiones"]') as HTMLElement).textContent!.replace(/\s+/g, ' ').trim()).toContain('Sesiones: —');
    });

    it('la barra de pestañas tiene scroll horizontal propio para movil', () => {
      abrir();
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

    it('muestra la tarjeta de Decisiones pendientes cuando hay revisiones', () => {
      abrir([pendiente]);
      expect(el().querySelector('[data-testid="decisiones-tarjeta"]')?.textContent).toContain('Ana Pérez');
    });

    it('en otra pestaña distinta de la Planilla, sin pendientes, no muestra la tarjeta ni el estado vacío', () => {
      abrir([]);
      fixture.componentRef.setInput('subPestanaHub', 'RECLAMOS');
      fixture.detectChanges();
      expect(el().querySelector('[data-testid="decisiones-tarjeta"]')).toBeNull();
      expect(el().querySelector('[data-testid="decisiones-vacio"]')).toBeNull();
    });

    it('en la Planilla sin pendientes muestra el estado vacío discreto', () => {
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

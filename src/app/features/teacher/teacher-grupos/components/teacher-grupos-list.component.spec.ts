import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherGruposListComponent } from './teacher-grupos-list.component';
import { Course } from '../../../../core/models/course.model';

// LB-001B.1B (DB source of truth cleanup, PLAN.md AS-IS #24): retiro de la lectura de
// Course.docenteName sintetizado en la tarjeta de listado de grupos.

describe('TeacherGruposListComponent', () => {
  let fixture: ComponentFixture<TeacherGruposListComponent>;

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
      imports: [TeacherGruposListComponent],
    });
    fixture = TestBed.createComponent(TeacherGruposListComponent);
  });

  it('no renderiza docenteName en la tarjeta del grupo', () => {
    fixture.componentRef.setInput('courses', [course]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain(MARCADOR_DOCENTE);
  });

  describe('CIERRE-W3I: total de estudiantes desde el servidor', () => {
    const total = (): string =>
      ((fixture.nativeElement as HTMLElement).querySelector('[data-testid="total-estudiantes"]')?.textContent ?? '').trim();

    it('muestra el total que entrega el servidor, no la suma de enrolledStudentsCount de la lista', () => {
      fixture.componentRef.setInput('courses', [course, { ...course, id: 'crs-2', enrolledStudentsCount: 10 }]);
      fixture.componentRef.setInput('totalEstudiantes', 77);
      fixture.componentRef.setInput('isLoading', false);
      fixture.detectChanges();
      expect(total()).toBe('77');
    });

    it('un cero del servidor es un cero legitimo', () => {
      fixture.componentRef.setInput('courses', [course]);
      fixture.componentRef.setInput('totalEstudiantes', 0);
      fixture.componentRef.setInput('isLoading', false);
      fixture.detectChanges();
      expect(total()).toBe('0');
    });

    it('mientras no llega o si falla muestra «—» y no una suma local', () => {
      fixture.componentRef.setInput('courses', [course]);
      fixture.componentRef.setInput('totalEstudiantes', null);
      fixture.componentRef.setInput('isLoading', false);
      fixture.detectChanges();
      expect(total()).toBe('—');
    });
  });

  it('DEC-065 (4): el docente no ve la acción "Nuevo grupo"', () => {
    fixture.componentRef.setInput('courses', [course]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="nuevo-grupo"]')).toBeNull();
    expect(el.textContent).not.toContain('Nuevo grupo');
  });


  // LB-001B.5A: sin aula (HorarioDocente no la entrega) y sin QR de sesión (sin contrato).
  it('no presenta aula ni permite buscar por aula', () => {
    fixture.componentRef.setInput('courses', [course]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('A-204');
    expect(text).not.toContain('Aula');
    expect(fixture.componentInstance.filteredCourses()).toHaveSize(1);
    fixture.componentInstance.searchQuery.set('a-204');
    expect(fixture.componentInstance.filteredCourses()).toEqual([]);
  });

  it('tolera cursos sin room (Course.room opcional) sin lanzar', () => {
    const { room, ...sinAula } = course;
    fixture.componentRef.setInput('courses', [sinAula]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentInstance.searchQuery.set('mat');

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.componentInstance.filteredCourses()).toHaveSize(1);
  });

  it('emite seleccionarGrupo al pulsar el nombre del grupo o «Ver Grupo» en su fila', () => {
    spyOn(fixture.componentInstance.seleccionarGrupo, 'emit');
    fixture.componentRef.setInput('courses', [course]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    const fila = (fixture.nativeElement as HTMLElement).querySelector('tr[data-testid="grupo-fila"]') as HTMLElement;
    (fila.querySelector('td button') as HTMLButtonElement).click();
    (fila.querySelector('[data-testid="ver-grupo-crs-1"] button') as HTMLButtonElement).click();

    expect(fixture.componentInstance.seleccionarGrupo.emit).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.seleccionarGrupo.emit).toHaveBeenCalledWith(course);
  });

  describe('bloque E: tabla de grupos', () => {
    const filas = (): NodeListOf<HTMLTableRowElement> =>
      (fixture.nativeElement as HTMLElement).querySelectorAll('tr[data-testid="grupo-fila"]');

    it('renderiza una tabla con una fila por grupo y sin tarjetas', () => {
      fixture.componentRef.setInput('courses', [course, { ...course, id: 'crs-2', name: 'Bases de Datos' }]);
      fixture.componentRef.setInput('isLoading', false);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-tabla-datos table')).toBeTruthy();
      expect(el.querySelector('app-card')).toBeNull();
      expect(filas().length).toBe(2);
      expect(filas()[0].textContent).toContain('MAT-301');
      expect(filas()[0].textContent).toContain('32 / 35 cupos');
      expect(filas()[0].textContent).toContain('Lun, Mié 08:00 - 10:00 AM');
    });

    it('pagina de 15 en 15 y vuelve a la página 1 al buscar', () => {
      const muchos = Array.from({ length: 17 }, (_, i) => ({ ...course, id: `crs-${i}`, name: `Grupo ${i}` }));
      fixture.componentRef.setInput('courses', muchos);
      fixture.componentRef.setInput('isLoading', false);
      fixture.detectChanges();
      expect(filas().length).toBe(15);

      fixture.componentInstance.pagina.set(2);
      fixture.detectChanges();
      expect(filas().length).toBe(2);

      fixture.componentInstance.searchQuery.set('grupo 1');
      fixture.detectChanges();
      expect(fixture.componentInstance.pagina()).toBe(1);
    });

    it('mientras carga no pinta filas de grupos', () => {
      fixture.componentRef.setInput('courses', [course]);
      fixture.componentRef.setInput('isLoading', true);
      fixture.detectChanges();
      expect(filas().length).toBe(0);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="tabla-datos-esqueleto"]')).toBeTruthy();
    });
  });

  it('HU058: filtra por nivel formativo con el catálogo real y muestra el tipo en la tarjeta', () => {
    const pregrado: Course = { ...course, id: 'crs-pre', name: 'Cálculo', idTipoPrograma: 'TP-PRE', nombreTipoPrograma: 'pregrado' };
    const postgrado: Course = { ...course, id: 'crs-pos', name: 'Analítica', idTipoPrograma: 'TP-POS', nombreTipoPrograma: 'postgrado' };
    fixture.componentRef.setInput('courses', [pregrado, postgrado]);
    fixture.componentRef.setInput('tiposPrograma', [
      { id: 'TP-PRE', codigo: 'PRE', nombre: 'pregrado' },
      { id: 'TP-POS', codigo: 'POS', nombre: 'postgrado' },
    ]);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const select = host.querySelector('select[aria-label="Nivel formativo"]') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual(['Todos los niveles', 'pregrado', 'postgrado']);
    expect(host.textContent).toContain('postgrado');

    fixture.componentInstance.nivelFormativo.set('TP-POS');
    expect(fixture.componentInstance.filteredCourses().map((c) => c.id)).toEqual(['crs-pos']);
    fixture.componentInstance.nivelFormativo.set('');
    expect(fixture.componentInstance.filteredCourses()).toHaveSize(2);
  });

  it('HU058: sin catálogo de tipos de programa no muestra el filtro', () => {
    fixture.componentRef.setInput('courses', [course]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('select[aria-label="Nivel formativo"]')).toBeNull();
  });

  it('F-DOC-S01: una busqueda sin resultados muestra el mensaje de estado vacio, no una lista en blanco', () => {
    fixture.componentRef.setInput('courses', [course]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    fixture.componentInstance.searchQuery.set('zzqinexistente');
    fixture.detectChanges();

    const vacio = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="grupos-vacio"]');
    expect(vacio?.textContent).toContain('Ningún grupo coincide');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tr[data-testid="grupo-fila"]')).toHaveSize(0);
  });

  it('F-DOC-S01: sin grupos asignados indica que aun no hay grupos', () => {
    fixture.componentRef.setInput('courses', []);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="grupos-vacio"]')?.textContent).toContain('Aún no tienes grupos');
  });
  describe('decisiones por inasistencia pendientes', () => {
    const otro: Course = { ...course, id: 'crs-2', name: 'Bases de Datos', section: 'Grupo 02' };
    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const montar = (decisiones: Map<string, number>) => {
      fixture.componentRef.setInput('courses', [course, otro]);
      fixture.componentRef.setInput('isLoading', false);
      fixture.componentRef.setInput('decisionesPorGrupo', decisiones);
      fixture.detectChanges();
    };

    it('sin decisiones pendientes no muestra aviso ni marcas', () => {
      montar(new Map());
      expect(el().querySelector('[data-testid="aviso-decisiones-pendientes"]')).toBeNull();
      expect(el().querySelector('[data-testid^="decisiones-grupo-"]')).toBeNull();
    });

    it('el aviso nombra cada grupo con su total, en el orden de la lista, y la fila del grupo lleva la marca', () => {
      montar(new Map([['crs-2', 1], ['crs-1', 3], ['ajeno', 5]]));
      const filasAviso = Array.from(el().querySelectorAll('tr[data-testid="aviso-decisiones-fila"]')).map((f) =>
        Array.from(f.querySelectorAll('td')).slice(0, 2).map((td) => td.textContent?.replace(/\s+/g, ' ').trim())
      );
      expect(filasAviso).toEqual([['Matemática Avanzada III · Sección A', '3'], ['Bases de Datos · Grupo 02', '1']]);
      expect(el().querySelectorAll('[data-testid^="ir-decisiones-"]').length).toBe(2);
      expect(el().querySelector('[data-testid="ir-decisiones-crs-1"]')?.getAttribute('aria-label')).toBe('Decidir en Matemática Avanzada III · Sección A');
      expect(el().querySelector('[data-testid="decisiones-grupo-crs-1"]')?.textContent?.trim()).toBe('3 decisiones pendientes');
      expect(el().querySelector('[data-testid="decisiones-grupo-crs-2"]')?.textContent?.trim()).toBe('1 decisión pendiente');
    });

    it('el aviso y la marca de la tarjeta emiten verDecisiones sin abrir la toma de asistencia', () => {
      montar(new Map([['crs-1', 2]]));
      const vistos: Course[] = [];
      const seleccionados: Course[] = [];
      fixture.componentInstance.verDecisiones.subscribe((c) => vistos.push(c));
      fixture.componentInstance.seleccionarGrupo.subscribe((c) => seleccionados.push(c));

      (el().querySelector('[data-testid="ir-decisiones-crs-1"]') as HTMLButtonElement).click();
      (el().querySelector('[data-testid="decisiones-grupo-crs-1"]') as HTMLButtonElement).click();

      expect(vistos.map((c) => c.id)).toEqual(['crs-1', 'crs-1']);
      expect(seleccionados).toEqual([]);
    });
  });
});

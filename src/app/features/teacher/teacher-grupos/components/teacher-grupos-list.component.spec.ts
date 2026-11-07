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

  it('F3: el botón "Nuevo grupo" emite nuevoGrupo', () => {
    fixture.componentRef.setInput('courses', [course]);
    fixture.componentRef.setInput('isLoading', false);
    let emitido = false;
    fixture.componentInstance.nuevoGrupo.subscribe(() => (emitido = true));
    fixture.detectChanges();

    const boton: HTMLButtonElement | null = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="nuevo-grupo"] button');
    expect(boton).not.toBeNull();
    boton!.click();

    expect(emitido).toBeTrue();
  });

  // LB-001B.5A: sin aula (HorarioDocente no la entrega) y sin QR de sesión (sin contrato).
  it('no presenta aula ni permite buscar por aula', () => {
    fixture.componentRef.setInput('courses', [course]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('A-204');
    expect(text).not.toContain('Aula');
    expect(fixture.componentInstance.filteredCourses().length).toBe(1);
    fixture.componentInstance.searchQuery.set('a-204');
    expect(fixture.componentInstance.filteredCourses()).toEqual([]);
  });

  it('tolera cursos sin room (Course.room opcional) sin lanzar', () => {
    const { room, ...sinAula } = course;
    fixture.componentRef.setInput('courses', [sinAula]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentInstance.searchQuery.set('mat');

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.componentInstance.filteredCourses().length).toBe(1);
  });

  it('emite seleccionarGrupo al hacer clic en la tarjeta del grupo', () => {
    spyOn(fixture.componentInstance.seleccionarGrupo, 'emit');
    fixture.componentRef.setInput('courses', [course]);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('app-card');
    card.dispatchEvent(new Event('click'));

    expect(fixture.componentInstance.seleccionarGrupo.emit).toHaveBeenCalledWith(course);
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
    expect(fixture.componentInstance.filteredCourses().length).toBe(2);
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
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-card').length).toBe(0);
  });

  it('F-DOC-S01: sin grupos asignados indica que aun no hay grupos', () => {
    fixture.componentRef.setInput('courses', []);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="grupos-vacio"]')?.textContent).toContain('Aún no tienes grupos');
  });
});

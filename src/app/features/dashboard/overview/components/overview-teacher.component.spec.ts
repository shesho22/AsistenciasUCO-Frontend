import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OverviewTeacherComponent } from './overview-teacher.component';
import { Course } from '../../../../core/models/course.model';

describe('OverviewTeacherComponent (F-DOC-S02)', () => {
  const curso = (parcial: Partial<Course>): Course => ({
    id: 'g-1', name: 'Arq Software', section: 'Grupo 001', schedule: 'L 08:00', room: '-', enrolledStudentsCount: 3, colorCategory: 'emerald', ...parcial,
  } as Course);

  it('el subtitulo no muestra "undefined" cuando el grupo no trae codigo de asignatura', () => {
    TestBed.configureTestingModule({ imports: [OverviewTeacherComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(OverviewTeacherComponent);
    fixture.componentRef.setInput('courses', [curso({ code: undefined }), curso({ id: 'g-2', code: 'IS-101' }), curso({ id: 'g-3', code: '-' })]);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('undefined');
    expect(texto).toContain('IS-101 • Grupo 001');
    expect(fixture.componentInstance.subtituloCurso(curso({ code: '-' }))).toBe('Grupo 001');
  });

  it('bloque E: las asignaturas se muestran en una tabla (una fila por curso) paginada de 15 en 15', () => {
    TestBed.configureTestingModule({ imports: [OverviewTeacherComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(OverviewTeacherComponent);
    const cursos = Array.from({ length: 17 }, (_, i) => curso({ id: `g-${i}`, name: `Curso ${i}` }));
    fixture.componentRef.setInput('courses', cursos);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-tabla-datos table')).toBeTruthy();
    expect(el.querySelector('app-card')).toBeNull();
    expect(el.querySelectorAll('tr[data-testid="overview-docente-curso-fila"]').length).toBe(15);
    // Intencional: «Acceder a Sesiones y Asistencia» abre el grupo de la fila, no el primero de la lista.
    expect(el.querySelector('tr[data-testid="overview-docente-curso-fila"] a')?.getAttribute('href')).toBe('/app/asistencia?courseId=g-0');

    fixture.componentInstance.pagina.set(2);
    fixture.detectChanges();
    expect(el.querySelectorAll('tr[data-testid="overview-docente-curso-fila"]').length).toBe(2);
  });

  it('bloque E: mientras carga no pinta filas de cursos y sin cursos muestra el mensaje vacío', () => {
    TestBed.configureTestingModule({ imports: [OverviewTeacherComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(OverviewTeacherComponent);
    fixture.componentRef.setInput('courses', [curso({})]);
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('tr[data-testid="overview-docente-curso-fila"]').length).toBe(0);
    expect(el.querySelector('[data-testid="tabla-datos-esqueleto"]')).toBeTruthy();

    fixture.componentRef.setInput('courses', []);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="tabla-datos-vacia"]')?.textContent).toContain('No tienes asignaturas programadas');
  });

  it('DEC-065: muestra el KPI de revisiones pendientes de decisión con enlace a los grupos', () => {
    TestBed.configureTestingModule({ imports: [OverviewTeacherComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(OverviewTeacherComponent);
    fixture.detectChanges();
    const kpi = (fixture.nativeElement as HTMLElement).querySelector('app-revisiones-pendientes-kpi');
    expect(kpi).toBeTruthy();
    expect(kpi?.textContent).toContain('Revisiones pendientes de decisión');
    expect(kpi?.querySelector('a')?.getAttribute('href')).toBe('/app/docente/grupos');
  });
});

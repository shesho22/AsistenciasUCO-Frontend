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
});

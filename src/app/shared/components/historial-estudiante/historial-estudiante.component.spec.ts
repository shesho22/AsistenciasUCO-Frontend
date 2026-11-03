import { TestBed } from '@angular/core/testing';
import { HistorialEstudianteComponent } from './historial-estudiante.component';
import { FichaUnificadaEstudiante, MatriculaHistorial } from '../../../core/models/consultas-transversales.model';

function matricula(cambios: Partial<MatriculaHistorial>): MatriculaHistorial {
  return {
    idFacultad: 'f-1', nombreFacultad: 'Ingeniería', idPrograma: 'p-1', nombrePrograma: 'Sistemas', inpPlanEstudio: 20241,
    idPeriodoAcademico: 'per-1', codigoPeriodo: '2026-1', nombrePeriodo: 'Primer semestre 2026', idGrupo: 'g-1',
    codigoGrupo: 3, idAsignatura: 'a-1', nombreAsignatura: 'Cálculo', codigoEstadoEstudiante: 'MAT',
    nombreEstadoEstudiante: 'Matriculado',
    resumen: { sesionesEjecutadas: 10, asistencias: 9, faltasSinJustaCausa: 1, excusas: 0, porcentajeInasistencia: 10, codigoPermanencia: 'REGULAR' },
    ...cambios,
  };
}

function render(ficha: FichaUnificadaEstudiante | null): HTMLElement {
  const fixture = TestBed.createComponent(HistorialEstudianteComponent);
  fixture.componentRef.setInput('ficha', ficha);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('HistorialEstudianteComponent (HU157)', () => {
  const base: FichaUnificadaEstudiante = {
    idEstudiante: 'e-1', tipoIdentificacion: 'CC', numeroIdentificacion: '101', nombreCompleto: 'Ana', correo: null,
    activo: false, matriculas: [],
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [HistorialEstudianteComponent] }));

  it('no muestra nada sin ficha', () => {
    expect(render(null).textContent?.trim()).toBe('');
  });

  it('informa cuando el estudiante no tiene matrículas', () => {
    const texto = render(base).textContent ?? '';
    expect(texto).toContain('El estudiante no tiene matrículas registradas.');
    expect(texto).toContain('Inactivo');
    expect(texto).toContain('CC 101');
  });

  it('lista cada matrícula con período, grupo, asistencia y permanencia', () => {
    const texto = render({
      ...base,
      activo: true,
      matriculas: [
        matricula({}),
        matricula({ nombrePrograma: 'Industrial', resumen: { ...matricula({}).resumen!, codigoPermanencia: 'PERDIDA' } }),
        matricula({ idGrupo: null, nombrePeriodo: null, codigoPeriodo: null, resumen: null }),
      ],
    }).textContent ?? '';

    expect(texto).toContain('Primer semestre 2026');
    expect(texto).toContain('Cálculo · Grupo 3');
    expect(texto).toContain('9/10 sesiones');
    expect(texto).toContain('REGULAR');
    expect(texto).toContain('PERDIDA');
    expect(texto).toContain('Sin grupos');
    expect(texto).toContain('Sistemas, Industrial');
  });

  it('asigna el color de la permanencia según el código de la DB', () => {
    const component = TestBed.createComponent(HistorialEstudianteComponent).componentInstance;
    expect(component.variante('regular')).toBe('success');
    expect(component.variante('RIESGO')).toBe('warning');
    expect(component.variante('PERDIDA')).toBe('danger');
    expect(component.variante('OTRO')).toBe('neutral');
  });
});

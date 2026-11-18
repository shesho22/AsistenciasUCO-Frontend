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
    // Asistencias, faltas y excusas cuentan tomas: no se comparan con las sesiones (NB-2).
    expect(texto).toContain('9 asistencias · 1 faltas · 0 excusas');
    expect(texto).not.toContain('/10 sesiones');
    expect(texto).toContain('10 % de inasistencia (por horas)');
    expect(texto).toContain('REGULAR');
    expect(texto).toContain('PERDIDA');
    expect(texto).toContain('Sin grupos');
    expect(texto).toContain('Sistemas, Industrial');
  });

  it('agrupa las matrículas por período: todos plegados por defecto y con su conteo de riesgo', () => {
    const el = render({
      ...base,
      matriculas: [
        matricula({}),
        matricula({ resumen: { ...matricula({}).resumen!, codigoPermanencia: 'PERDIDA' } }),
        matricula({ idPeriodoAcademico: 'per-0', codigoPeriodo: '2025-2', nombrePeriodo: 'Segundo semestre 2025',
          resumen: { ...matricula({}).resumen!, codigoPermanencia: 'RIESGO' } }),
        matricula({ idPeriodoAcademico: null, codigoPeriodo: null, nombrePeriodo: null, idGrupo: null, resumen: null }),
      ],
    });
    const grupos = Array.from(el.querySelectorAll('[data-testid="periodo-historial"]')) as HTMLDetailsElement[];
    expect(grupos).toHaveSize(3);
    expect(grupos[0].textContent).toContain('Primer semestre 2026');
    expect(grupos[0].textContent).toContain('2 matrículas');
    expect(grupos[0].textContent).toContain('1 en pérdida');
    expect(grupos[0].hasAttribute('open')).toBeFalse();
    expect(grupos[1].textContent).toContain('Segundo semestre 2025');
    expect(grupos[1].textContent).toContain('1 en riesgo');
    expect(grupos[1].hasAttribute('open')).toBeFalse();
    expect(grupos[2].textContent).toContain('Sin período');
  });

  it('con las tomas dictadas del backend presenta «A de T tomas»', () => {
    const el = render({
      ...base,
      matriculas: [matricula({ resumen: { ...matricula({}).resumen!, asistencias: 28, tomasDictadas: 30 } })],
    });
    expect(el.querySelector('[data-testid="detalle-asistencia"]')?.textContent).toContain('28 de 30 tomas');
  });

  it('asigna el color de la permanencia según el código de la DB', () => {
    const component = TestBed.createComponent(HistorialEstudianteComponent).componentInstance;
    expect(component.variante('regular')).toBe('success');
    expect(component.variante('RIESGO')).toBe('warning');
    expect(component.variante('PERDIDA')).toBe('danger');
    expect(component.variante('OTRO')).toBe('neutral');
  });
});

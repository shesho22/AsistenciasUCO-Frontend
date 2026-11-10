import { nombreEstudianteRevision, porcentajeRevision } from './revision-cancelacion.util';
import { RevisionCancelacion } from './revision-cancelacion.model';

describe('revision-cancelacion.util', () => {
  const base: RevisionCancelacion = { id: 'r1', estado: 'PENDIENTE_DOCENTE' };

  it('porcentajeRevision prioriza actual, luego inasistencia, luego creación y si no hay devuelve null', () => {
    expect(porcentajeRevision({ ...base, porcentajeActual: 22, porcentajeInasistencia: 21, porcentajeCreacion: 20 })).toBe(22);
    expect(porcentajeRevision({ ...base, porcentajeInasistencia: 21, porcentajeCreacion: 20 })).toBe(21);
    expect(porcentajeRevision({ ...base, porcentajeCreacion: 20 })).toBe(20);
    expect(porcentajeRevision(base)).toBeNull();
  });

  it('nombreEstudianteRevision usa el objeto estudiante, el nombre plano o un texto neutro', () => {
    expect(nombreEstudianteRevision({ ...base, estudiante: { id: 'e', nombreCompleto: 'Ana Pérez' }, nombreEstudiante: 'X' })).toBe('Ana Pérez');
    expect(nombreEstudianteRevision({ ...base, nombreEstudiante: 'Luis Gil' })).toBe('Luis Gil');
    expect(nombreEstudianteRevision(base)).toBe('Estudiante');
  });
});

import { MateriaEstudianteApiDto } from '../api/models/estudiante-portal-api-dto.model';
import { StudentPortalMapper } from './student-portal.mapper';

const dto: MateriaEstudianteApiDto = {
  idAsignatura: 'e2f3a4b5-0000-0000-0000-000000000001',
  nombreAsignatura: 'Arquitectura de Software',
  idGrupo: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  nombreGrupo: 'Grupo 001',
};

describe('StudentPortalMapper — indicadores por horas (CULM-001 B.2, F-EST-002)', () => {
  it('B2-F-18 conserva tal cual los indicadores que entrega el backend, sin recalcularlos', () => {
    const indicadores = {
      sesionesEjecutadas: 10, horasDictadas: 20, horasAsistidas: 16, horasFalta: 3, horasExcusa: 1, horasSinRegistro: 0,
      porcentajeInasistencia: 15, porcentajeAsistencia: 80, codigoPermanencia: 'RIESGO' as const,
      umbralAdvertencia: 15, umbralPerdida: 20,
    };
    const materia = StudentPortalMapper.toMateria({ ...dto, indicadores })!;
    expect(materia.indicadores).toEqual(indicadores);
  });

  it('B2-F-18 sin indicadores en la respuesta queda null (nunca ceros inventados)', () => {
    expect(StudentPortalMapper.toMateria(dto)!.indicadores).toBeNull();
  });
});

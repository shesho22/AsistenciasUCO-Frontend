import { SesionMateriaEstudianteApiDto } from '../api/models/estudiante-portal-api-dto.model';
import { mockPaginarSesionesDto, mockResumenMateriasToDto, mockSesionesToDto } from './student-portal-mock.adapter';
import { MockMateriaEstudiante, MockSesionMateria } from './role-management.mock';

const materia = (id: string, estado: MockMateriaEstudiante['estado'], creditos: number): MockMateriaEstudiante => ({
  id, codigo: id, nombre: id, creditos, grupo: 'G1', docente: 'D', aula: 'A', horario: 'Lun 08:00', totalClases: 1, asistencias: 1,
  inasistencias: 0, porcentajeAsistencia: 100, estado,
});
const sesion = (materiaId: string, n: number, estado: MockSesionMateria['estadoAsistencia'], horario: string): MockSesionMateria => ({
  id: `${materiaId}-${n}`, materiaId, numeroSesion: n, fecha: `2026-10-${String(n).padStart(2, '0')}`, horario, tema: `T${n}`, estadoAsistencia: estado,
});
const dto = (id: string, numero: number, inicio: string, idGrupo = 'g1'): SesionMateriaEstudianteApiDto =>
  ({ id, nombre: id, numero, codigo: id, numeroSemana: 1, idGrupo, codigoGrupo: 'G', nombreGrupo: 'G', fechaHoraInicio: inicio, fechaHoraFin: inicio }) as SesionMateriaEstudianteApiDto;

describe('simulador del portal del estudiante (CIERRE-W2B)', () => {
  describe('mockResumenMateriasToDto', () => {
    it('sale de las mismas materias: cuenta, suma creditos, horas de las sesiones ausentes y materias que no estan al dia', () => {
      const materias = [materia('A', 'Al día', 3), materia('B', 'Riesgo', 4), materia('C', 'Crítico', 2)];
      const sesiones = {
        A: [sesion('A', 1, 'AUSENTE', '08:00 - 10:00'), sesion('A', 2, 'PRESENTE', '08:00 - 10:00')],
        B: [sesion('B', 1, 'AUSENTE', '14:00 - 15:30')],
      };

      expect(mockResumenMateriasToDto(materias, sesiones)).toEqual({ totalMaterias: 3, materiasEnRiesgo: 2, totalHorasFalta: 3.5, totalCreditos: 9 });
    });

    it('sin materias todo es cero y una sesion sin horario reconocible usa 08:00 a 10:00', () => {
      expect(mockResumenMateriasToDto([], {})).toEqual({ totalMaterias: 0, materiasEnRiesgo: 0, totalHorasFalta: 0, totalCreditos: 0 });
      expect(mockResumenMateriasToDto([materia('A', 'Al día', 1)], { A: [sesion('A', 1, 'AUSENTE', 'sin horario')] }).totalHorasFalta).toBe(2);
    });
  });

  describe('mockPaginarSesionesDto', () => {
    const todas = [
      dto('c', 5, '2026-10-03T08:00:00Z'),
      dto('a', 9, '2026-10-01T08:00:00Z'),
      dto('b', 2, '2026-10-02T08:00:00Z', 'g2'),
      dto('d', 1, '2026-10-03T08:00:00Z'),
    ];

    it('ordena por inicio, numero e id como la base y devuelve el total del filtro', () => {
      const { pagina, total } = mockPaginarSesionesDto(todas, {});

      expect(pagina.map((s) => s.id)).toEqual(['a', 'b', 'd', 'c']);
      expect(total).toBe(4);
    });

    it('desempata por id cuando inicio y numero coinciden', () => {
      const { pagina } = mockPaginarSesionesDto([dto('z', 1, '2026-10-01T08:00:00Z'), dto('m', 1, '2026-10-01T08:00:00Z')], {});

      expect(pagina.map((s) => s.id)).toEqual(['m', 'z']);
    });

    it('filtra por grupo y pagina sin repetir ni saltar filas', () => {
      expect(mockPaginarSesionesDto(todas, { grupoId: 'g2' })).toEqual({ pagina: [todas[2]], total: 1 });
      const p1 = mockPaginarSesionesDto(todas, { pagina: 1, tamano: 3 });
      const p2 = mockPaginarSesionesDto(todas, { pagina: 2, tamano: 3 });

      expect([...p1.pagina, ...p2.pagina].map((s) => s.id)).toEqual(['a', 'b', 'd', 'c']);
      expect(p2.total).toBe(4);
      expect(mockPaginarSesionesDto(todas, { pagina: 9, tamano: 3 }).pagina).toEqual([]);
    });

    it('valores invalidos de pagina o tamano se acotan a 1', () => {
      expect(mockPaginarSesionesDto(todas, { pagina: 0, tamano: 0 }).pagina.length).toBe(1);
    });
  });

  it('las sesiones del simulador conservan horas y minutos de su horario', () => {
    const [s] = mockSesionesToDto([sesion('A', 1, 'AUSENTE', '08:00 - 10:30')], materia('A', 'Al día', 3));

    expect(s.minutosSesion).toBe(150);
    expect(s.fechaHoraInicio).toBe('2026-10-01T08:00:00Z');
  });
});

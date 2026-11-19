import { FranjaMock, mockSesionesCalendario } from './mock-calendario-sesiones';
import { MOCK_HORARIOS_DOCENTE } from './role-management.mock';

describe('mockSesionesCalendario (ATA D7)', () => {
  const franjas: FranjaMock[] = [
    { id: 'h1', codigoMateria: 'MAT-101', nombreMateria: 'Cálculo', dia: 'Martes', horaInicio: '08:00', horaFin: '10:00', grupo: '01', docente: 'Ana' },
    { id: 'h2', codigoMateria: 'FIS-102', nombreMateria: 'Física', dia: 'Jueves', horaInicio: '14:00', horaFin: '16:00', seccion: '02' },
    { id: 'h3', codigoMateria: 'QUI-103', nombreMateria: 'Química', dia: 'Sábado', horaInicio: '07:00', horaFin: '09:00' },
  ];

  it('genera una sesión por franja en cada fecha del rango que cae en su día', () => {
    const sesiones = mockSesionesCalendario(franjas, '2026-11-16', '2026-11-22');
    expect(sesiones.map((s) => s.codigoAsignatura)).toEqual(['MAT-101', 'FIS-102', 'QUI-103']);
    expect(sesiones[0].fechaHoraInicioUtc).toBe('2026-11-17T13:00:00.000Z');
    expect(sesiones[0].fechaHoraFinUtc).toBe('2026-11-17T15:00:00.000Z');
    expect(sesiones[0].nombreDocente).toBe('Ana');
    expect(sesiones[1].nombreDocente).toBeNull();
    expect(sesiones[1].nombreGrupo).toBe('Grupo 02');
    expect(sesiones[2].nombreGrupo).toBe('Grupo 01');
    expect(sesiones.every((s) => !s.esExtraordinaria && !s.estaCancelada)).toBeTrue();
  });

  it('repite la franja cada semana del rango con identificadores distintos y estables', () => {
    const sesiones = mockSesionesCalendario(franjas.slice(0, 1), '2026-11-16', '2026-11-29');
    expect(sesiones).toHaveSize(2);
    expect(sesiones[0].idSesion).not.toBe(sesiones[1].idSesion);
    expect(mockSesionesCalendario(franjas.slice(0, 1), '2026-11-16', '2026-11-22')[0].idSesion).toBe(sesiones[0].idSesion);
  });

  it('un rango vacío o inválido no genera sesiones', () => {
    expect(mockSesionesCalendario(franjas, '', '')).toEqual([]);
    expect(mockSesionesCalendario(franjas, '2026-11-22', '2026-11-16')).toEqual([]);
  });

  it('MEJORAS-SERGIO 9: conserva el idGrupo de la franja y el horario mock del docente lo trae en cada franja', () => {
    const [sesion] = mockSesionesCalendario([{ ...franjas[0], idGrupo: 'crs-1' }], '2026-11-16', '2026-11-22');
    expect(sesion.idGrupo).toBe('crs-1');
    expect(MOCK_HORARIOS_DOCENTE.length).toBeGreaterThan(0);
    expect(MOCK_HORARIOS_DOCENTE.every((h) => !!h.idGrupo)).toBeTrue();
  });
});

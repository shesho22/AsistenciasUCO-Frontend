import { respuestaIndicadores } from './mock-indicadores';

describe('respuestaIndicadores (simulador de los indicadores por rol, CIERRE-W3I)', () => {
  it('atiende los indicadores de administrador, decano y coordinador y el resumen de grupos del docente', () => {
    expect(respuestaIndicadores('GET', '/api/v1/admin/indicadores')?.datos).toEqual(jasmine.objectContaining({ totalFacultades: 2, facultadesActivas: 2, decanosActivos: 2 }));
    expect(respuestaIndicadores('GET', '/api/v1/decano/indicadores')?.datos).toEqual(jasmine.objectContaining({ totalCoordinadores: 1, totalDocentes: 3, gruposActivos: 2 }));
    expect(respuestaIndicadores('GET', '/api/v1/coordinador/indicadores?programaId=PRG-1')?.datos).toEqual(
      jasmine.objectContaining({ estudiantesRegistrados: 52, totalDocentes: 3, cupoTotal: 60, matriculadosActivos: 35, tasaAforo: 58.33 })
    );
    expect(respuestaIndicadores('GET', '/api/v1/docente/resumen-grupos')?.datos).toEqual({
      gruposHabilitados: 2, estudiantesActivos: 35, cupoTotal: 60, tasaOcupacion: 58.33,
    });
  });

  it('no atiende otras rutas ni otros metodos', () => {
    expect(respuestaIndicadores('GET', '/api/v1/decano/aforo-grupos')).toBeNull();
    expect(respuestaIndicadores('POST', '/api/v1/admin/indicadores')).toBeNull();
  });
});

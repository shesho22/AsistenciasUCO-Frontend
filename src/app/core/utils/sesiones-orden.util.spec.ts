import { ordenarSesionesCronologicamente } from './sesiones-orden.util';

const s = (numeroSesion: number, fecha: string, horario: string, fechaHoraInicioUtc?: string) => ({
  numeroSesion,
  fecha,
  horario,
  fechaHoraInicioUtc,
});

describe('ordenarSesionesCronologicamente (F-EST-S17)', () => {
  it('ordena por fecha y hora de inicio aunque lleguen desordenadas (3: 11-06 22:30, 4: 11-07, 5: 11-06 22:45)', () => {
    const entrada = [s(3, '2026-11-06', '22:30 - 23:30'), s(4, '2026-11-07', '23:35 - 00:35'), s(5, '2026-11-06', '22:45 - 23:35')];
    expect(ordenarSesionesCronologicamente(entrada).map((x) => x.numeroSesion)).toEqual([3, 5, 4]);
  });

  it('prefiere el instante UTC cuando existe y desempata por numero de sesion', () => {
    const entrada = [s(2, '2026-11-06', '09:00', '2026-11-06T14:00:00Z'), s(1, '2026-11-06', '09:00', '2026-11-06T14:00:00Z')];
    expect(ordenarSesionesCronologicamente(entrada).map((x) => x.numeroSesion)).toEqual([1, 2]);
  });

  it('no muta la lista original', () => {
    const entrada = [s(2, '2026-11-07', '08:00'), s(1, '2026-11-06', '08:00')];
    ordenarSesionesCronologicamente(entrada);
    expect(entrada[0].numeroSesion).toBe(2);
  });
});

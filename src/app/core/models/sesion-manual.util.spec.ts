import { mensajeSesionManualCreada } from './sesion-manual.util';

describe('mensajeSesionManualCreada (DEC-064)', () => {
  it('incluye el nombre del docente y la fecha', () => {
    expect(mensajeSesionManualCreada({ docente: 'Ana Pérez' }, '10/11/2026, 08:00')).toBe(
      'El docente Ana Pérez creó una sesión nueva para el 10/11/2026, 08:00.'
    );
  });

  it('omite el nombre vacío y la fecha vacía sin dejar huecos', () => {
    expect(mensajeSesionManualCreada({ docente: '  ' }, '')).toBe('El docente creó una sesión nueva.');
    expect(mensajeSesionManualCreada({ docente: undefined as unknown as string }, ' ')).toBe(
      'El docente creó una sesión nueva.'
    );
  });
});

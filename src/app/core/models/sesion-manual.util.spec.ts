import {
  mensajeSesionManualCreada,
  mensajeSolicitudAprobada,
  mensajeSolicitudNueva,
  mensajeSolicitudRechazadaOCancelada,
} from './sesion-manual.util';

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

describe('avisos de solicitud de sesión extraordinaria (DEC-065 (2))', () => {
  it('mensajeSolicitudAprobada nombra la sesión o queda genérico', () => {
    expect(mensajeSolicitudAprobada(' Refuerzo ')).toBe('La coordinación aprobó la sesión extraordinaria Refuerzo.');
    expect(mensajeSolicitudAprobada(undefined)).toBe('La coordinación aprobó la sesión extraordinaria.');
  });

  it('mensajeSolicitudRechazadaOCancelada nombra la sesión o queda genérico', () => {
    expect(mensajeSolicitudRechazadaOCancelada('Refuerzo')).toBe('La coordinación rechazó o canceló la sesión Refuerzo.');
    expect(mensajeSolicitudRechazadaOCancelada(null)).toBe('La coordinación rechazó o canceló una sesión del grupo.');
  });

  it('mensajeSolicitudNueva nombra al docente o queda genérico', () => {
    expect(mensajeSolicitudNueva('Ana Pérez')).toBe('Nueva solicitud de sesión extraordinaria de Ana Pérez.');
    expect(mensajeSolicitudNueva('  ')).toBe('Nueva solicitud de sesión extraordinaria.');
  });
});

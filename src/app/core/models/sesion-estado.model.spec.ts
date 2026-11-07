import {
  CancelacionSesion,
  detalleCancelacion,
  estaCancelada,
  marcarSesionCancelada,
} from './sesion-estado.model';

describe('sesion-estado.model (CULM-001 B.1)', () => {
  const docente: CancelacionSesion = {
    tipo: 'DOCENTE',
    motivo: 'Incapacidad médica del docente',
    nombreFestivo: null,
    fechaCancelacionUtc: '2026-11-10T14:00:00Z',
  };
  const festivo: CancelacionSesion = {
    tipo: 'FESTIVO',
    motivo: null,
    nombreFestivo: 'San José',
    fechaCancelacionUtc: null,
  };

  it('B1-F-06 estaCancelada solo es verdadero con estado CANCELADA', () => {
    expect(estaCancelada({ estado: 'CANCELADA' })).toBeTrue();
    expect(estaCancelada({ estado: 'PROGRAMADA' })).toBeFalse();
    expect(estaCancelada({})).toBeFalse();
    expect(estaCancelada(null)).toBeFalse();
    expect(estaCancelada(undefined)).toBeFalse();
  });

  it('B1-F-06 detalleCancelacion muestra el motivo del docente o "Día festivo: <nombre>"', () => {
    expect(detalleCancelacion(docente)).toBe('Incapacidad médica del docente');
    expect(detalleCancelacion(festivo)).toBe('Día festivo: San José');
    expect(detalleCancelacion({ ...festivo, nombreFestivo: null })).toBe('Día festivo');
    expect(detalleCancelacion({ ...docente, motivo: null })).toBe('');
    expect(detalleCancelacion(null)).toBe('');
    expect(detalleCancelacion(undefined)).toBe('');
  });

  it('B1-F-07 marcarSesionCancelada actualiza solo la sesión indicada y no muta la lista original', () => {
    const lista = [
      { id: 'a', estado: 'PROGRAMADA' as const, cancelacion: null },
      { id: 'b', estado: 'PROGRAMADA' as const, cancelacion: null },
    ];

    const resultado = marcarSesionCancelada(lista, 'b', docente);

    expect(resultado[0]).toBe(lista[0]);
    expect(resultado[1]).toEqual({ id: 'b', estado: 'CANCELADA', cancelacion: docente });
    expect(lista[1].estado).toBe('PROGRAMADA');
  });

  it('B1-F-07 una sesión ya cancelada conserva su cancelación (el SSE no trae el motivo)', () => {
    const lista = [{ id: 'b', estado: 'CANCELADA' as const, cancelacion: docente }];

    const resultado = marcarSesionCancelada(lista, 'b', { ...docente, motivo: null });

    expect(resultado).toBe(lista);
  });

  it('B1-F-07 un identificador desconocido deja la lista intacta', () => {
    const lista = [{ id: 'a', estado: 'PROGRAMADA' as const, cancelacion: null }];

    expect(marcarSesionCancelada(lista, 'zzz', docente)).toBe(lista);
  });
});

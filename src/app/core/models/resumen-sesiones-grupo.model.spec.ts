import { DEFINICION_CONTEO_SESIONES, textoResumenSesiones } from './resumen-sesiones-grupo.model';

describe('resumen-sesiones-grupo.model (CIERRE-W3M)', () => {
  it('da formato a los conteos del servidor sin recalcularlos', () => {
    expect(textoResumenSesiones({ sesionesProgramadas: 13, sesionesEjecutadas: 7, sesionesCanceladas: 3 }))
      .toBe('13 programadas · 7 ejecutadas · 3 canceladas');
  });

  it('usa el singular con una sola sesion y el plural con cero', () => {
    expect(textoResumenSesiones({ sesionesProgramadas: 1, sesionesEjecutadas: 1, sesionesCanceladas: 1 }))
      .toBe('1 programada · 1 ejecutada · 1 cancelada');
    expect(textoResumenSesiones({ sesionesProgramadas: 0, sesionesEjecutadas: 0, sesionesCanceladas: 0 }))
      .toBe('0 programadas · 0 ejecutadas · 0 canceladas');
  });

  it('conserva la definicion unica del conteo', () => {
    expect(DEFINICION_CONTEO_SESIONES).toContain('Programadas:');
    expect(DEFINICION_CONTEO_SESIONES).toContain('Ejecutadas:');
    expect(DEFINICION_CONTEO_SESIONES).toContain('Canceladas:');
  });
});

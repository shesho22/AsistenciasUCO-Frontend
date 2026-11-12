import { detalleExcusaSesion, etiquetaEstadoSesion } from './estado-sesion-estudiante.util';
import { etiquetaResultadoAprobacion } from './reclamo-estado.util';

describe('estado-sesion-estudiante.util', () => {
  it('etiqueta cada estado en español y el parcial con los minutos del backend', () => {
    expect(etiquetaEstadoSesion('PRESENTE')).toBe('Presente');
    expect(etiquetaEstadoSesion('AUSENTE')).toBe('Ausente');
    expect(etiquetaEstadoSesion('JUSTIFICADA')).toBe('Justificada');
    expect(etiquetaEstadoSesion('NO_DISPONIBLE')).toBe('No disponible');
    expect(etiquetaEstadoSesion('PARCIAL', { minutosAsistidos: 40, minutosSesion: 120 })).toBe('Parcial: 40 de 120 minutos');
    expect(etiquetaEstadoSesion('PARCIAL', { minutosAsistidos: null, minutosSesion: null })).toBe('Parcial');
  });

  it('el detalle de excusa solo aparece con minutos justificados', () => {
    expect(detalleExcusaSesion({ minutosExcusa: 100 })).toBe('100 min justificados');
    expect(detalleExcusaSesion({ minutosExcusa: 0 })).toBe('');
    expect(detalleExcusaSesion(null)).toBe('');
  });

  it('el resultado de la aprobación tiene un texto por valor y nada para otros', () => {
    expect(etiquetaResultadoAprobacion('PRESENTE')).toBe('Aprobado: estuvo presente');
    expect(etiquetaResultadoAprobacion('JUSTIFICADA')).toBe('Aprobado: ausencia justificada');
    expect(etiquetaResultadoAprobacion(null)).toBeNull();
  });
});

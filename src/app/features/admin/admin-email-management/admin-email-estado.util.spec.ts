import { claseDistintivoEstado, clasePuntoEstado, puedeReintentarEstado } from './admin-email-estado.util';
import { etiquetaPlantilla, formatearFechaCorreo } from './admin-email-formato.util';

describe('utilidades de la administración de correos', () => {
  it('puedeReintentarEstado es verdadero solo para FALLIDA_DEFINITIVA y FALLIDA_REINTENTABLE', () => {
    expect(puedeReintentarEstado('FALLIDA_DEFINITIVA')).toBeTrue();
    expect(puedeReintentarEstado('FALLIDA_REINTENTABLE')).toBeTrue();
    expect(puedeReintentarEstado('ENTREGADA')).toBeFalse();
    expect(puedeReintentarEstado('PENDIENTE')).toBeFalse();
    expect(puedeReintentarEstado('RESERVADA')).toBeFalse();
  });

  it('asigna clases de estado para cada código y un valor por defecto', () => {
    for (const codigo of ['ENTREGADA', 'PENDIENTE', 'RESERVADA', 'FALLIDA_REINTENTABLE', 'FALLIDA_DEFINITIVA', 'OTRO']) {
      expect(claseDistintivoEstado(codigo)).not.toBe('');
      expect(clasePuntoEstado(codigo)).not.toBe('');
    }
    expect(claseDistintivoEstado('OTRO')).toBe('bg-warm-100 text-warm-700');
    expect(clasePuntoEstado('OTRO')).toBe('bg-warm-400');
  });

  it('etiquetaPlantilla usa la descripción y, sin ella, el código del tipo', () => {
    expect(etiquetaPlantilla({ tipo: 'X', descripcion: ' Descripción ' })).toBe('Descripción');
    expect(etiquetaPlantilla({ tipo: 'X', descripcion: '   ' })).toBe('X');
    expect(etiquetaPlantilla({ tipo: 'X' })).toBe('X');
  });

  it('formatearFechaCorreo devuelve un guion sin valor y texto con valor', () => {
    expect(formatearFechaCorreo(null)).toBe('—');
    expect(formatearFechaCorreo('2026-11-05T14:10:00Z')).toContain('2026');
  });
});

import { etiquetaEstadoReclamo, etiquetaResultadoAprobacion, varianteEstadoReclamo } from './reclamo-estado.util';

describe('reclamo-estado.util', () => {
  describe('varianteEstadoReclamo', () => {
    it('mapea cada estado a su variante visual', () => {
      expect(varianteEstadoReclamo('APROBADA')).toBe('success');
      expect(varianteEstadoReclamo('RECHAZADA')).toBe('danger');
      expect(varianteEstadoReclamo('PENDIENTE')).toBe('warning');
    });

    it('RETIRADA, desconocidos y ausentes son neutros', () => {
      expect(varianteEstadoReclamo('RETIRADA')).toBe('neutral');
      expect(varianteEstadoReclamo('OTRO')).toBe('neutral');
      expect(varianteEstadoReclamo(undefined)).toBe('neutral');
    });
  });

  describe('etiquetaResultadoAprobacion', () => {
    it('describe los resultados con que se aprueba un reclamo', () => {
      expect(etiquetaResultadoAprobacion('PRESENTE')).toBe('Aprobado: estuvo presente');
      expect(etiquetaResultadoAprobacion('JUSTIFICADA')).toBe('Aprobado: ausencia justificada');
    });

    it('devuelve null si no aplica o no se informó', () => {
      expect(etiquetaResultadoAprobacion(null)).toBeNull();
      expect(etiquetaResultadoAprobacion(undefined)).toBeNull();
      expect(etiquetaResultadoAprobacion('AUSENTE')).toBeNull();
    });
  });

  describe('etiquetaEstadoReclamo', () => {
    it('muestra el texto legible y nunca el código crudo', () => {
      expect(etiquetaEstadoReclamo('PENDIENTE')).toBe('Pendiente');
      expect(etiquetaEstadoReclamo('APROBADA')).toBe('Aprobada');
      expect(etiquetaEstadoReclamo('RECHAZADA')).toBe('Rechazada');
      expect(etiquetaEstadoReclamo('RETIRADA')).toBe('Retirada');
    });

    it('un estado desconocido se muestra tal cual y uno ausente queda vacío', () => {
      expect(etiquetaEstadoReclamo('NUEVO')).toBe('NUEVO');
      expect(etiquetaEstadoReclamo(undefined)).toBe('');
    });
  });
});

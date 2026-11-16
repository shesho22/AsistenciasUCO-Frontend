import { HttpErrorResponse } from '@angular/common/http';
import { rolSinAmbito } from './sin-ambito.util';

/** HU178: los códigos canónicos de «rol sin ámbito» son un estado controlado, no un fallo. */
describe('HU178: rolSinAmbito', () => {
  const conCodigo = (code: string, status = 403) =>
    new HttpErrorResponse({
      status,
      error: { timestamp: '2026-11-16T07:00:00Z', status, error: 'Forbidden', code, message: 'texto que nunca se analiza', path: '/api/v1/x', correlationId: null },
    });

  it('reconoce KPI_001 (coordinador sin programa), KPI_003 (decano sin facultad) y KPI_004 (administrador sin institución)', () => {
    expect(rolSinAmbito(conCodigo('KPI_001'))).toBe('COORDINADOR');
    expect(rolSinAmbito(conCodigo('KPI_003'))).toBe('DECANO');
    expect(rolSinAmbito(conCodigo('KPI_004'))).toBe('ADMINISTRADOR');
  });

  it('no trata como estado controlado un 403 genérico, otros códigos ni fallos sin respuesta', () => {
    expect(rolSinAmbito(conCodigo('FORBIDDEN'))).toBeNull();
    expect(rolSinAmbito(conCodigo('SEC_001'))).toBeNull();
    expect(rolSinAmbito(new HttpErrorResponse({ status: 403 }))).toBeNull();
    expect(rolSinAmbito(new HttpErrorResponse({ status: 0 }))).toBeNull();
    expect(rolSinAmbito(new Error('x'))).toBeNull();
    expect(rolSinAmbito(null)).toBeNull();
  });
});

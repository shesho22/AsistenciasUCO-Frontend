import { HttpErrorResponse } from '@angular/common/http';
import { classifyLoadError } from './load-error.util';

describe('classifyLoadError', () => {
  const http = (status: number, body: unknown = null) => new HttpErrorResponse({ status, error: body });

  it('distingue la autorizacion denegada (401/403) de un fallo recuperable', () => {
    expect(classifyLoadError(http(401)).kind).toBe('AUTORIZACION');
    expect(classifyLoadError(http(403)).kind).toBe('AUTORIZACION');
  });

  it('distingue la funcionalidad no implementada (501) de un fallo de servidor recuperable', () => {
    const estado = classifyLoadError(http(501));
    expect(estado.kind).toBe('NO_IMPLEMENTADO');
    expect(estado.titulo).toBe('Funcionalidad no disponible');
    expect(classifyLoadError(http(500)).kind).toBe('SERVIDOR');
    expect(classifyLoadError(http(503)).kind).toBe('SERVIDOR');
  });

  it('clasifica red y validacion sin depender del texto', () => {
    expect(classifyLoadError(http(0)).kind).toBe('RED');
    expect(classifyLoadError(http(400)).kind).toBe('VALIDACION');
  });
});

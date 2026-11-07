import { HttpErrorResponse } from '@angular/common/http';
import {
  getApiCorrelationId,
  getApiErrorCode,
  getApiErrorMessage,
  getApiErrorResponse,
  getApiFieldError,
  getApiFieldErrors,
  getBackendUserMessage,
} from './api-error.util';

describe('api error utilities', () => {
  const fieldError = {
    field: 'correo',
    code: 'INVALID',
    message: 'El correo no es válido',
  };

  const validBody = {
    timestamp: '2026-09-22T10:15:30',
    status: 400,
    error: 'Bad Request',
    code: 'VALIDATION_ERROR',
    message: 'Error de validacion en la solicitud.',
    path: '/api/usuarios',
    correlationId: 'corr-1',
    details: [fieldError],
  };

  function httpError(status: number, error: unknown): HttpErrorResponse {
    return new HttpErrorResponse({ status, error });
  }

  it('reconoce el contrato completo y expone detalles y correlación', () => {
    const error = httpError(400, validBody);

    expect(getApiErrorResponse(error)).toEqual(validBody);
    expect(getApiFieldErrors(error)).toEqual([fieldError]);
    expect(getApiFieldError(error, 'correo')).toBe(fieldError.message);
    expect(getApiFieldError(error, 'nombre')).toBeUndefined();
    expect(getApiCorrelationId(error)).toBe('corr-1');
    expect(getApiErrorMessage(error)).toBe(
      "Error en datos del formulario: Campo 'correo': El correo no es válido."
    );
  });

  it('descarta cuerpos y detalles que no cumplen el contrato', () => {
    const mixedDetails = httpError(400, {
      ...validBody,
      details: [fieldError, { field: 'nombre', code: 2, message: 'inválido' }],
    });

    expect(getApiErrorResponse(mixedDetails)).toBeNull();
    expect(getApiFieldErrors(mixedDetails)).toEqual([fieldError]);
    expect(getApiErrorResponse(new Error('local'))).toBeNull();
    expect(getApiFieldErrors({})).toEqual([]);
    expect(getApiCorrelationId(httpError(400, { ...validBody, correlationId: 7 })))
      .toBeUndefined();
  });

  it('decide el mensaje por ApiErrorResponse.code: los de infraestructura ignoran el texto de message', () => {
    const envelope = (code: string, message: string, status = 400) =>
      httpError(status, { ...validBody, status, code, message, details: undefined });

    const expected: Record<string, string> = {
      UNAUTHORIZED: 'sesión',
      FEATURE_UNAVAILABLE: 'no está disponible',
      INTERNAL_ERROR: 'servidor',
    };
    for (const [code, fragment] of Object.entries(expected)) {
      // El texto humano del backend es engañoso a propósito: en estos códigos no debe influir.
      const message = getApiErrorMessage(envelope(code, 'Recurso no encontrado / permisos / conflicto'));
      expect(message).withContext(code).toContain(fragment);
    }
  });

  it('CULM-001 A.2: los códigos de negocio muestran el message del catálogo que entrega el backend', () => {
    const envelope = (code: string, message: string, status: number) =>
      httpError(status, { ...validBody, status, code, message, details: undefined });
    const casos: [string, number, string][] = [
      ['VALIDATION_ERROR', 400, 'La sesión se cruza con otra sesión del grupo o del docente en ese horario.'],
      ['INVALID_REQUEST', 400, 'La solicitud tiene un campo no interpretable.'],
      ['FORBIDDEN', 403, 'No es el docente titular de este grupo.'],
      ['RESOURCE_NOT_FOUND', 404, 'La solicitud de revisión no existe.'],
      ['CONFLICT', 409, 'Solo se puede retirar una solicitud de revisión pendiente.'],
    ];
    for (const [code, status, message] of casos) {
      expect(getApiErrorMessage(envelope(code, message, status))).withContext(code).toBe(message);
    }
  });

  it('un código de negocio sin message en el envelope cae al texto general del código', () => {
    const error = httpError(409, { ...validBody, status: 409, code: 'CONFLICT', message: '   ', details: undefined });
    expect(getApiErrorMessage(error)).toContain('conflicto');
  });

  it('el código manda aunque el status HTTP no coincida', () => {
    expect(getApiErrorCode(httpError(500, { ...validBody, status: 500, code: 'RESOURCE_NOT_FOUND', details: undefined })))
      .toBe('RESOURCE_NOT_FOUND');
  });

  it('códigos de catálogo ERR_* muestran el mensaje del envelope', () => {
    const error = httpError(400, {
      ...validBody,
      code: 'ERR_NOMBRE_SESION_LONGITUD_INVALIDA',
      message: 'El nombre de la sesion debe tener entre 1 y 50 caracteres.',
      details: undefined,
    });
    expect(getApiErrorMessage(error)).toBe(
      'El nombre de la sesion debe tener entre 1 y 50 caracteres.'
    );
  });

  it('DBCODE y códigos internos no se muestran ni se interpretan', () => {
    const error = httpError(500, {
      ...validBody,
      status: 500,
      code: 'ERR_DB_UNCLASSIFIED',
      message: 'DBCODE=SEC_002|detalle interno',
      details: undefined,
    });
    expect(getApiErrorMessage(error)).not.toContain('DBCODE');
    expect(getApiErrorMessage(error)).not.toContain('SEC_002');
    expect(getApiErrorCode(error)).toBe('INTERNAL_ERROR');
  });

  it('sin envelope (401/403 de la cadena de seguridad, TD-021) deriva el código del status', () => {
    const cases: Array<[number, string]> = [
      [0, 'NETWORK_ERROR'],
      [400, 'INVALID_REQUEST'],
      [401, 'UNAUTHORIZED'],
      [403, 'FORBIDDEN'],
      [404, 'RESOURCE_NOT_FOUND'],
      [409, 'CONFLICT'],
      [501, 'FEATURE_UNAVAILABLE'],
      [503, 'INTERNAL_ERROR'],
    ];
    for (const [status, code] of cases) {
      expect(getApiErrorCode(httpError(status, null))).withContext(String(status)).toBe(code);
    }
    expect(getApiErrorCode('fallo local')).toBe('UNKNOWN');
  });

  it('expone la correlación para soporte', () => {
    expect(getApiCorrelationId(httpError(500, { ...validBody, status: 500, code: 'INTERNAL_ERROR', details: undefined })))
      .toBe('corr-1');
  });

  it('usa el mensaje general para errores desconocidos', () => {
    expect(getApiErrorMessage(httpError(418, null)))
      .toBe('No fue posible completar la operación. Intente nuevamente.');
    expect(getApiErrorMessage('fallo local'))
      .toBe('No fue posible completar la operación. Intente nuevamente.');
  });
});

describe('getBackendUserMessage (F-ADM-010)', () => {
  it('prefiere el message del backend en un HttpErrorResponse', () => {
    const error = new HttpErrorResponse({ status: 409, error: { code: 'CONFLICT', message: 'La facultad ya existe.' } });
    expect(getBackendUserMessage(error)).toBe('La facultad ya existe.');
  });

  it('acepta objetos con forma {error:{message|mensajeUsuario}} y descarta mensajeTecnico y err.message', () => {
    expect(getBackendUserMessage({ error: { mensajeUsuario: 'Texto de usuario.' } })).toBe('Texto de usuario.');
    const sinTexto = { message: 'Http failure response', error: { mensajeTecnico: 'SQLSTATE 23000' } };
    const resultado = getBackendUserMessage(sinTexto);
    expect(resultado).not.toContain('SQLSTATE');
    expect(resultado).not.toContain('Http failure');
  });

  it('cae al mensaje semantico por codigo cuando el backend no trae texto', () => {
    expect(getBackendUserMessage(new HttpErrorResponse({ status: 501 }))).toBe('Esta funcionalidad no está disponible por el momento.');
  });
});

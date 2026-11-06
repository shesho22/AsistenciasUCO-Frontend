import { HttpErrorResponse } from '@angular/common/http';

/** Error HTTP con el cuerpo canonico `ApiErrorResponse` del backend (`message` ya viene del catalogo institucional). */
export function apiHttpError(status: number, message: string, code = 'ERR'): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: {
      timestamp: '2026-11-04T15:00:00Z',
      status,
      error: 'Error',
      code,
      message,
      path: '/api/v1/test',
      correlationId: null,
    },
  });
}

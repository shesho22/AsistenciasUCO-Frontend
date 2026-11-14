import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../shared/components/toast/toast.service';
import { getErrorCorrelationId } from '../api/errors/api-error.util';
import { mensajeUi } from '../messages/mensajes-ui';

/** Entrada estructurada que el manejador global deja en la consola (sin datos personales ni tokens). */
export interface RegistroErrorFrontend {
  readonly event: 'frontend.unhandled_error';
  readonly timestamp: string;
  /** correlationId del backend si el error es HTTP; si no, una referencia local que el usuario ve en pantalla. */
  readonly correlationId: string;
  readonly origen: 'http' | 'cliente';
  readonly nombre: string;
  readonly status: number | null;
  readonly ruta: string;
}

/** Intervalo mínimo entre dos avisos en pantalla: un error que se repite en cada ciclo no inunda al usuario. */
export const INTERVALO_MINIMO_AVISO_MS = 10_000;

/**
 * VAL OBS-14: manejador global de errores no capturados (plantillas, efectos, promesas rechazadas y errores de ventana
 * vía `provideBrowserGlobalErrorListeners`).
 *
 * - Registra en consola una entrada estructurada con el id de correlación, para cruzarla con los logs del backend.
 * - Los errores HTTP ya los notifica `errorInterceptor` (403 y 5xx) o la pantalla que los maneja; aquí solo se registran.
 * - Los errores de cliente muestran un aviso genérico del catálogo con una referencia local que el usuario puede citar.
 *
 * Nunca registra el mensaje ni la pila completos del error: pueden contener datos personales o URLs con parámetros.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);
  private ultimoAviso = 0;

  handleError(error: unknown): void {
    const original = desenvolver(error);
    const esHttp = original instanceof HttpErrorResponse;
    const correlationId = (esHttp ? getErrorCorrelationId(original) : null) ?? referenciaLocal();

    const registro: RegistroErrorFrontend = {
      event: 'frontend.unhandled_error',
      timestamp: new Date().toISOString(),
      correlationId,
      origen: esHttp ? 'http' : 'cliente',
      nombre: nombreDe(original),
      status: esHttp ? original.status : null,
      ruta: rutaActual(),
    };
    console.error('[GlobalErrorHandler]', registro);

    if (esHttp) {
      return;
    }
    const ahora = Date.now();
    if (ahora - this.ultimoAviso < INTERVALO_MINIMO_AVISO_MS) {
      return;
    }
    this.ultimoAviso = ahora;
    this.toast.error(mensajeUi('UI_ERROR_GLOBAL_001'), correlationId);
  }
}

/** Angular y el navegador envuelven el error real (rechazos de promesa, `ngOriginalError`). */
function desenvolver(error: unknown): unknown {
  let actual = error;
  for (let i = 0; i < 5 && typeof actual === 'object' && actual !== null; i++) {
    const registro = actual as Record<string, unknown>;
    const interno = registro['rejection'] ?? registro['ngOriginalError'];
    if (interno === undefined || interno === actual) {
      break;
    }
    actual = interno;
  }
  return actual;
}

function nombreDe(error: unknown): string {
  if (error instanceof Error && error.name) {
    return error.name;
  }
  return typeof error === 'object' && error !== null ? (error.constructor?.name ?? 'Object') : typeof error;
}

function referenciaLocal(): string {
  return `FE-${crypto.randomUUID()}`;
}

function rutaActual(): string {
  try {
    return window.location.pathname;
  } catch {
    return '';
  }
}

import { HttpInterceptorFn, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/components/toast/toast.service';
import {
  API_ERROR_CODE,
  errorFuePresentado,
  getApiErrorCode,
  getApiErrorMessage,
  getApiErrorResponse,
  getErrorCorrelationId,
  leerErrorSinMarcar,
} from '../api/errors/api-error.util';
import { mensajeUi } from '../messages/mensajes-ui';

/**
 * Token de contexto para omitir la notificación global Toast cuando un componente
 * gestiona y presenta el error de forma local en su propia vista (evita doble notificación).
 * Cubre 403, 5xx y el respaldo de TD-120 para 400/409/422.
 */
export const BYPASS_GLOBAL_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/** TD-120: estados de negocio cuyo mensaje del backend se muestra como respaldo si ninguna pantalla lo presento. */
const ESTADOS_DE_NEGOCIO = new Set([400, 409, 422]);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error) => {
      const bypassGlobalToast = req.context.get(BYPASS_GLOBAL_ERROR_TOAST);

      // Se decide por ApiErrorResponse.code (o su equivalente derivado del
      // status cuando la cadena de seguridad responde sin envelope), nunca
      // por el texto del mensaje.
      if (leerErrorSinMarcar(() => getApiErrorCode(error)) === API_ERROR_CODE.FORBIDDEN) {
        if (!bypassGlobalToast) {
          toastService.error(mensajeUi('UI_ERROR_INTERCEPTOR_001'), getErrorCorrelationId(error));
        }
      } else if (error?.status >= 500 && !bypassGlobalToast) {
        // VAL OBS-14: el usuario ve el id de correlación para citarlo al reportar el fallo.
        toastService.error(getApiErrorMessage(error), getErrorCorrelationId(error));
      } else if (ESTADOS_DE_NEGOCIO.has(error?.status) && !bypassGlobalToast) {
        // TD-120: respaldo global. Los suscriptores reciben el error de forma sincrona; si al terminar ese turno
        // ninguna pantalla lo leyo para presentarlo (errorFuePresentado), se muestra el mensaje del backend.
        // Solo con envelope ApiErrorResponse; el 401 es de autenticacion y no pasa por aqui.
        const envelope = leerErrorSinMarcar(() => getApiErrorResponse(error));
        if (envelope) {
          setTimeout(() => {
            if (!errorFuePresentado(error)) {
              toastService.error(
                leerErrorSinMarcar(() => getApiErrorMessage(error)),
                getErrorCorrelationId(error)
              );
            }
          }, 0);
        }
      }

      return throwError(() => error);
    })
  );
};

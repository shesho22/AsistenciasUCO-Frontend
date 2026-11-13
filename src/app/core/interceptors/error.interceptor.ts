import { HttpInterceptorFn, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/components/toast/toast.component';
import { API_ERROR_CODE, getApiErrorCode, getApiErrorMessage } from '../api/errors/api-error.util';
import { mensajeUi } from '../messages/mensajes-ui';

/**
 * Token de contexto para omitir la notificación global Toast cuando un componente
 * gestiona y presenta el error de forma local en su propia vista (evita doble notificación).
 */
export const BYPASS_GLOBAL_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error) => {
      const bypassGlobalToast = req.context.get(BYPASS_GLOBAL_ERROR_TOAST);

      // Se decide por ApiErrorResponse.code (o su equivalente derivado del
      // status cuando la cadena de seguridad responde sin envelope), nunca
      // por el texto del mensaje.
      if (getApiErrorCode(error) === API_ERROR_CODE.FORBIDDEN) {
        if (!bypassGlobalToast) {
          toastService.error(mensajeUi('UI_ERROR_INTERCEPTOR_001'));
        }
      } else if (error?.status >= 500 && !bypassGlobalToast) {
        toastService.error(getApiErrorMessage(error));
      }

      return throwError(() => error);
    })
  );
};

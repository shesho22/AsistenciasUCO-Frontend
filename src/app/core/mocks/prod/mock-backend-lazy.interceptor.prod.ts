import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Sustituto de `mock-backend-lazy.interceptor.ts` en producción (fileReplacements): el backend simulado no existe en
 * el bundle y toda petición pasa sin cambios.
 */
export const mockBackendLazyInterceptor: HttpInterceptorFn = (req, next) => next(req);

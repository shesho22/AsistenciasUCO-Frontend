import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const correlationInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url) || req.headers.has('X-Correlation-Id')) {
    return next(req);
  }

  return next(
    req.clone({
      headers: req.headers.set('X-Correlation-Id', crypto.randomUUID()),
    })
  );
};

function normalizeHost(hostname: string): string {
  return hostname === '127.0.0.1' ? 'localhost' : hostname;
}

function isApiRequest(url: string): boolean {
  try {
    const requestUrl = new URL(url, window.location.origin);
    return [environment.apiUrl, environment.apiV2Url].some((root) => {
      const apiUrl = new URL(root, window.location.origin);
      return requestUrl.protocol === apiUrl.protocol &&
        normalizeHost(requestUrl.hostname) === normalizeHost(apiUrl.hostname) &&
        requestUrl.port === apiUrl.port &&
        requestUrl.pathname.startsWith(`${apiUrl.pathname}/`);
    });
  } catch {
    return false;
  }
}

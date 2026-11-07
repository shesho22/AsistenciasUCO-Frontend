import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { esRutaAsistenciaQr, guardarRetornoQr } from '../utils/qr-return-url.util';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // CULM-001 B.2 (NB-8): la URL del QR (con su token) se guarda localmente y no viaja en `returnUrl`.
  if (esRutaAsistenciaQr(state.url)) {
    guardarRetornoQr(state.url);
    return router.createUrlTree(['/login']);
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

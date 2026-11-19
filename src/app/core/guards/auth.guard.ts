import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { esRutaAsistenciaQr, guardarRetornoQr } from '../utils/qr-return-url.util';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // La navegación inicial del Router puede coincidir con APP_INITIALIZER. Esperamos la misma restauración para que
  // F5 no muestre /login antes de recuperar la sesión desde el proveedor institucional.
  await authService.initializeSessionOnce();

  if (authService.isAuthenticated()) {
    return true;
  }

  // En modo baseline la restauración puede iniciar una redirección OIDC silenciosa de página completa. Cancelamos
  // esta navegación protegida mientras el navegador sale hacia el proveedor; /login solo se muestra si no hay sesión.
  if (authService.hasPendingAuthenticationRedirect()) {
    return false;
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

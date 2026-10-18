import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Verificar si existe sesión activa en el PDP/BFF de Security Baseline
  const hasSession = await authService.checkPdpSession();
  if (hasSession) {
    return true;
  }

  // En modo real, redirigir al portal central de autenticación (PDP / Keycloak)
  if (!authService.isMockMode()) {
    authService.loginWithSecurityPlatform(state.url);
    return false;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

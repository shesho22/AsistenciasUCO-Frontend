import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole, hasAnyRole } from '../models/user.model';
import { ToastService } from '../../shared/components/toast/toast.component';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const allowedRoles = (route.data?.['roles'] as UserRole[] | undefined) || [];
  const currentUser = authService.currentUser();

  if (!currentUser) {
    return router.createUrlTree(['/login']);
  }

  // Normalizar rol
  if (allowedRoles.length === 0 || hasAnyRole(currentUser, allowedRoles)) {
    return true;
  }

  // La redirección ya no es silenciosa: se avisa que la sección no está permitida para su rol (F-DEC-S09).
  toast.error('Acceso denegado: No cuenta con los permisos necesarios para acceder a esta sección.');

  // F3-TRX-01: página 403 amigable dentro del layout (la sesión se conserva), no un rebote silencioso al inicio.
  return router.createUrlTree(['/app/acceso-denegado']);
};

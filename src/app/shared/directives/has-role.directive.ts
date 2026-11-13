import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { UserRole, hasAnyRole } from '../../core/models/user.model';

/**
 * Directiva estructural de control de visibilidad por rol (RBAC decorativo).
 *
 * IMPORTANTE: Esta directiva es SOLO ergonómica (UX). NO proporciona seguridad.
 * La validación real de permisos ocurre exclusivamente en el backend (Spring Boot)
 * y en la base de datos (SQL Server). El frontend puede ser inspeccionado y
 * manipulado por el usuario — ver AGENTS.md §3.3.
 *
 * Uso:
 *   <button *appHasRole="['DOCENTE', 'ADMINISTRADOR']">Acción restringida</button>
 *   <div *appHasRole="'DECANO'">Solo para decanos</div>
 */
@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  /** Rol o lista de roles que tienen acceso a ver el elemento. */
  readonly appHasRole = input<UserRole | UserRole[]>([]);

  private readonly authService = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  private hasView = false;

  constructor() {
    // Recalcular visibilidad reactivamente cuando cambie el usuario o los roles requeridos.
    effect(() => {
      const user = this.authService.currentUser();
      const required = this.appHasRole();
      const requiredRoles: UserRole[] = Array.isArray(required) ? required : [required];

      const hasAccess =
        !!user && (requiredRoles.length === 0 || hasAnyRole(user, requiredRoles));

      if (hasAccess && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!hasAccess && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }
}

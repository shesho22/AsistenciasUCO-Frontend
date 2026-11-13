import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BadgeComponent } from '../badge/badge.component';
import {
  CancelacionSesion,
  EstadoSesion,
  detalleCancelacion,
  estaCancelada,
} from '../../../core/models/sesion-estado.model';

/**
 * CULM-001 B.1: etiqueta única de "sesión cancelada" para todos los roles. Solo presenta lo que entrega el
 * backend (`estado`, `cancelacion`); una sesión programada (o sin estado) no pinta nada.
 */
@Component({
    selector: 'app-sesion-estado-badge',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [BadgeComponent],
    template: `
    @if (cancelada()) {
      <span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
        <span data-testid="sesion-cancelada-badge">
          <app-badge variant="warning" size="sm">Cancelada</app-badge>
        </span>
        @if (detalle()) {
          <span data-testid="sesion-cancelada-detalle" class="text-xs text-warm-600 break-words min-w-0">{{ detalle() }}</span>
        }
      </span>
    }
  `
})
export class SesionEstadoBadgeComponent {
  readonly estado = input<EstadoSesion | null | undefined>(undefined);
  readonly cancelacion = input<CancelacionSesion | null | undefined>(undefined);

  protected readonly cancelada = computed(() => estaCancelada({ estado: this.estado() }));
  protected readonly detalle = computed(() => detalleCancelacion(this.cancelacion()));
}

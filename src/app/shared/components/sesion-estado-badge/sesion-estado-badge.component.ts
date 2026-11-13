import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BadgeComponent } from '../badge/badge.component';
import {
  CancelacionSesion,
  EstadoSesion,
  EstadoSolicitudSesion,
  detalleCancelacion,
  estaCancelada,
  estaPendienteAprobacion,
  estaRechazada,
} from '../../../core/models/sesion-estado.model';

/**
 * CULM-001 B.1: etiqueta única de "sesión cancelada" para todos los roles. Solo presenta lo que entrega el
 * backend (`estado`, `cancelacion`); una sesión programada (o sin estado) no pinta nada.
 */
@Component({
  selector: 'app-sesion-estado-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    @if (pendiente() && !cancelada()) {
      <span data-testid="sesion-pendiente-badge">
        <app-badge variant="warning" size="sm">Pendiente de aprobación</app-badge>
      </span>
    } @else if (cancelada() || rechazada()) {
      <span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
        @if (rechazada()) {
          <span data-testid="sesion-rechazada-badge">
            <app-badge variant="danger" size="sm">Rechazada</app-badge>
          </span>
        } @else {
          <span data-testid="sesion-cancelada-badge">
            <app-badge variant="warning" size="sm">Cancelada</app-badge>
          </span>
        }
        @if (detalle()) {
          <span data-testid="sesion-cancelada-detalle" class="text-xs text-warm-600 break-words min-w-0">{{ detalle() }}</span>
        }
      </span>
    }
  `,
})
export class SesionEstadoBadgeComponent {
  readonly estado = input<EstadoSesion | null | undefined>(undefined);
  readonly cancelacion = input<CancelacionSesion | null | undefined>(undefined);

  /** DEC-065 (2): estado de la solicitud de sesión extraordinaria (null = sin solicitud). */
  readonly estadoSolicitud = input<EstadoSolicitudSesion | null | undefined>(undefined);
  readonly pendienteAprobacion = input<boolean | null | undefined>(undefined);

  protected readonly pendiente = computed(() =>
    estaPendienteAprobacion({ estadoSolicitud: this.estadoSolicitud(), pendienteAprobacion: this.pendienteAprobacion() })
  );
  protected readonly rechazada = computed(() => estaRechazada({ estadoSolicitud: this.estadoSolicitud() }));
  protected readonly cancelada = computed(() => estaCancelada({ estado: this.estado() }));
  protected readonly detalle = computed(() => detalleCancelacion(this.cancelacion()));
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CodigoPermanencia } from '../../../core/models/indicadores-asistencia.model';

const PRESENTACION: Record<CodigoPermanencia, { etiqueta: string; clases: string }> = {
  REGULAR: { etiqueta: 'Regular', clases: 'bg-attendance-present-soft text-attendance-present' },
  RIESGO: { etiqueta: 'En riesgo', clases: 'bg-attendance-risk-soft text-attendance-risk' },
  PERDIDA: { etiqueta: 'Pérdida', clases: 'bg-attendance-absent-soft text-attendance-absent' },
};

/**
 * CULM-001 B.2 (F-EST-009): unico semaforo de asistencia. Solo pinta el `codigoPermanencia` que entrega el backend con
 * los tokens `attendance-*`; el paquete E lo retokeniza en este unico lugar. Sin codigo no pinta nada.
 */
@Component({
  selector: 'app-attendance-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (presentacion(); as p) {
      <span
        data-testid="semaforo-asistencia"
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
        [class]="p.clases"
      >
        {{ p.etiqueta }}
      </span>
    }
  `,
})
export class AttendanceStatusBadgeComponent {
  readonly codigoPermanencia = input<CodigoPermanencia | null | undefined>(null);

  protected readonly presentacion = computed(() => {
    const codigo = this.codigoPermanencia();
    return codigo ? (PRESENTACION[codigo] ?? null) : null;
  });
}

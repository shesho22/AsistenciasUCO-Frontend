import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';
import { MarcaInasistencia } from '../../../core/models/revision-cancelacion.model';

interface MarcaDisplay {
  texto: string;
  variant: BadgeVariant;
}

@Component({
  selector: 'app-inasistencia-marca-badge',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (display(); as d) {
      <app-badge [variant]="d.variant" [dot]="true">
        {{ d.texto }}
      </app-badge>
    }
  `,
})
export class InasistenciaMarcaBadgeComponent {
  marca = input<MarcaInasistencia | null>(null);
  estadoMatricula = input<string | null>(null);

  display = computed<MarcaDisplay | null>(() => {
    if (this.estadoMatricula() === 'CI') {
      return { texto: 'Cancelado por inasistencia', variant: 'danger' };
    }

    const m = this.marca();
    if (!m) {
      return null;
    }

    if (m.revision) {
      const rev = m.revision;
      const estado = rev.estado;

      if (estado === 'APROBADA' || estado === 'CANCELADO_POR_INASISTENCIA') {
        return { texto: 'Cancelado por inasistencia', variant: 'danger' };
      }
      if (
        estado === 'PROPUESTA' ||
        estado === 'PROPUESTA_COORDINACION' ||
        estado === 'PROPUESTA_DECANATURA'
      ) {
        if (
          rev.perfilResolutorActual === 'DECANO' ||
          estado === 'PROPUESTA_DECANATURA'
        ) {
          return { texto: 'Propuesto a decanatura', variant: 'warning' };
        }
        return { texto: 'Propuesto a coordinación', variant: 'warning' };
      }
      if (estado === 'PENDIENTE_DOCENTE' || rev.requiereAccionDocente) {
        return { texto: 'Pérdida: decide', variant: 'danger' };
      }
      if (estado === 'MANTENIDA' || estado === 'MANTENIDO') {
        return { texto: 'Mantenido', variant: 'neutral' };
      }
      if (estado === 'RECHAZADA' || estado === 'RECHAZADO') {
        return { texto: 'Rechazado', variant: 'neutral' };
      }
    }

    if (m.estado) {
      switch (m.estado) {
        case 'CANCELADO_POR_INASISTENCIA':
          return { texto: 'Cancelado por inasistencia', variant: 'danger' };
        case 'PROPUESTA_DECANATURA':
          return { texto: 'Propuesto a decanatura', variant: 'warning' };
        case 'PROPUESTA_COORDINACION':
        case 'PROPUESTA':
          return { texto: 'Propuesto a coordinación', variant: 'warning' };
        case 'PERDIDA_PENDIENTE':
          return { texto: 'Pérdida: decide', variant: 'danger' };
        case 'MANTENIDO':
        case 'MANTENIDA':
          return { texto: 'Mantenido', variant: 'neutral' };
        case 'RECHAZADO':
        case 'RECHAZADA':
          return { texto: 'Rechazado', variant: 'neutral' };
        case 'RIESGO':
          return { texto: 'Riesgo', variant: 'warning' };
      }
    }

    if (m.perdidaVigente && !m.revision) {
      return { texto: 'Pérdida: decide', variant: 'danger' };
    }

    if (m.advertenciaVigente && !m.perdidaVigente) {
      return { texto: 'Riesgo', variant: 'warning' };
    }

    return null;
  });
}

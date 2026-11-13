import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevisionCancelacionService } from '../../../core/services/revision-cancelacion.service';
import { environment } from '../../../../environments/environment';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';

interface Presentacion {
  etiqueta: string;
  descripcion: string;
  enlaceTexto: string;
  ruta: string;
}

const PRESENTACION: Record<'DOCENTE' | 'COORDINADOR', Presentacion> = {
  DOCENTE: {
    etiqueta: 'Revisiones pendientes de decisión',
    descripcion: 'Estudiantes que superaron el límite de inasistencia y esperan tu decisión.',
    enlaceTexto: 'Ir a mis grupos',
    ruta: '/app/docente/grupos',
  },
  COORDINADOR: {
    etiqueta: 'Revisiones por resolver',
    descripcion: 'Propuestas de cancelación de matrícula que esperan tu resolución.',
    enlaceTexto: 'Resolver revisiones',
    ruta: '/app/coordinador/revisiones-cancelacion',
  },
};

/** Conteo global de revisiones de cancelación que el rol debe atender, con enlace directo (una sola carga HTTP). */
@Component({
  selector: 'app-revisiones-pendientes-kpi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, KpiCardComponent],
  template: `
    @if (habilitado) {
      <div data-testid="revisiones-pendientes-kpi">
        <app-kpi-card [etiqueta]="vista().etiqueta" [valor]="total()" [descripcion]="vista().descripcion">
          <a
            [routerLink]="vista().ruta"
            data-testid="revisiones-pendientes-enlace"
            class="mt-2 inline-flex min-h-[44px] items-center text-xs font-bold text-primary-800 underline hover:text-primary-950"
          >{{ vista().enlaceTexto }}</a>
        </app-kpi-card>
      </div>
    }
  `,
})
export class RevisionesPendientesKpiComponent implements OnInit {
  private readonly servicio = inject(RevisionCancelacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rol = input.required<'DOCENTE' | 'COORDINADOR'>();
  protected readonly habilitado = Boolean(environment.features?.cancelacionInasistenciaEnabled);
  protected readonly total = signal<number | null>(null);
  protected readonly vista = computed(() => PRESENTACION[this.rol()]);

  ngOnInit(): void {
    if (!this.habilitado) return;
    const suscripcion = this.servicio.contarPendientes(this.rol()).subscribe({
      next: (n) => this.total.set(n),
      error: () => this.total.set(null),
    });
    this.destroyRef.onDestroy(() => suscripcion.unsubscribe());
  }
}

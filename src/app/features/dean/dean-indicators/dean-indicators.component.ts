import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DeanIndicatorsService } from '../../../core/services/dean-indicators.service';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { RolSinAmbito, rolSinAmbito } from '../../../core/api/errors/sin-ambito.util';
import { SinEntidadAsignadaComponent } from '../../../shared/components/sin-entidad-asignada/sin-entidad-asignada.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/**
 * Indicadores de la facultad: solo las tarjetas de cifras. La comparativa entre programas y el aforo de grupos
 * tienen sus pestañas propias en Seguimiento (P3 C5b), por eso ya no se repiten aquí.
 */
@Component({
    selector: 'app-dean-indicators',
    imports: [PageHeaderComponent, KpiCardComponent, SinEntidadAsignadaComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <section class="space-y-4">
      @if (sinAmbito(); as rol) {
        <app-sin-entidad-asignada [rol]="rol" />
      } @else {
      <header>
        @if (!embebido()) {
          <app-page-header titulo="Indicadores de la facultad" />
        }
        @if (service.kpis(); as k) {
          <p class="text-sm text-neutral-600">{{ k.nombreFacultad }} · {{ k.nombrePeriodoAcademico ?? 'Sin período' }}</p>
        }
      </header>

      @if (service.kpis(); as k) {
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <app-kpi-card etiqueta="Programas" [valor]="k.totalProgramas" />
          <app-kpi-card etiqueta="Estudiantes con matrícula activa" [valor]="k.totalEstudiantes" />
          <app-kpi-card etiqueta="En riesgo" [valor]="k.estudiantesRiesgo" />
          <app-kpi-card etiqueta="En pérdida" [valor]="k.estudiantesPerdida" />
          <app-kpi-card etiqueta="Retención por asistencia (período vigente)" [valor]="k.tasaRetencion" unidad="%" />
          <app-kpi-card etiqueta="Ausentismo" [valor]="k.porcentajeAusentismo" unidad="%" />
          <app-kpi-card etiqueta="Asistencia" [valor]="k.porcentajeAsistencia" unidad="%" />
          <app-kpi-card [etiqueta]="'Aforo de grupos activos (' + k.matriculadosActivos + ' / ' + k.cupoTotal + ')'" [valor]="k.tasaAforo" unidad="%" />
        </div>
      }
      }
    </section>
  `
})
export class DeanIndicatorsComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  readonly service = inject(DeanIndicatorsService);
  private readonly toast = inject(ToastService);
  /** HU178: el backend respondió que el usuario aún no tiene su ámbito asignado (código canónico KPI_00x). */
  readonly sinAmbito = signal<RolSinAmbito | null>(null);

  /** HU178: el rol sin ámbito es un estado controlado (aviso informativo); cualquier otro error se notifica. */
  private readonly fallo = (e: unknown): void => {
    const rol = rolSinAmbito(e);
    if (rol) {
      this.sinAmbito.set(rol);
      return;
    }
    this.toast.error(getApiErrorMessage(e));
  };

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.service.consultarKpis().subscribe({ error: this.fallo });
  }

  formatoPorcentaje(valor: number | null): string {
    return valor === null ? 'Sin datos' : `${valor}%`;
  }
}

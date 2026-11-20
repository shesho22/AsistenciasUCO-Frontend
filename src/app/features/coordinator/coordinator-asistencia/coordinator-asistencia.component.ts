import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { CoordinatorIndicatorsComponent } from '../coordinator-indicators/coordinator-indicators.component';
import { ConsolidadoAsistenciaComponent } from '../coordinator-consolidado/consolidado-asistencia.component';
import { RevisionesPendientesKpiComponent } from '../../../shared/components/revisiones-pendientes-kpi/revisiones-pendientes-kpi.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/**
 * CULM-001: pantalla única de asistencia del coordinador. Fusiona las antiguas «Asistencias del programa», «Consolidado
 * de asistencia» e «Indicadores»: tarjetas KPI arriba (GET /coordinador/indicadores), el consolidado por grupo como vista
 * principal (al expandir una fila aparecen las sesiones del grupo, con la cancelación de sesiones manuales) y, plegadas,
 * las alertas tempranas por estudiante. Solo reorganiza componentes existentes; no cambia contratos ni reglas.
 */
@Component({
  selector: 'app-coordinator-asistencia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [PageHeaderComponent, CoordinatorIndicatorsComponent, ConsolidadoAsistenciaComponent, RevisionesPendientesKpiComponent],
  template: `
    <div class="space-y-4 min-w-0">
      <app-page-header
        titulo="Asistencia del programa"
        descripcion="Indicadores del programa y consolidado por grupo; despliega un grupo para ver sus sesiones."
      />

      <!-- F (2026-11-19): «Revisiones por resolver» va dentro de la fila de indicadores, no en una tarjeta aparte. -->
      <app-coordinator-indicators parte="kpis" [embebido]="true" [conKpiExtra]="true" (programaCambiado)="alRecambiarPrograma()">
        <app-revisiones-pendientes-kpi kpi-extra rol="COORDINADOR" class="col-span-2 lg:col-span-1 xl:row-span-2 empty:hidden" />
      </app-coordinator-indicators>

      <app-consolidado-asistencia [embebido]="true" />

      <details
        class="superficie p-4"
        data-testid="alertas-plegables"
        (toggle)="alternarAlertas($any($event.target).open)"
      >
        <summary class="cursor-pointer text-sm font-semibold text-warm-900 min-h-[44px] flex items-center">
          Alertas tempranas por estudiante
        </summary>
        @if (alertasAbiertas()) {
          <div class="mt-3">
            <app-coordinator-indicators #alertasTempranas parte="alertas" [embebido]="true" />
          </div>
        }
      </details>
    </div>
  `,
})
export class CoordinatorAsistenciaComponent {
  readonly alertasAbiertas = signal(false);
  private readonly alertas = viewChild<CoordinatorIndicatorsComponent>('alertasTempranas');

  /** Las alertas se piden solo al desplegarlas: así no compiten con las tarjetas por cargar los programas. */
  alternarAlertas(abierto: boolean): void {
    this.alertasAbiertas.set(abierto);
  }

  /** Con las alertas ya abiertas, un cambio de programa también las recarga. */
  alRecambiarPrograma(): void {
    this.alertas()?.cargar();
  }
}

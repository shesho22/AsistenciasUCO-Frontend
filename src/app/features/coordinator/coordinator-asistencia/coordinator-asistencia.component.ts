import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { CoordinatorIndicatorsComponent } from '../coordinator-indicators/coordinator-indicators.component';
import { ConsolidadoAsistenciaComponent } from '../coordinator-consolidado/consolidado-asistencia.component';

/**
 * CULM-001: pantalla única de asistencia del coordinador. Fusiona las antiguas «Asistencias del programa», «Consolidado
 * de asistencia» e «Indicadores»: tarjetas KPI arriba (GET /coordinador/indicadores), el consolidado por grupo como vista
 * principal (al expandir una fila aparecen las sesiones del grupo, con la cancelación de sesiones manuales) y, plegadas,
 * las alertas tempranas por estudiante. Solo reorganiza componentes existentes; no cambia contratos ni reglas.
 */
@Component({
  selector: 'app-coordinator-asistencia',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CoordinatorIndicatorsComponent, ConsolidadoAsistenciaComponent],
  template: `
    <div class="space-y-5 min-w-0">
      <div>
        <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Asistencia del programa</h1>
        <p class="text-sm text-warm-600 mt-1">
          Indicadores del programa y consolidado por grupo; despliega un grupo para ver sus sesiones.
        </p>
      </div>

      <app-coordinator-indicators parte="kpis" [embebido]="true" (programaCambiado)="alRecambiarPrograma()" />

      <app-consolidado-asistencia [embebido]="true" />

      <details
        class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm"
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

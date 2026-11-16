import { ChangeDetectionStrategy, Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { CoordinadorSesionesService } from '../../../core/services/coordinador-sesiones.service';
import { CoordinatorProgramService } from '../../../core/services/coordinator-program.service';
import { CoordinatorSolicitudesSesionComponent } from '../coordinator-solicitudes-sesion/coordinator-solicitudes-sesion.component';
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
  imports: [PageHeaderComponent, CoordinatorIndicatorsComponent, ConsolidadoAsistenciaComponent, RevisionesPendientesKpiComponent, KpiCardComponent, CoordinatorSolicitudesSesionComponent],
  template: `
    <div class="space-y-5 min-w-0">
      <app-page-header
        titulo="Asistencia del programa"
        descripcion="Indicadores del programa y consolidado por grupo; despliega un grupo para ver sus sesiones."
      />

      <div class="max-w-sm">
        <app-revisiones-pendientes-kpi rol="COORDINADOR" />
      </div>

      <app-coordinator-indicators parte="kpis" [embebido]="true" (programaCambiado)="alRecambiarPrograma()" />

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <app-kpi-card
          etiqueta="Solicitudes de sesión pendientes"
          [valor]="solicitudesPendientes()"
          descripcion="Sesiones extraordinarias a la espera de tu aprobación"
        />
      </div>

      <app-coordinator-solicitudes-sesion (resuelta)="contarPendientes()" />

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
export class CoordinatorAsistenciaComponent implements OnInit {
  private readonly sesiones = inject(CoordinadorSesionesService);
  private readonly programa = inject(CoordinatorProgramService);
  /** `null` = sin dato (la consulta falló o no ha terminado): la tarjeta no inventa un cero. */
  readonly solicitudesPendientes = signal<number | null>(null);
  readonly alertasAbiertas = signal(false);
  private readonly alertas = viewChild<CoordinatorIndicatorsComponent>('alertasTempranas');

  ngOnInit(): void {
    this.programa.cargar().subscribe({ next: () => this.contarPendientes(), error: () => this.solicitudesPendientes.set(null) });
  }

  contarPendientes(): void {
    this.sesiones.contarPendientes(this.programa.programaId()).subscribe({
      next: (n) => this.solicitudesPendientes.set(n),
      error: () => this.solicitudesPendientes.set(null),
    });
  }

  /** Las alertas se piden solo al desplegarlas: así no compiten con las tarjetas por cargar los programas. */
  alternarAlertas(abierto: boolean): void {
    this.alertasAbiertas.set(abierto);
  }

  /** Con las alertas ya abiertas, un cambio de programa también las recarga. */
  alRecambiarPrograma(): void {
    this.contarPendientes();
    this.alertas()?.cargar();
  }
}

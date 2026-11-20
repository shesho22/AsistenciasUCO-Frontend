import { HorasMinutosPipe } from '../../../shared/pipes/horas-minutos.pipe';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DeanIndicatorsService } from '../../../core/services/dean-indicators.service';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { RolSinAmbito, rolSinAmbito } from '../../../core/api/errors/sin-ambito.util';
import { SinEntidadAsignadaComponent } from '../../../shared/components/sin-entidad-asignada/sin-entidad-asignada.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  paginarEnCliente,
} from '../../../shared/components/tabla-datos/tabla-datos.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
    selector: 'app-dean-indicators',
    imports: [PageHeaderComponent, KpiCardComponent, HorasMinutosPipe, PaginationComponent, SinEntidadAsignadaComponent, ErrorCargaComponent, TablaDatosComponent, BadgeComponent],
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

      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <h2 class="text-lg font-semibold">Ausentismo por programa</h2>
        <p class="mb-3 text-xs text-neutral-500" data-testid="nota-horas">Calculado por horas dictadas.</p>
        @if (errorComparativa(); as e) {
          <app-error-carga [error]="e" (reintentar)="cargarComparativa()" />
        } @else if (!cargandoComparativa() && service.comparativa().length === 0) {
          <p class="py-6 text-center text-sm text-neutral-500">No hay programas en esta facultad.</p>
        } @else {
          @if (cargandoComparativa()) {
            <p class="sr-only" role="status" data-testid="comparativa-cargando">Cargando programas…</p>
          }
          <app-tabla-datos
            etiqueta="Ausentismo por programa"
            [columnas]="5"
            anchoMinimo="48rem"
            [cargando]="cargandoComparativa()"
            [paginada]="true"
            [totalItems]="service.comparativa().length"
            [pagina]="paginaComparativa()"
            [tamanoPagina]="tamanoComparativa()"
            (paginaChange)="paginaComparativa.set($event)"
            (tamanoPaginaChange)="cambiarTamanoComparativa($event)"
          >
            <thead>
              <tr>
                <th scope="col">Programa</th>
                <th scope="col" class="text-right">Ausentismo</th>
                <th scope="col">Horas de falta / dictadas</th>
                <th scope="col" class="text-right">Estudiantes</th>
                <th scope="col" class="w-40">Ausentismo relativo</th>
              </tr>
            </thead>
            <tbody>
              @if (!cargandoComparativa()) {
                @for (p of comparativaPagina(); track p.idPrograma) {
                  <tr data-testid="programa-ausentismo-fila">
                    <td class="font-medium text-warm-900">
                      {{ p.nombrePrograma }}
                      @if (!p.estaActivoPrograma) {
                        <app-badge class="ml-2" variant="neutral" size="sm" [dot]="false">Inactivo</app-badge>
                      }
                    </td>
                    <td class="text-right font-semibold tabular-nums">{{ formatoPorcentaje(p.porcentajeAusentismo) }}</td>
                    <td class="text-xs text-warm-600 whitespace-nowrap">{{ p.horasFalta | horasMinutos }} de falta sobre {{ p.horasDictadas | horasMinutos }} dictadas</td>
                    <td class="text-right tabular-nums">{{ p.totalEstudiantes }}</td>
                    <td>
                      <div class="h-3 w-full min-w-24 rounded bg-neutral-100" aria-hidden="true">
                        <div class="h-3 rounded bg-danger-500" data-testid="barra-ausentismo" [style.width]="anchoBarra(p.porcentajeAusentismo)"></div>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </app-tabla-datos>
        }
      </div>

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


      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <h2 class="mb-3 text-lg font-semibold">Aforo de grupos</h2>
        <div class="mb-3 flex flex-wrap items-center gap-3">
          <select class="rounded-lg border border-neutral-200 px-3 py-2 text-sm" aria-label="Programa"
                  (change)="filtroPrograma.set($any($event.target).value); aplicarFiltros()">
            <option value="">Todos los programas</option>
            @for (p of service.comparativa(); track p.idPrograma) {
              <option [value]="p.idPrograma">{{ p.nombrePrograma }}</option>
            }
          </select>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" [checked]="incluirNoHabilitados()" (change)="incluirNoHabilitados.set($any($event.target).checked); aplicarFiltros()" />
            Incluir grupos no habilitados
          </label>
        </div>

        @if (service.aforo().length === 0) {
          <p class="py-6 text-center text-sm text-neutral-500">No hay grupos para los filtros seleccionados.</p>
        } @else {
          <table class="w-full text-left text-sm">
            <thead class="text-xs uppercase text-neutral-500">
              <tr><th scope="col" class="py-2">Grupo</th><th scope="col">Asignatura</th><th scope="col">Programa</th><th scope="col">Cupo</th><th scope="col">Matriculados</th><th scope="col">Disponibles</th><th scope="col">Aforo</th></tr>
            </thead>
            <tbody>
              @for (g of service.aforo(); track g.idGrupo) {
                <tr class="border-t border-neutral-100">
                  <td class="py-2">{{ g.codigoGrupo }}</td>
                  <td>{{ g.nombreAsignatura }}</td>
                  <td>{{ g.programas.join(', ') }}</td>
                  <td>{{ g.cupoMaximo }}</td>
                  <td>{{ g.matriculadosActivos }}</td>
                  <td>{{ g.cuposDisponibles }}</td>
                  <td>{{ formatoPorcentaje(g.tasaAforo) }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
        <app-pagination
          [totalItems]="service.totalAforo()"
          [pageSize]="tamano"
          [currentPage]="pagina()"
          [showPageSizeSelector]="false"
          (pageChange)="onPageChange($event)"
        />
      </div>
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

  /**
   * F-DEC-02: la comparativa es la consulta más lenta de la pantalla. "No hay programas" solo se afirma con la respuesta recibida:
   * mientras llega se muestra "Cargando" y si falla, el error con su reintento (antes ambos casos se veían como "vacío").
   */
  readonly cargandoComparativa = signal(true);
  readonly paginaComparativa = signal(1);
  readonly tamanoComparativa = signal(TAMANO_PAGINA_TABLA);
  readonly comparativaPagina = computed(() =>
    paginarEnCliente(this.service.comparativa(), this.paginaComparativa(), this.tamanoComparativa()),
  );

  cambiarTamanoComparativa(tamano: number): void {
    this.tamanoComparativa.set(tamano);
    this.paginaComparativa.set(1);
  }
  readonly errorComparativa = signal<LoadErrorState | null>(null);
  readonly tamano = 10;
  readonly pagina = signal(1);
  readonly filtroPrograma = signal('');
  readonly incluirNoHabilitados = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.service.consultarKpis().subscribe({ error: this.fallo });
    this.cargarComparativa();
    this.cargarAforo();
  }
  cargarComparativa(): void {
    this.cargandoComparativa.set(true);
    this.errorComparativa.set(null);
    this.service.consultarComparativa().subscribe({
      next: () => this.cargandoComparativa.set(false),
      error: (e: unknown) => {
        this.cargandoComparativa.set(false);
        if (rolSinAmbito(e)) {
          this.fallo(e);
          return;
        }
        this.errorComparativa.set(classifyLoadError(e));
        this.fallo(e);
      },
    });
  }

  aplicarFiltros(): void {
    this.pagina.set(1);
    this.cargarAforo();
  }

  onPageChange(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarAforo();
  }

  formatoPorcentaje(valor: number | null): string {
    return valor === null ? 'Sin datos' : `${valor}%`;
  }

  /** Solo presentación: escala el ancho al valor recibido (tope visual del 100 %). */
  anchoBarra(valor: number | null): string {
    return valor === null ? '0%' : `${Math.min(valor, 100)}%`;
  }

  private cargarAforo(): void {
    this.service
      .consultarAforo({
        pagina: this.pagina(),
        tamano: this.tamano,
        idPrograma: this.filtroPrograma() || undefined,
        soloHabilitados: this.incluirNoHabilitados() ? false : undefined,
      })
      .subscribe({ error: this.fallo });
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DeanIndicatorsService } from '../../../core/services/dean-indicators.service';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-dean-indicators',
  standalone: true,
  imports: [PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold text-neutral-900">Indicadores de la facultad</h1>
        @if (service.kpis(); as k) {
          <p class="text-sm text-neutral-600">{{ k.nombreFacultad }} · {{ k.nombrePeriodoAcademico ?? 'Sin período' }}</p>
        }
      </header>

      @if (service.kpis(); as k) {
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Programas</p><p class="text-2xl font-semibold">{{ k.totalProgramas }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Estudiantes con matrícula activa</p><p class="text-2xl font-semibold">{{ k.totalEstudiantes }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">En riesgo</p><p class="text-2xl font-semibold">{{ k.estudiantesRiesgo }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">En pérdida</p><p class="text-2xl font-semibold">{{ k.estudiantesPerdida }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Retención por asistencia (período vigente)</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.tasaRetencion) }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Ausentismo</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.porcentajeAusentismo) }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Asistencia</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.porcentajeAsistencia) }}</p></article>
          <article class="rounded-xl border border-neutral-100 bg-white p-4"><p class="text-xs text-neutral-500">Aforo de grupos activos ({{ k.matriculadosActivos }} / {{ k.cupoTotal }})</p><p class="text-2xl font-semibold">{{ formatoPorcentaje(k.tasaAforo) }}</p></article>
        </div>
      }

      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <h2 class="mb-3 text-lg font-semibold">Ausentismo por programa</h2>
        @if (service.comparativa().length === 0) {
          <p class="py-6 text-center text-sm text-neutral-500">No hay programas en esta facultad.</p>
        } @else {
          <ul class="space-y-3">
            @for (p of service.comparativa(); track p.idPrograma) {
              <li>
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium">{{ p.nombrePrograma }}@if (!p.estaActivoPrograma) { <span class="ml-2 text-xs text-neutral-500">Inactivo</span> }</span>
                  <span>{{ formatoPorcentaje(p.porcentajeAusentismo) }} · {{ p.totalEstudiantes }} estudiantes</span>
                </div>
                <div class="h-3 w-full rounded bg-neutral-100">
                  <div class="h-3 rounded bg-danger-500" data-testid="barra-ausentismo" [style.width]="anchoBarra(p.porcentajeAusentismo)"></div>
                </div>
              </li>
            }
          </ul>
        }
      </div>

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
              <tr><th class="py-2">Grupo</th><th>Asignatura</th><th>Programa</th><th>Cupo</th><th>Matriculados</th><th>Disponibles</th><th>Aforo</th></tr>
            </thead>
            <tbody>
              @for (g of service.aforo(); track g.idGrupo) {
                <tr class="border-t border-neutral-100">
                  <td class="py-2">{{ g.codigoGrupo }}</td>
                  <td>{{ g.nombreAsignatura }}</td>
                  <td>{{ g.nombrePrograma }}</td>
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
    </section>
  `,
})
export class DeanIndicatorsComponent implements OnInit {
  readonly service = inject(DeanIndicatorsService);
  private readonly toast = inject(ToastService);

  readonly tamano = 10;
  readonly pagina = signal(1);
  readonly filtroPrograma = signal('');
  readonly incluirNoHabilitados = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.service.consultarKpis().subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
    this.service.consultarComparativa().subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
    this.cargarAforo();
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
      .subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DeanIndicatorsService } from '../../../core/services/dean-indicators.service';
import { classifyLoadError, LoadErrorState } from '../../../core/api/errors/load-error.util';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/**
 * Pestaña «Aforo» de Seguimiento del decano: cupo, matriculados y cupos disponibles por grupo (GET /decano/aforo-grupos,
 * paginado en el servidor), con filtro por programa. Una sola tabla con encabezado fijo; en pantallas angostas cada fila es una tarjeta compacta.
 */
@Component({
  selector: 'app-dean-aforo',
  imports: [PageHeaderComponent, PaginationComponent, ErrorCargaComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-4">
      @if (!embebido()) {
        <app-page-header titulo="Aforo de grupos" />
      }
      <div class="flex flex-wrap items-center gap-3">
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

      @if (error(); as e) {
        <app-error-carga [error]="e" (reintentar)="cargarAforo()" />
      } @else if (cargando()) {
        <p role="status" class="py-6 text-center text-sm text-neutral-600" data-testid="aforo-cargando">Cargando grupos...</p>
      } @else if (service.aforo().length === 0) {
        <p class="py-6 text-center text-sm text-neutral-500" data-testid="aforo-vacio">No hay grupos para los filtros seleccionados.</p>
      } @else {
        <!-- Una sola presentación: tabla con encabezado fijo; bajo md cada fila es una tarjeta compacta (tabla-tarjetas). -->
        <div class="tabla-scroll" role="region" tabindex="0" aria-label="Aforo de grupos">
          <table class="tabla tabla-tarjetas tabla-tarjetas-compacta min-w-[48rem]">
            <caption class="sr-only">Aforo de grupos</caption>
            <thead>
              <tr>
                <th scope="col">Grupo</th><th scope="col">Asignatura</th><th scope="col">Programa</th>
                <th scope="col" class="text-right">Cupo</th><th scope="col" class="text-right">Matriculados</th>
                <th scope="col" class="text-right">Disponibles</th><th scope="col" class="text-right">Aforo</th>
              </tr>
            </thead>
            <tbody>
              @for (g of service.aforo(); track g.idGrupo) {
                <tr data-testid="aforo-fila">
                  <td class="tc-ancho" data-label="Grupo">
                    <span class="md:hidden font-semibold">{{ g.nombreAsignatura }} · Grupo {{ g.codigoGrupo }}</span>
                    <span class="hidden md:inline">{{ g.codigoGrupo }}</span>
                    @if (!g.grupoEstaHabilitado) {
                      <app-badge class="ml-2" variant="neutral" size="sm" [dot]="false">No habilitado</app-badge>
                    }
                  </td>
                  <td class="max-md:hidden">{{ g.nombreAsignatura }}</td>
                  <td class="tc-ancho" data-label="Programa">{{ g.programas.join(', ') }}</td>
                  <td class="text-right tabular-nums" data-label="Cupo">{{ g.cupoMaximo }}</td>
                  <td class="text-right tabular-nums" data-label="Matriculados">{{ g.matriculadosActivos }}</td>
                  <td class="text-right tabular-nums" data-label="Disponibles">{{ g.cuposDisponibles }}</td>
                  <td class="text-right font-semibold tabular-nums" data-label="Aforo">{{ porcentaje(g.tasaAforo) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-pagination
          [totalItems]="service.totalAforo()"
          [pageSize]="tamano"
          [currentPage]="pagina()"
          [showPageSizeSelector]="false"
          (pageChange)="onPageChange($event)"
        />
      }
    </section>
  `,
})
export class DeanAforoComponent implements OnInit {
  readonly embebido = input(false);
  readonly service = inject(DeanIndicatorsService);

  readonly tamano = 10;
  readonly pagina = signal(1);
  readonly filtroPrograma = signal('');
  readonly incluirNoHabilitados = signal(false);
  readonly cargando = signal(true);
  readonly error = signal<LoadErrorState | null>(null);

  ngOnInit(): void {
    // Los programas alimentan el filtro; un fallo aquí solo deja el selector con la opción «Todos».
    this.service.consultarComparativa().subscribe({ error: () => undefined });
    this.cargarAforo();
  }

  cargarAforo(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service
      .consultarAforo({
        pagina: this.pagina(),
        tamano: this.tamano,
        idPrograma: this.filtroPrograma() || undefined,
        soloHabilitados: this.incluirNoHabilitados() ? false : undefined,
      })
      .subscribe({
        next: () => this.cargando.set(false),
        error: (e: unknown) => {
          this.cargando.set(false);
          this.error.set(classifyLoadError(e));
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

  porcentaje(valor: number | null): string {
    return valor === null ? 'Sin datos' : `${valor}%`;
  }
}

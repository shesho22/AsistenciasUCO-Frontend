import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DeanIndicatorsService } from '../../../core/services/dean-indicators.service';
import { classifyLoadError, LoadErrorState } from '../../../core/api/errors/load-error.util';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ComparativaPrograma } from '../../../core/models/dean-indicators.model';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { HorasMinutosPipe } from '../../../shared/pipes/horas-minutos.pipe';
import { TablaDatosComponent, TAMANO_PAGINA_TABLA, paginarEnCliente } from '../../../shared/components/tabla-datos/tabla-datos.component';

/**
 * Pestaña «Comparativa» de Seguimiento del decano: los programas de la facultad lado a lado (GET /decano/comparativa-programas).
 * Las cifras se muestran tal como las entrega el backend; en pantallas angostas cada programa es una tarjeta.
 */
@Component({
  selector: 'app-dean-comparativa',
  imports: [PageHeaderComponent, TablaDatosComponent, PaginationComponent, ErrorCargaComponent, BadgeComponent, HorasMinutosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-4">
      @if (!embebido()) {
        <app-page-header titulo="Comparativa de programas" />
      }
      <p class="text-xs text-neutral-500" data-testid="nota-horas">Ausentismo calculado por horas dictadas.</p>

      @if (error(); as e) {
        <app-error-carga [error]="e" (reintentar)="cargar()" />
      } @else if (cargando()) {
        <p role="status" class="py-6 text-center text-sm text-neutral-600" data-testid="comparativa-cargando">Cargando programas...</p>
      } @else if (service.comparativa().length === 0) {
        <p class="py-6 text-center text-sm text-neutral-500" data-testid="comparativa-vacia">No hay programas en esta facultad.</p>
      } @else {
        <div class="hidden md:block">
          <app-tabla-datos
            etiqueta="Comparativa de programas"
            [columnas]="7"
            anchoMinimo="52rem"
            [paginada]="true"
            [totalItems]="service.comparativa().length"
            [pagina]="pagina()"
            [tamanoPagina]="tamano()"
            (paginaChange)="pagina.set($event)"
            (tamanoPaginaChange)="cambiarTamano($event)"
          >
            <thead>
              <tr>
                <th scope="col">Programa</th>
                <th scope="col" class="text-right">Ausentismo</th>
                <th scope="col">Horas de falta</th>
                <th scope="col" class="text-right">Estudiantes</th>
                <th scope="col" class="text-right">En riesgo</th>
                <th scope="col" class="text-right">En pérdida</th>
                <th scope="col" class="text-right">Retención</th>
              </tr>
            </thead>
            <tbody>
              @for (p of filas(); track p.idPrograma) {
                <tr data-testid="comparativa-fila">
                  <td class="font-medium text-warm-900">
                    {{ p.nombrePrograma }}
                    @if (!p.estaActivoPrograma) {
                      <app-badge class="ml-2" variant="neutral" size="sm" [dot]="false">Inactivo</app-badge>
                    }
                  </td>
                  <td class="text-right font-semibold tabular-nums">{{ porcentaje(p.porcentajeAusentismo) }}</td>
                  <td class="text-xs text-warm-600 whitespace-nowrap">{{ textoHoras(p) }}</td>
                  <td class="text-right tabular-nums">{{ p.totalEstudiantes }}</td>
                  <td class="text-right tabular-nums">{{ p.estudiantesRiesgo }}</td>
                  <td class="text-right tabular-nums">{{ p.estudiantesPerdida }}</td>
                  <td class="text-right tabular-nums">{{ porcentaje(p.tasaRetencion) }}</td>
                </tr>
              }
            </tbody>
          </app-tabla-datos>
        </div>

        <div class="space-y-3 md:hidden" data-testid="comparativa-tarjetas">
          @for (p of filas(); track p.idPrograma) {
            <article class="superficie p-4 space-y-2" data-testid="comparativa-tarjeta">
              <h3 class="text-sm font-semibold text-warm-900">
                {{ p.nombrePrograma }}
                @if (!p.estaActivoPrograma) {
                  <app-badge class="ml-2" variant="neutral" size="sm" [dot]="false">Inactivo</app-badge>
                }
              </h3>
              <dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt class="text-warm-600">Ausentismo</dt><dd class="text-right font-semibold tabular-nums">{{ porcentaje(p.porcentajeAusentismo) }}</dd>
                <dt class="text-warm-600">Estudiantes</dt><dd class="text-right tabular-nums">{{ p.totalEstudiantes }}</dd>
                <dt class="text-warm-600">En riesgo</dt><dd class="text-right tabular-nums">{{ p.estudiantesRiesgo }}</dd>
                <dt class="text-warm-600">En pérdida</dt><dd class="text-right tabular-nums">{{ p.estudiantesPerdida }}</dd>
                <dt class="text-warm-600">Retención</dt><dd class="text-right tabular-nums">{{ porcentaje(p.tasaRetencion) }}</dd>
              </dl>
              <p class="text-xs text-warm-600">{{ textoHoras(p) }}</p>
            </article>
          }
          <app-pagination
            [totalItems]="service.comparativa().length"
            [pageSize]="tamano()"
            [currentPage]="pagina()"
            [showPageSizeSelector]="false"
            (pageChange)="pagina.set($event)"
          />
        </div>
      }
    </section>
  `,
})
export class DeanComparativaComponent implements OnInit {
  readonly embebido = input(false);
  readonly service = inject(DeanIndicatorsService);
  private readonly formato = new HorasMinutosPipe();

  readonly cargando = signal(true);
  readonly error = signal<LoadErrorState | null>(null);
  readonly pagina = signal(1);
  readonly tamano = signal(TAMANO_PAGINA_TABLA);
  readonly filas = computed(() => paginarEnCliente(this.service.comparativa(), this.pagina(), this.tamano()));

  /** ATA D2: el % se calcula sobre las horas del período; sin ese dato se conserva la base anterior (horas dictadas). */
  textoHoras(p: ComparativaPrograma): string {
    const base = p.horasPeriodo ?? p.horasDictadas;
    return mensajeUi(p.horasPeriodo == null ? 'UI_DEAN_COMPARATIVA_002' : 'UI_DEAN_COMPARATIVA_001', {
      falta: this.formato.transform(p.horasFalta),
      base: this.formato.transform(base),
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service.consultarComparativa().subscribe({
      next: () => this.cargando.set(false),
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(classifyLoadError(e));
      },
    });
  }

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
  }

  porcentaje(valor: number | null): string {
    return valor === null ? 'Sin datos' : `${valor}%`;
  }
}

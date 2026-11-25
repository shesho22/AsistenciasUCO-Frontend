import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { Component, ChangeDetectionStrategy, computed, input, signal } from '@angular/core';

import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  paginarEnCliente,
} from '../../../../shared/components/tabla-datos/tabla-datos.component';
import { CoordinadorItem } from '../../../../core/models/role-management.model';
import { KpisDecano } from '../../../../core/models/dean-indicators.model';
import { EstadoIndicadores, textoCifra, textoPeriodo } from '../../../../core/utils/cifra-indicador';

@Component({
    selector: 'app-overview-dean',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent, RouterLink, ButtonComponent, TablaDatosComponent],
    host: {
        class: 'block w-full',
    },
    template: `
    <div class="space-y-4">
      <!-- KPIs Decano -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3" [attr.aria-busy]="estado() === 'cargando'">
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Coordinadores Asignados</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5" data-testid="coordinadores">{{ texto(kpis()?.totalCoordinadores) }}</p>
          <span class="text-[11px] text-primary-700 font-medium">Programas de facultad</span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Docentes de Facultad</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5" data-testid="docentes">{{ texto(kpis()?.totalDocentes) }}</p>
          <span class="text-[11px] text-warm-500 font-medium">Con vínculo activo en sus programas</span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Grupos en Curso</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5" data-testid="grupos">{{ texto(kpis()?.gruposActivos) }}</p>
          <span class="text-[11px] text-warm-500 font-medium" data-testid="periodo">{{ periodoTexto() }}</span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Asistencia Promedio</span>
          <p class="text-xl font-serif font-bold text-success-700 mt-0.5" data-testid="asistencia">{{ texto(kpis()?.porcentajeAsistencia, '%') }}</p>
          <span class="text-[11px] text-warm-500 font-medium">Período vigente de la facultad</span>
        </div>
      </section>

      <!-- Programas Académicos de la Facultad -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif text-xl sm:text-2xl font-bold text-warm-900">Programas Académicos de la Facultad</h2>
            <p class="text-xs text-warm-500">Supervisión de coordinadores responsables y carga académica adscrita</p>
          </div>
          <a routerLink="/app/decano/mi-facultad/coordinadores">
            <app-button variant="secondary" size="sm">Gestionar Todos →</app-button>
          </a>
        </div>

        @if (coordinadores().length === 0) {
          <app-empty-state
            title="No hay coordinadores asignados en esta facultad."
            causa="Asigna un coordinador a cada programa desde la gestión de coordinadores."
          />
        } @else {
          <app-tabla-datos
            etiqueta="Programas académicos de la facultad"
            [columnas]="6"
            anchoMinimo="52rem"
            [paginada]="true"
            [totalItems]="coordinadores().length"
            [pagina]="pagina()"
            [tamanoPagina]="tamanoPagina()"
            (paginaChange)="pagina.set($event)"
            (tamanoPaginaChange)="cambiarTamano($event)"
          >
            <thead>
              <tr>
                <th scope="col">Programa</th>
                <th scope="col">Coordinador(a)</th>
                <th scope="col">Correo</th>
                <th scope="col" class="text-right">Docentes</th>
                <th scope="col" class="text-right">Grupos</th>
                <th scope="col"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (coord of coordinadoresPagina(); track coord.id) {
                <tr data-testid="programa-coordinador-fila">
                  <td class="font-semibold text-warm-900">{{ coord.programaAcademico }}</td>
                  <td>{{ coord.nombres + ' ' + coord.apellidos }}</td>
                  <td class="text-warm-700">{{ coord.correo }}</td>
                  <td class="text-right tabular-nums">{{ coord.totalDocentes ?? '—' }}</td>
                  <td class="text-right tabular-nums">{{ coord.totalGrupos ?? '—' }}</td>
                  <td class="text-right">
                    <a
                      routerLink="/app/decano/mi-facultad/coordinadores"
                      [queryParams]="{ busqueda: coord.correo }"
                      class="inline-flex items-center rounded-xl border border-warm-200 bg-white px-3 py-1.5 text-xs font-semibold text-warm-800 hover:bg-warm-50 whitespace-nowrap"
                    >
                      Administrar Coordinación
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </app-tabla-datos>
        }
      </section>
    </div>
  `
})
export class OverviewDeanComponent {
  /** Coordinadores que se listan abajo (no se cuentan: las cifras salen de `kpis`). */
  coordinadores = input<CoordinadorItem[]>([]);
  /** CIERRE-W3I: indicadores de la facultad calculados en la base (GET /decano/indicadores). */
  kpis = input<KpisDecano | null>(null);
  estado = input<EstadoIndicadores>('cargando');

  readonly pagina = signal(1);
  readonly tamanoPagina = signal(TAMANO_PAGINA_TABLA);
  readonly coordinadoresPagina = computed(() => paginarEnCliente(this.coordinadores(), this.pagina(), this.tamanoPagina()));

  cambiarTamano(tamano: number): void {
    this.tamanoPagina.set(tamano);
    this.pagina.set(1);
  }

  /**
   * F-DEC-01: "Sin período vigente" solo se afirma cuando el servidor respondió y no hay período; mientras carga o si falló
   * no se declara nada sobre el período.
   */
  periodoTexto = computed(() => textoPeriodo(this.estado(), this.kpis()?.nombrePeriodoAcademico));

  texto(valor: number | null | undefined, sufijo = ''): string {
    return textoCifra(valor, this.estado(), sufijo);
  }
}

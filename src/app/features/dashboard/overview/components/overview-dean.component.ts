import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CoordinadorItem } from '../../../../core/models/role-management.model';
import { KpisDecano } from '../../../../core/models/dean-indicators.model';
import { EstadoIndicadores, textoCifra, textoPeriodo } from '../../../../core/utils/cifra-indicador';

@Component({
    selector: 'app-overview-dean',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent, RouterLink, CardComponent, ButtonComponent],
    host: {
        class: 'block w-full',
    },
    template: `
    <div class="space-y-6">
      <!-- KPIs Decano -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4" [attr.aria-busy]="estado() === 'cargando'">
        <div class="superficie p-5 flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Coordinadores Asignados</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1" data-testid="coordinadores">{{ texto(kpis()?.totalCoordinadores) }}</p>
          <span class="text-[11px] text-primary-700 font-medium">Programas de facultad</span>
        </div>
        <div class="superficie p-5 flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Docentes de Facultad</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1" data-testid="docentes">{{ texto(kpis()?.totalDocentes) }}</p>
          <span class="text-[11px] text-warm-500 font-medium">Con vínculo activo en sus programas</span>
        </div>
        <div class="superficie p-5 flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Grupos en Curso</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1" data-testid="grupos">{{ texto(kpis()?.gruposActivos) }}</p>
          <span class="text-[11px] text-warm-500 font-medium" data-testid="periodo">{{ periodoTexto() }}</span>
        </div>
        <div class="superficie p-5 flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Asistencia Promedio</span>
          <p class="text-2xl font-serif font-bold text-success-700 mt-1" data-testid="asistencia">{{ texto(kpis()?.porcentajeAsistencia, '%') }}</p>
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

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          @for (coord of coordinadores(); track coord.id) {
            <app-card [hoverable]="true" [title]="coord.programaAcademico" [subtitle]="coord.nombres + ' ' + coord.apellidos">
              <div class="space-y-3 my-2 text-xs text-warm-700">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-primary-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span class="font-medium text-warm-800">{{ coord.correo }}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-2 border-t border-warm-100">
                  <div class="bg-warm-50 p-2 rounded-lg text-center">
                    <span class="block text-warm-500 text-[10px]">Docentes</span>
                    <span class="font-bold text-warm-900 text-sm">{{ coord.totalDocentes ?? '—' }}</span>
                  </div>
                  <div class="bg-warm-50 p-2 rounded-lg text-center">
                    <span class="block text-warm-500 text-[10px]">Grupos</span>
                    <span class="font-bold text-warm-900 text-sm">{{ coord.totalGrupos ?? '—' }}</span>
                  </div>
                </div>
              </div>

              <div card-footer class="mt-4 pt-3 border-t border-warm-100 flex items-center justify-end">
                <a routerLink="/app/decano/mi-facultad/coordinadores" class="w-full">
                  <app-button variant="secondary" size="sm" [fullWidth]="true">
                    Administrar Coordinación
                  </app-button>
                </a>
              </div>
            </app-card>
          } @empty {
            <div class="col-span-3">
              <app-empty-state
                title="No hay coordinadores asignados en esta facultad."
                causa="Asigna un coordinador a cada programa desde la gestión de coordinadores."
              />
            </div>
          }
        </div>
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

  /**
   * F-DEC-01: "Sin período vigente" solo se afirma cuando el servidor respondió y no hay período; mientras carga o si falló
   * no se declara nada sobre el período.
   */
  periodoTexto = computed(() => textoPeriodo(this.estado(), this.kpis()?.nombrePeriodoAcademico));

  texto(valor: number | null | undefined, sufijo = ''): string {
    return textoCifra(valor, this.estado(), sufijo);
  }
}

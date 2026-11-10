import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CoordinadorItem } from '../../../../core/models/role-management.model';

@Component({
  selector: 'app-overview-dean',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, CardComponent, ButtonComponent],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="space-y-6">
      <!-- KPIs Decano -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Coordinadores Asignados</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ coordinadores().length }}</p>
          <span class="text-[11px] text-primary-700 font-medium">Programas de facultad</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Docentes de Facultad</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ totalDocentes() }}</p>
          <span class="text-[11px] text-warm-500 font-medium">Asignados a los coordinadores</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Grupos en Curso</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ totalGrupos() ?? '—' }}</p>
          <span class="text-[11px] text-warm-500 font-medium">{{ periodo() ?? 'Sin período vigente' }}</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Asistencia Promedio</span>
          <p class="text-2xl font-serif font-bold text-success-700 mt-1">{{ porcentajeAsistencia() === null ? 'Sin datos' : porcentajeAsistencia() + '%' }}</p>
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
            <div class="col-span-3 bg-white p-12 rounded-2xl border border-warm-200 text-center space-y-3">
              <p class="text-xs text-warm-500">No hay coordinadores asignados en esta facultad.</p>
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class OverviewDeanComponent {
  coordinadores = input<CoordinadorItem[]>([]);
  totalDocentes = input<number>(0);
  /** Grupos activos del período vigente (GET /decano/indicadores); `null` si la consulta no está disponible. */
  totalGrupos = input<number | null>(null);
  /** Nombre del período al que corresponden los indicadores. */
  periodo = input<string | null>(null);
  porcentajeAsistencia = input<number | null>(null);
}

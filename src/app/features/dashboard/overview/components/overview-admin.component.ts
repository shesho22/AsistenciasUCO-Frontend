import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DecanoItem } from '../../../../core/models/role-management.model';

@Component({
  selector: 'app-overview-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, CardComponent, BadgeComponent, ButtonComponent],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="space-y-6">
      <!-- KPIs Administrador -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Facultades Activas</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ totalFacultades() }}</p>
          <span class="text-[11px] text-success-700 font-medium">Sincronizadas con base de datos</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Decanos en ejercicio</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1" data-testid="decanos-activos">{{ decanosActivos() }}</p>
          <span class="text-[11px] text-warm-500 font-medium">{{ decanos().length }} registrados</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Programas Académicos</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ totalProgramas() === null ? 'Sin datos' : totalProgramas() }}</p>
          <span class="text-[11px] text-primary-700 font-medium">De la institución</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Asistencia Promedio Campus</span>
          <p class="text-2xl font-serif font-bold text-accent-700 mt-1" data-testid="asistencia-campus">{{ porcentajeAsistencia() === null ? 'Sin datos' : porcentajeAsistencia() + '%' }}</p>
          <span class="text-[11px] text-success-700 font-medium">Indicador institucional</span>
        </div>
      </section>

      <!-- Directorio de Facultades y Decanaturas -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif text-xl sm:text-2xl font-bold text-warm-900">Directorio de Facultades y Decanaturas</h2>
            <p class="text-xs text-warm-500">Supervisión general de decanos titulares y facultades adscritas a la universidad</p>
          </div>
          <a routerLink="/app/admin/decanos">
            <app-button variant="secondary" size="sm">Ver Todas las Decanaturas →</app-button>
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          @for (decano of decanos(); track decano.id) {
            <app-card [hoverable]="true" [title]="decano.facultad" [subtitle]="decano.nombres + ' ' + decano.apellidos">
              <div class="space-y-3 my-2 text-xs text-warm-700">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-primary-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span class="font-medium text-warm-800">{{ decano.correo }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-primary-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-warm-600">Asignado: {{ decano.fechaAsignacion }}</span>
                </div>
                <div class="pt-2 border-t border-warm-100 flex items-center justify-between">
                  <span class="text-warm-500 font-medium">Estado institucional:</span>
                  <app-badge [variant]="decano.estado === 'ACTIVO' ? 'success' : 'neutral'">
                    {{ decano.estado }}
                  </app-badge>
                </div>
              </div>

              <div card-footer class="mt-4 pt-3 border-t border-warm-100 flex items-center justify-end">
                <a routerLink="/app/admin/decanos" class="w-full">
                  <app-button variant="secondary" size="sm" [fullWidth]="true">
                    Gestionar Decano
                  </app-button>
                </a>
              </div>
            </app-card>
          } @empty {
            <div class="col-span-3 bg-white p-12 rounded-2xl border border-warm-200 text-center space-y-3">
              <p class="text-xs text-warm-500">No se encontraron decanos registrados en la institución.</p>
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class OverviewAdminComponent {
  decanos = input<DecanoItem[]>([]);
  totalFacultades = input<number>(0);
  totalProgramas = input<number | null>(null);
  /** `porcentajeAsistencia` de GET /admin/indicadores; `null` = sin dato. */
  porcentajeAsistencia = input<number | null>(null);
  /** Solo los decanos con `estaActivoDecano` distinto de false. */
  decanosActivos = computed(() => this.decanos().filter((d) => d.estaActivoDecano !== false).length);
}

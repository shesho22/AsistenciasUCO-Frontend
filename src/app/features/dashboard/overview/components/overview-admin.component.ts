import { CifraConBaseComponent } from '../../../../shared/components/cifra-con-base/cifra-con-base.component';
import { Component, ChangeDetectionStrategy, input } from '@angular/core';

import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DecanoItem } from '../../../../core/models/role-management.model';
import { KpisInstitucion } from '../../../../core/models/admin-indicators.model';
import { EstadoIndicadores, textoCifra } from '../../../../core/utils/cifra-indicador';

@Component({
    selector: 'app-overview-admin',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CifraConBaseComponent, RouterLink, CardComponent, BadgeComponent, ButtonComponent],
    host: {
        class: 'block w-full',
    },
    template: `
    <div class="space-y-6">
      <!-- KPIs Administrador -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4" [attr.aria-busy]="estado() === 'cargando'">
        <div class="superficie p-5 flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Facultades Activas</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1" data-testid="facultades-activas">{{ texto(kpis()?.facultadesActivas) }}</p>
          <span class="text-[11px] text-success-700 font-medium">De la institución</span>
        </div>
        <div class="superficie p-5 flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Decanos en ejercicio</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1" data-testid="decanos-activos">{{ texto(kpis()?.decanosActivos) }}</p>
          <span class="text-[11px] text-warm-500 font-medium">
            @if (estado() === 'listo' && kpis(); as k) {
              <app-cifra-con-base [valor]="k.decanosActivos" [base]="k.totalDecanos" [soloBase]="true" />
            }
          </span>
        </div>
        <div class="superficie p-5 flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Programas Académicos</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1" data-testid="programas">{{ texto(kpis()?.totalProgramas) }}</p>
          <span class="text-[11px] text-primary-700 font-medium">De la institución</span>
        </div>
        <div class="superficie p-5 flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Asistencia Promedio Campus</span>
          <p class="text-2xl font-serif font-bold text-accent-700 mt-1" data-testid="asistencia-campus">{{ texto(kpis()?.porcentajeAsistencia, '%') }}</p>
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
                @if (decano.fechaAsignacion) {
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-primary-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span class="text-warm-600">Asignado: {{ decano.fechaAsignacion }}</span>
                  </div>
                }
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
  `
})
export class OverviewAdminComponent {
  /** Directorio de decanos que se lista abajo (no se cuenta: las cifras salen de `kpis`). */
  decanos = input<DecanoItem[]>([]);
  /** CIERRE-W3I: indicadores de la institución calculados en la base (GET /admin/indicadores). */
  kpis = input<KpisInstitucion | null>(null);
  estado = input<EstadoIndicadores>('cargando');

  texto(valor: number | null | undefined, sufijo = ''): string {
    return textoCifra(valor, this.estado(), sufijo);
  }
}

import { CifraConBaseComponent } from '../../../../shared/components/cifra-con-base/cifra-con-base.component';
import { Component, ChangeDetectionStrategy, computed, input, signal } from '@angular/core';

import { RouterLink } from '@angular/router';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  paginarEnCliente,
} from '../../../../shared/components/tabla-datos/tabla-datos.component';
import { DecanoItem } from '../../../../core/models/role-management.model';
import { KpisInstitucion } from '../../../../core/models/admin-indicators.model';
import { EstadoIndicadores, textoCifra } from '../../../../core/utils/cifra-indicador';

@Component({
    selector: 'app-overview-admin',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CifraConBaseComponent, RouterLink, BadgeComponent, ButtonComponent, TablaDatosComponent],
    host: {
        class: 'block w-full',
    },
    template: `
    <div class="space-y-4">
      <!-- KPIs Administrador -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3" [attr.aria-busy]="estado() === 'cargando'">
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Facultades Activas</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5" data-testid="facultades-activas">{{ texto(kpis()?.facultadesActivas) }}</p>
          <span class="text-[11px] text-success-700 font-medium">De la institución</span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Decanos en ejercicio</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5" data-testid="decanos-activos">{{ texto(kpis()?.decanosActivos) }}</p>
          <span class="text-[11px] text-warm-500 font-medium">
            @if (estado() === 'listo' && kpis(); as k) {
              <app-cifra-con-base [valor]="k.decanosActivos" [base]="k.totalDecanos" [soloBase]="true" />
            }
          </span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Programas Académicos</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5" data-testid="programas">{{ texto(kpis()?.totalProgramas) }}</p>
          <span class="text-[11px] text-primary-700 font-medium">De la institución</span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Asistencia Promedio Campus</span>
          <p class="text-xl font-serif font-bold text-accent-700 mt-0.5" data-testid="asistencia-campus">{{ texto(kpis()?.porcentajeAsistencia, '%') }}</p>
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

        <app-tabla-datos
          etiqueta="Directorio de facultades y decanaturas"
          [columnas]="6"
          anchoMinimo="56rem"
          [vacio]="decanos().length === 0"
          mensajeVacio="No se encontraron decanos registrados en la institución."
          [paginada]="true"
          [totalItems]="decanos().length"
          [pagina]="pagina()"
          [tamanoPagina]="tamanoPagina()"
          (paginaChange)="pagina.set($event)"
          (tamanoPaginaChange)="cambiarTamano($event)"
        >
          <thead>
            <tr>
              <th scope="col">Facultad</th>
              <th scope="col">Decano(a)</th>
              <th scope="col">Correo</th>
              <th scope="col">Asignado</th>
              <th scope="col">Estado</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (decano of decanosPagina(); track decano.id) {
              <tr data-testid="decano-fila">
                <td class="font-semibold text-warm-900">{{ decano.facultad }}</td>
                <td>{{ decano.nombres + ' ' + decano.apellidos }}</td>
                <td class="text-warm-700">{{ decano.correo }}</td>
                <td class="text-warm-600 whitespace-nowrap" data-testid="decano-asignado">{{ decano.fechaAsignacion || '—' }}</td>
                <td>
                  <app-badge [variant]="decano.estado === 'ACTIVO' ? 'success' : 'neutral'" size="sm">{{ decano.estado }}</app-badge>
                </td>
                <td class="text-right">
                  <a
                    routerLink="/app/admin/decanos"
                    [queryParams]="{ busqueda: decano.facultad }"
                    class="inline-flex items-center rounded-xl border border-warm-200 bg-white px-3 py-1.5 text-xs font-semibold text-warm-800 hover:bg-warm-50 whitespace-nowrap"
                  >
                    Gestionar Decano
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </app-tabla-datos>
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

  readonly pagina = signal(1);
  readonly tamanoPagina = signal(TAMANO_PAGINA_TABLA);
  readonly decanosPagina = computed(() => paginarEnCliente(this.decanos(), this.pagina(), this.tamanoPagina()));

  cambiarTamano(tamano: number): void {
    this.tamanoPagina.set(tamano);
    this.pagina.set(1);
  }

  texto(valor: number | null | undefined, sufijo = ''): string {
    return textoCifra(valor, this.estado(), sufijo);
  }
}

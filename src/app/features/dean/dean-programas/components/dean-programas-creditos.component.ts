import { Component, ChangeDetectionStrategy, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgramaCreditosItem } from '../../../../core/models/consultas-transversales.model';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

/**
 * HU112: tabla unificada de programas y créditos de la facultad (una fila por programa y plan, con semestres,
 * asignaturas y suma de créditos). Recibe las filas que ya cargó la pantalla de programas (una sola consulta, que
 * también alimenta los créditos de las tarjetas) y las filtra y pagina en el navegador.
 */
@Component({
    selector: 'app-dean-programas-creditos',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent],
    template: `
    <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4" aria-label="Programas y créditos">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="font-serif font-bold text-lg text-warm-900">Programas y Créditos</h2>
          <p class="text-xs text-warm-500">Créditos, semestres y asignaturas de cada plan de estudio de la facultad.</p>
        </div>
        <span class="px-3 py-1.5 rounded-xl bg-primary-50 text-xs font-bold text-primary-800 border border-primary-200">
          {{ totalCreditos() }} créditos en {{ filas().length }} planes
        </span>
      </div>

      @if (error()) {
        <p class="text-sm text-danger-700 text-center py-4" role="alert">{{ error() }}</p>
      } @else {
        <input
          type="text"
          aria-label="Filtrar programas y créditos"
          [ngModel]="filtro()"
          (ngModelChange)="onFiltro($event)"
          placeholder="Filtrar por programa, tipo o INP del plan..."
          class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900"
        />
        @if (filtradas().length === 0) {
          <p class="text-sm text-warm-500 text-center py-4">No hay programas que coincidan.</p>
        } @else {
          <div class="relative overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="py-2 pr-3">Programa</th>
                  <th scope="col" class="py-2 pr-3">Plan</th>
                  <th scope="col" class="py-2 pr-3 text-right">Semestres</th>
                  <th scope="col" class="py-2 pr-3 text-right">Asignaturas</th>
                  <th scope="col" class="py-2 pr-3 text-right">Créditos</th>
                  <th scope="col" class="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (f of pagina(); track clave(f)) {
                  <tr class="border-b border-warm-50">
                    <td class="py-2 pr-3">
                      <span class="font-semibold text-warm-900 block">{{ f.nombrePrograma }}</span>
                      <span class="text-xs text-warm-500">{{ f.nombreTipoPrograma || '—' }} · {{ f.nombreModalidad || '—' }} · {{ f.nombreJornada || '—' }}</span>
                    </td>
                    <td class="py-2 pr-3 font-mono text-xs text-warm-700">{{ f.inpPlanEstudio != null ? 'INP-' + f.inpPlanEstudio : 'Sin plan' }}</td>
                    <td class="py-2 pr-3 text-right text-warm-700">{{ f.totalSemestres }}</td>
                    <td class="py-2 pr-3 text-right text-warm-700">{{ f.totalAsignaturas }}</td>
                    <td class="py-2 pr-3 text-right font-bold text-warm-900">{{ f.totalCreditos }}</td>
                    <td class="py-2">
                      <app-badge [variant]="f.programaActivo && f.planActivo ? 'success' : 'neutral'" size="sm">
                        {{ f.programaActivo && f.planActivo ? 'Vigente' : 'Inactivo' }}
                      </app-badge>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination
            [totalItems]="filtradas().length"
            [pageSize]="tamano()"
            [currentPage]="paginaActual()"
            (pageChange)="paginaActual.set($event)"
            (pageSizeChange)="onTamano($event)"
          ></app-pagination>
        }
      }
    </section>
  `
})
export class DeanProgramasCreditosComponent {
  readonly filas = input<ProgramaCreditosItem[]>([]);
  readonly error = input<string | null>(null);

  filtro = signal('');
  paginaActual = signal(1);
  tamano = signal(10);

  readonly totalCreditos = computed(() => this.filas().reduce((suma, f) => suma + f.totalCreditos, 0));

  readonly filtradas = computed(() => {
    const q = this.filtro().toLowerCase().trim();
    if (!q) return this.filas();
    return this.filas().filter(
      (f) =>
        f.nombrePrograma.toLowerCase().includes(q) ||
        (f.nombreTipoPrograma ?? '').toLowerCase().includes(q) ||
        String(f.inpPlanEstudio ?? '').includes(q)
    );
  });

  readonly pagina = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.tamano();
    return this.filtradas().slice(inicio, inicio + this.tamano());
  });

  /** Identidad de la fila: un programa puede tener varios planes y un programa sin plan trae el plan en nulo. */
  clave(fila: ProgramaCreditosItem): string {
    return `${fila.idPrograma}|${fila.idPlanEstudio ?? ''}`;
  }

  onFiltro(valor: string): void {
    this.filtro.set(valor);
    this.paginaActual.set(1);
  }

  onTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.paginaActual.set(1);
  }
}

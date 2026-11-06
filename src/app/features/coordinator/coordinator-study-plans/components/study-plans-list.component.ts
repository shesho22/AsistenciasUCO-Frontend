import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-study-plans-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CardComponent, BadgeComponent, ButtonComponent, PaginationComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="font-serif font-bold text-xl text-warm-900">Planes Curriculares Registrados</h2>
          <p class="text-xs text-warm-500">Listado institucional de programas y mallas curriculares vigentes.</p>
        </div>
        <app-button variant="primary" size="md" (clicked)="createPlan.emit()">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          + Nuevo Plan de Estudio
        </app-button>
      </div>

      @if (pagedPlanes().length === 0) {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
          <p class="text-sm text-warm-500">No hay planes de estudio registrados.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          @for (plan of pagedPlanes(); track plan.id) {
            <app-card [hoverable]="true" padding="lg">
              <div class="flex flex-col h-full justify-between gap-5">
                <div class="space-y-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
                        {{ plan.codigo }}
                      </span>
                      <app-badge [variant]="getPlanBadgeVariant(plan.estado)">
                        {{ plan.estado }}
                      </app-badge>
                    </div>

                    <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-800 border border-primary-200">
                      Año {{ plan.anioVigencia }}
                    </span>
                  </div>

                  <div>
                    <h3 class="font-serif font-bold text-xl text-warm-900 leading-snug">
                      {{ plan.nombre }}
                    </h3>
                    <p class="text-xs font-semibold text-primary-700 mt-0.5">
                      {{ plan.programa }} • {{ plan.facultad }}
                    </p>
                  </div>

                  <p class="text-xs text-warm-600 leading-relaxed line-clamp-2">
                    {{ plan.descripcion }}
                  </p>

                  <!-- Métricas Curriculares Bento -->
                  <div class="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-warm-50 border border-warm-100 text-center">
                    <div>
                      <span class="text-[11px] text-warm-400 block font-medium">Créditos</span>
                      <strong class="font-serif text-lg font-bold text-warm-900">{{ plan.totalCreditos ?? '—' }}</strong>
                    </div>
                    <div class="border-x border-warm-200">
                      <span class="text-[11px] text-warm-400 block font-medium">Duración</span>
                      <strong class="font-serif text-lg font-bold text-warm-900">{{ plan.totalSemestres }} Sem.</strong>
                    </div>
                    <div>
                      <span class="text-[11px] text-warm-400 block font-medium">Asignaturas</span>
                      <strong class="font-serif text-lg font-bold text-primary-800">{{ plan.totalAsignaturas ?? '—' }}</strong>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-warm-100">
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      (click)="editPlan.emit(plan)"
                      class="text-xs font-semibold text-warm-600 hover:text-warm-900 px-2.5 py-1.5 rounded-lg hover:bg-warm-100 transition-colors inline-flex items-center gap-1"
                      title="Editar parámetros del plan"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>

                    <button
                      type="button"
                      (click)="toggleEstado.emit(plan)"
                      [class]="plan.estado === 'VIGENTE' ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'"
                      class="text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                      title="Cambiar estado activo/inactivo"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      {{ plan.estado === 'VIGENTE' ? 'Inactivar' : 'Activar' }}
                    </button>
                  </div>

                  <app-button variant="primary" size="sm" (clicked)="viewMalla.emit(plan)">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Malla & Asignaturas
                  </app-button>
                </div>
              </div>
            </app-card>
          }
        </div>

        @if (planes().length > pageSize()) {
          <div class="mt-6 flex justify-center">
            <app-pagination
              [currentPage]="currentPage()"
              [totalItems]="planes().length"
              [pageSize]="pageSize()"
              (pageChange)="currentPage.set($event)"
            />
          </div>
        }
      }
    </div>
  `,
})
export class StudyPlansListComponent {
  planes = input.required<PlanEstudioItem[]>();

  createPlan = output<void>();
  editPlan = output<PlanEstudioItem>();
  toggleEstado = output<PlanEstudioItem>();
  viewMalla = output<PlanEstudioItem>();

  currentPage = signal(1);
  pageSize = signal(6);

  pagedPlanes = computed(() => {
    const list = this.planes();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  getPlanBadgeVariant(estado: PlanEstudioItem['estado']): BadgeVariant {
    switch (estado) {
      case 'VIGENTE':
        return 'success';
      case 'EN_TRANSICION':
        return 'warning';
      case 'HISTORICO':
        return 'neutral';
      case 'INACTIVO':
        return 'danger';
      default:
        return 'neutral';
    }
  }
}

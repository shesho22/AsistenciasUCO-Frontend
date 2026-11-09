import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { ActionMenuComponent, ActionMenuItem } from '../../../../shared/components/action-menu/action-menu.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-study-plans-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CardComponent, BadgeComponent, ButtonComponent, PaginationComponent, ActionMenuComponent],
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

                <div class="flex items-center justify-between gap-2 pt-3 border-t border-warm-100" data-testid="acciones-plan">
                  <app-button variant="primary" size="sm" data-testid="plan-malla" (clicked)="viewMalla.emit(plan)">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Malla & Asignaturas
                  </app-button>
                  <app-action-menu label="Más acciones del plan" [items]="accionesPlan(plan)" (selected)="alElegirAccion(plan, $event)" />
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

  accionesPlan(plan: PlanEstudioItem): ActionMenuItem[] {
    return [
      { id: 'editar', label: 'Editar parámetros', testid: 'plan-editar' },
      { id: 'estado', label: plan.estado === 'VIGENTE' ? 'Inactivar plan' : 'Activar plan', testid: 'plan-estado', danger: plan.estado === 'VIGENTE' },
    ];
  }

  alElegirAccion(plan: PlanEstudioItem, id: string): void {
    if (id === 'editar') this.editPlan.emit(plan);
    else if (id === 'estado') this.toggleEstado.emit(plan);
  }

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

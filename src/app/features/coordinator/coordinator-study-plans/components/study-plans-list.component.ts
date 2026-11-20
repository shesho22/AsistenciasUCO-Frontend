import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';

import { PlanEstudioItem } from '../../../../core/models/role-management.model';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { ActionMenuComponent, ActionMenuItem } from '../../../../shared/components/action-menu/action-menu.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import {
  TAMANO_PAGINA_TABLA,
  TablaDatosComponent,
  paginarEnCliente,
} from '../../../../shared/components/tabla-datos/tabla-datos.component';

@Component({
    selector: 'app-study-plans-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [BadgeComponent, ButtonComponent, TablaDatosComponent, ActionMenuComponent],
    template: `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="font-serif font-bold text-xl text-warm-900">Planes Curriculares Registrados</h2>
          <p class="text-xs text-warm-500">Listado institucional de programas y planes de estudio vigentes.</p>
        </div>
        <app-button variant="primary" size="md" (clicked)="createPlan.emit()">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          + Nuevo Plan de Estudio
        </app-button>
      </div>

      <app-tabla-datos
        etiqueta="Planes curriculares registrados"
        [columnas]="7"
        anchoMinimo="62rem"
        [vacio]="planes().length === 0"
        mensajeVacio="No hay planes de estudio registrados."
        [paginada]="true"
        [totalItems]="planes().length"
        [pagina]="currentPage()"
        [tamanoPagina]="pageSize()"
        (paginaChange)="currentPage.set($event)"
        (tamanoPaginaChange)="cambiarTamano($event)"
      >
        <thead>
          <tr>
            <th scope="col">Plan de estudio</th>
            <th scope="col">Vigencia</th>
            <th scope="col" class="text-right">Créditos</th>
            <th scope="col" class="text-right">Duración</th>
            <th scope="col" class="text-right">Asignaturas</th>
            <th scope="col">Estado</th>
            <th scope="col"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          @for (plan of pagedPlanes(); track plan.id) {
            <tr data-testid="plan-fila">
              <td class="min-w-[16rem]">
                <span class="inline-block rounded-md bg-warm-100 px-2 py-0.5 font-mono text-xs font-bold text-warm-800">{{ plan.codigo }}</span>
                <span class="mt-1 block font-semibold text-warm-900">{{ plan.nombre }}</span>
                <span class="block text-xs font-medium text-primary-700">{{ plan.programa }} • {{ plan.facultad }}</span>
                @if (plan.descripcion) {
                  <span class="block max-w-md text-xs text-warm-500 line-clamp-2">{{ plan.descripcion }}</span>
                }
              </td>
              <td class="whitespace-nowrap">Año {{ plan.anioVigencia }}</td>
              <td class="text-right tabular-nums">{{ plan.totalCreditos ?? '—' }}</td>
              <td class="text-right whitespace-nowrap">{{ plan.totalSemestres }} Sem.</td>
              <td class="text-right tabular-nums">{{ plan.totalAsignaturas ?? '—' }}</td>
              <td>
                <app-badge [variant]="getPlanBadgeVariant(plan.estado)" size="sm">{{ plan.estado }}</app-badge>
              </td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-2 whitespace-nowrap" data-testid="acciones-plan">
                  <app-button variant="primary" size="sm" data-testid="plan-malla" (clicked)="viewMalla.emit(plan)">
                    Plan de Estudio & Asignaturas
                  </app-button>
                  <app-action-menu
                    label="Más acciones del plan"
                    [flotante]="true"
                    [items]="accionesPlan(plan)"
                    (selected)="alElegirAccion(plan, $event)"
                  />
                </div>
              </td>
            </tr>
          }
        </tbody>
      </app-tabla-datos>
    </div>
  `
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
  pageSize = signal(TAMANO_PAGINA_TABLA);

  pagedPlanes = computed(() => paginarEnCliente(this.planes(), this.currentPage(), this.pageSize()));

  cambiarTamano(tamano: number): void {
    this.pageSize.set(tamano);
    this.currentPage.set(1);
  }

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

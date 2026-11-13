import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { PlanEstudioItem, AsignaturaPlanItem } from '../../../../core/models/role-management.model';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
    selector: 'app-study-plan-mesh',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, BadgeComponent, ButtonComponent, PaginationComponent],
    template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
        <button
          type="button"
          (click)="back.emit()"
          class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Planes de Estudio
        </button>

        <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
          {{ plan().codigo }} • Año {{ plan().anioVigencia }}
        </span>
      </div>

      <!-- Banner Resumen y Acciones Curriculares -->
      <div class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <app-badge [variant]="getPlanBadgeVariant(plan().estado)">
              {{ plan().estado }}
            </app-badge>
            <span class="text-xs text-warm-500">•</span>
            <span class="text-xs font-semibold text-primary-700">{{ plan().programa }}</span>
          </div>
          <h2 class="font-serif font-bold text-2xl text-warm-900">{{ plan().nombre }}</h2>
          <p class="text-xs text-warm-600">
            Duración: <strong>{{ plan().totalSemestres }} Semestres</strong> • Créditos: <strong>{{ creditosMalla() }}</strong> • Asignaturas: <strong>{{ asignaturas().length }}</strong>
          </p>
        </div>

        <!-- Botones de Acción Malla -->
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            (click)="addSemester.emit()"
            class="px-3 py-1.5 text-xs font-semibold text-warm-700 bg-warm-50 hover:bg-warm-100 border border-warm-200 rounded-xl transition-colors inline-flex items-center gap-1"
            title="Aumentar duración del plan en un semestre"
          >
            + Semestre
          </button>

          <button
            type="button"
            (click)="removeSemester.emit()"
            class="px-3 py-1.5 text-xs font-semibold text-danger-700 bg-danger-50 hover:bg-danger-100 border border-danger-200 rounded-xl transition-colors inline-flex items-center gap-1"
            title="Eliminar último semestre si no contiene asignaturas"
          >
            - Semestre Vacío
          </button>

          <app-button variant="secondary" size="sm" (clicked)="associateSubject.emit()">
            Asociar asignatura existente
          </app-button>

          <app-button variant="primary" size="sm" (clicked)="createSubject.emit()">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nueva asignatura
          </app-button>
        </div>
      </div>

      <!-- Filtros de Asignaturas -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="sm:col-span-2 relative">
          <input aria-label="Buscar asignatura en la malla"
            type="text"
            [ngModel]="searchAsignatura()"
            (ngModelChange)="searchAsignatura.set($event)"
            placeholder="Buscar asignatura por nombre, código o área curricular..."
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
          />
          <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div>
          <select aria-label="Filtrar la malla por semestre"
            [ngModel]="selectedSemestre()"
            (ngModelChange)="selectedSemestre.set($event)"
            class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
          >
            <option [value]="0">Todos los semestres</option>
            @for (sem of semestresDisponibles(); track sem) {
              <option [value]="sem">Semestre {{ sem }}</option>
            }
          </select>
        </div>

        <div>
          <select aria-label="Filtrar la malla por carácter"
            [ngModel]="selectedCaracter()"
            (ngModelChange)="selectedCaracter.set($event); currentPage.set(1)"
            class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
          >
            <option value="">Todos los caracteres</option>
            @for (c of caracteresDisponibles(); track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Malla Curricular en Tarjetas -->
      @if (filteredAsignaturas().length === 0) {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
          <p class="text-sm text-warm-500">No hay asignaturas registradas para este filtro o semestre.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (asig of pagedAsignaturas(); track asig.id) {
            <div class="p-4 rounded-2xl bg-white border border-warm-200/90 shadow-warm-sm flex flex-col justify-between gap-3 hover:border-primary-400/80 transition-all">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-800">
                    {{ asig.codigo }}
                  </span>
                  <span class="text-xs font-bold text-primary-800 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
                    Semestre {{ asig.semestre }}
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-1">
                  @if (asig.nombreCaracter) {
                    <app-badge [variant]="asig.codigoCaracter === 'OPT' ? 'success' : 'info'">{{ asig.nombreCaracter }}</app-badge>
                  }
                  @if (asig.compartida) {
                    <app-badge variant="neutral">Compartida</app-badge>
                  }
                </div>

                <h4 class="font-serif font-bold text-base text-warm-900 leading-snug">
                  {{ asig.nombre }}
                </h4>

                <div class="text-xs space-y-1 text-warm-600">
                  <p><span class="text-warm-400 font-medium">Área:</span> {{ asig.area }}</p>
                  <p><span class="text-warm-400 font-medium">Componente:</span> {{ asig.componente }}</p>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2.5 border-t border-warm-100 text-xs">
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    (click)="editSubject.emit(asig)"
                    class="p-1 text-warm-500 hover:text-primary-700 rounded hover:bg-warm-100"
                    title="Modificar asignatura"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    (click)="removeSubject.emit(asig)"
                    class="p-1 text-danger-600 hover:text-danger-800 rounded hover:bg-danger-50"
                    title="Desvincular del plan"
                    aria-label="Quitar del plan"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <span class="font-bold text-warm-900 bg-warm-100 px-2 py-0.5 rounded">
                  {{ asig.creditos }} Créditos
                </span>
              </div>
            </div>
          }
        </div>

        @if (filteredAsignaturas().length > pageSize()) {
          <div class="mt-6 flex justify-center">
            <app-pagination
              [currentPage]="currentPage()"
              [totalItems]="filteredAsignaturas().length"
              [pageSize]="pageSize()"
              (pageChange)="currentPage.set($event)"
            />
          </div>
        }
      }
    </div>
  `
})
export class StudyPlanMeshComponent {
  plan = input.required<PlanEstudioItem>();
  asignaturas = input.required<AsignaturaPlanItem[]>();
  /** Certificación F3: créditos reales de la malla cargada (el plan no trae el total). */
  creditosMalla = computed(() =>
    this.asignaturas().reduce((total, a) => total + (Number(a.creditos) || 0), 0)
  );

  back = output<void>();
  addSemester = output<void>();
  removeSemester = output<void>();
  createSubject = output<void>();
  associateSubject = output<void>();
  editSubject = output<AsignaturaPlanItem>();
  removeSubject = output<AsignaturaPlanItem>();

  searchAsignatura = signal('');
  selectedSemestre = signal<number>(0);
  selectedCaracter = signal<string>('');
  currentPage = signal(1);
  pageSize = signal(9);

  semestresDisponibles = computed(() => {
    const total = this.plan().totalSemestres;
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  /** Caracteres presentes en la malla cargada (Obligatoria, Optativa). */
  caracteresDisponibles = computed(() =>
    [...new Set(this.asignaturas().map((a) => a.nombreCaracter).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b, 'es'))
  );

  filteredAsignaturas = computed(() => {
    const q = this.searchAsignatura().toLowerCase().trim();
    const sem = Number(this.selectedSemestre());
    const caracter = this.selectedCaracter();
    return this.asignaturas().filter((a) => {
      const matchQ =
        !q ||
        a.nombre.toLowerCase().includes(q) ||
        a.codigo.toLowerCase().includes(q) ||
        a.area.toLowerCase().includes(q);
      const matchSem = sem === 0 || a.semestre === sem;
      const matchCaracter = !caracter || a.nombreCaracter === caracter;
      return matchQ && matchSem && matchCaracter;
    });
  });

  pagedAsignaturas = computed(() => {
    const list = this.filteredAsignaturas();
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

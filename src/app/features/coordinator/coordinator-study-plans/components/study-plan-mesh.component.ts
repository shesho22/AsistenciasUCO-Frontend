import { Component, ChangeDetectionStrategy, DestroyRef, inject, input, output, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { PlanEstudioItem, AsignaturaPlanItem, CaracterAsignatura } from '../../../../core/models/role-management.model';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { LoadErrorState } from '../../../../core/api/errors/load-error.util';
import { ErrorCargaComponent } from '../../../../shared/components/error-carga/error-carga.component';
import { TAMANO_PAGINA_TABLA, TablaDatosComponent } from '../../../../shared/components/tabla-datos/tabla-datos.component';

/** Filtros de la malla que el servidor aplica (búsqueda, semestre y código de carácter). */
export interface FiltrosMalla {
  busqueda: string;
  semestre: number;
  caracter: string;
}

@Component({
    selector: 'app-study-plan-mesh',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, BadgeComponent, ButtonComponent, ErrorCargaComponent, TablaDatosComponent],
    template: `
    <div class="space-y-4">
      <div class="superficie flex items-center justify-between p-4">
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
      <div class="superficie p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            Duración: <strong>{{ plan().totalSemestres }} Semestres</strong>@if (plan().totalCreditos !== null) { • Créditos: <strong>{{ plan().totalCreditos }}</strong>} • Asignaturas: <strong>{{ totalAsignaturas() }}</strong>
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
          <input aria-label="Buscar asignatura en el plan de estudio"
            type="text"
            [ngModel]="searchAsignatura()"
            (ngModelChange)="onBusqueda($event)"
            placeholder="Buscar asignatura por nombre, código o área curricular..."
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
          />
          <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div>
          <select aria-label="Filtrar el plan de estudio por semestre"
            [ngModel]="selectedSemestre()"
            (ngModelChange)="onSemestre($event)"
            class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
          >
            <option [value]="0">Todos los semestres</option>
            @for (sem of semestresDisponibles(); track sem) {
              <option [value]="sem">Semestre {{ sem }}</option>
            }
          </select>
        </div>

        <div>
          <select aria-label="Filtrar el plan de estudio por carácter"
            [ngModel]="selectedCaracter()"
            (ngModelChange)="onCaracter($event)"
            class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
          >
            <option value="">Todos los caracteres</option>
            @for (c of caracteresDisponibles(); track c.codigo) {
              <option [value]="c.codigo">{{ c.nombre }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Malla Curricular en Tarjetas -->
      @if (error() && !cargando()) {
        <app-error-carga [error]="error()!" (reintentar)="reintentar.emit()" />
      } @else {
        <app-tabla-datos
          etiqueta="Asignaturas del plan de estudio"
          [columnas]="8"
          anchoMinimo="64rem"
          [cargando]="cargando()"
          [filasEsqueleto]="6"
          [vacio]="asignaturas().length === 0"
          mensajeVacio="No hay asignaturas registradas para este filtro o semestre."
          [paginada]="true"
          [totalItems]="totalAsignaturas()"
          [pagina]="pagina()"
          [tamanoPagina]="pageSize()"
          (paginaChange)="pageChange.emit($event)"
          (tamanoPaginaChange)="pageSizeChange.emit($event)"
        >
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Asignatura</th>
              <th scope="col">Semestre</th>
              <th scope="col">Carácter</th>
              <th scope="col">Área</th>
              <th scope="col">Componente</th>
              <th scope="col" class="text-right">Créditos</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          @if (!cargando()) {
          <tbody>
          @for (asig of asignaturas(); track asig.id) {
            <tr data-testid="malla-asignatura-fila">
              <td class="whitespace-nowrap">
                <span class="rounded bg-warm-100 px-2 py-0.5 font-mono text-xs font-bold text-warm-800">{{ asig.codigo }}</span>
              </td>
              <td class="min-w-[14rem]">
                <span class="font-semibold text-warm-900">{{ asig.nombre }}</span>
                @if (asig.compartida || asig.estaActivaAsignatura === false) {
                  <span class="mt-1 flex flex-wrap gap-1">
                    @if (asig.compartida) {
                      <app-badge variant="neutral" size="sm">Compartida</app-badge>
                    }
                    @if (asig.estaActivaAsignatura === false) {
                      <app-badge variant="danger" size="sm">Inactiva</app-badge>
                    }
                  </span>
                }
              </td>
              <td class="whitespace-nowrap">Semestre {{ asig.semestre }}</td>
              <td>
                @if (asig.nombreCaracter) {
                  <app-badge [variant]="asig.codigoCaracter === 'OPT' ? 'success' : 'info'" size="sm">{{ asig.nombreCaracter }}</app-badge>
                } @else {
                  <span class="text-warm-400">—</span>
                }
              </td>
              <td class="text-xs text-warm-700">{{ asig.area }}</td>
              <td class="text-xs text-warm-700">{{ asig.componente }}</td>
              <td class="text-right tabular-nums font-semibold text-warm-900">{{ asig.creditos }}</td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    (click)="editSubject.emit(asig)"
                    class="p-1 text-warm-500 hover:text-primary-700 rounded hover:bg-warm-100"
                    title="Modificar asignatura"
                    [attr.aria-label]="'Modificar la asignatura ' + asig.nombre"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    data-accion="estado-asignatura"
                    (click)="toggleEstadoSubject.emit(asig)"
                    [disabled]="estadoBloqueado()"
                    [attr.aria-busy]="idEstadoEnCurso() === asig.id ? 'true' : null"
                    [class]="
                      'p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed ' +
                      (asig.estaActivaAsignatura === false
                        ? 'text-primary-700 hover:text-primary-800 hover:bg-primary-50'
                        : 'text-warning-700 hover:text-warning-800 hover:bg-warning-50')
                    "
                    [title]="asig.estaActivaAsignatura === false ? 'Activar asignatura' : 'Inactivar asignatura'"
                    [attr.aria-label]="(asig.estaActivaAsignatura === false ? 'Activar' : 'Inactivar') + ' la asignatura ' + asig.nombre"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v9m6.36-5.36a9 9 0 11-12.72 0" />
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
              </td>
            </tr>
          }
          </tbody>
          }
        </app-tabla-datos>
      }
    </div>
  `
})
export class StudyPlanMeshComponent {
  private readonly destroyRef = inject(DestroyRef);

  plan = input.required<PlanEstudioItem>();
  /** Página actual de la malla, ya filtrada y paginada por el servidor. */
  asignaturas = input.required<AsignaturaPlanItem[]>();
  /** Total real de asignaturas del filtro (`totalElementos` del servidor). */
  totalAsignaturas = input(0);
  pagina = input(1);
  pageSize = input(TAMANO_PAGINA_TABLA);
  cargando = input(false);
  error = input<LoadErrorState | null>(null);
  /** HU074 (doble envío): deshabilita la acción de estado mientras un cambio o la recarga de la malla siguen en curso. */
  estadoBloqueado = input(false);
  /** HU074: asignatura cuyo cambio de estado está en curso (su acción lleva aria-busy). */
  idEstadoEnCurso = input<string | null>(null);

  back = output<void>();
  addSemester = output<void>();
  removeSemester = output<void>();
  createSubject = output<void>();
  associateSubject = output<void>();
  editSubject = output<AsignaturaPlanItem>();
  removeSubject = output<AsignaturaPlanItem>();
  /** HU074: activar o inactivar la asignatura (el contenedor confirma y llama al backend). */
  toggleEstadoSubject = output<AsignaturaPlanItem>();
  /** Cambió la búsqueda, el semestre o el carácter: el contenedor vuelve a consultar desde la página 1. */
  filtrosChange = output<FiltrosMalla>();
  pageChange = output<number>();
  /** Cambió el tamaño de página (15/30/50): el contenedor vuelve a consultar desde la página 1. */
  pageSizeChange = output<number>();
  reintentar = output<void>();

  searchAsignatura = signal('');
  selectedSemestre = signal<number>(0);
  selectedCaracter = signal<string>('');

  private readonly busqueda$ = new Subject<void>();

  /** Catálogo de caracteres (`GET /coordinador/caracteres-asignatura`): no se arma con las filas cargadas. */
  caracteres = input<CaracterAsignatura[]>([]);
  caracteresDisponibles = computed(() =>
    [...this.caracteres()].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
  );

  semestresDisponibles = computed(() => {
    const total = this.plan().totalSemestres;
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  constructor() {
    this.busqueda$.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.emitirFiltros());
  }

  onBusqueda(valor: string): void {
    this.searchAsignatura.set(valor);
    this.busqueda$.next();
  }

  onSemestre(valor: number | string): void {
    this.selectedSemestre.set(Number(valor));
    this.emitirFiltros();
  }

  onCaracter(codigo: string): void {
    this.selectedCaracter.set(codigo);
    this.emitirFiltros();
  }

  private emitirFiltros(): void {
    this.filtrosChange.emit({
      busqueda: this.searchAsignatura().trim(),
      semestre: Number(this.selectedSemestre()) || 0,
      caracter: this.selectedCaracter(),
    });
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

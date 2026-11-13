import { Component, DestroyRef, OnInit, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DeanFacultadService, planesDeLaEstructura } from '../../../core/services/dean-facultad.service';
import { PlanEstudioItem, AsignaturaPlanItem } from '../../../core/models/role-management.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

@Component({
    selector: 'app-dean-plan-malla',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [FormsModule, BadgeComponent, PaginationComponent],
    template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Barra de Retorno -->
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
        <button
          type="button"
          (click)="volverAProgramas()"
          class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Programas y Planes
        </button>

        @if (selectedPlan(); as plan) {
          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
            {{ plan.codigo }} • Vigencia {{ plan.anioVigencia }}
          </span>
        }
      </div>

      @if (selectedPlan(); as plan) {
        <!-- Ficha del Plan de Estudios -->
        <div class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <app-badge [variant]="plan.estado === 'VIGENTE' ? 'success' : 'neutral'" size="sm">
                  {{ plan.estado }}
                </app-badge>
                <span class="text-xs text-warm-400">•</span>
                <span class="text-xs font-semibold text-primary-700">{{ plan.programa }}</span>
              </div>
              <h1 class="font-serif font-bold text-2xl text-warm-900">{{ plan.nombre }}</h1>
              <p class="text-xs text-warm-600 mt-1">
                {{ plan.totalSemestres }} semestres • {{ totalAsignaturas() }} asignaturas en la malla
              </p>
            </div>
          </div>

          @if (plan.descripcion) {
            <p class="text-xs text-warm-600 leading-relaxed bg-warm-50 p-3.5 rounded-xl border border-warm-100">
              {{ plan.descripcion }}
            </p>
          }
        </div>
      }

      @if (mensajeError()) {
        <div class="bg-danger-50 border border-danger-200 text-danger-800 text-sm rounded-2xl p-4">{{ mensajeError() }}</div>
      }

      <!-- Filtros de Malla -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="sm:col-span-2 relative">
          <input aria-label="Buscar asignatura del plan por código o nombre"
            type="text"
            [ngModel]="filtroTexto()"
            (ngModelChange)="onFiltroChange($event)"
            placeholder="Filtrar asignatura por código, nombre o área..."
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div>
          <select aria-label="Filtrar el plan por semestre"
            [ngModel]="semestreSeleccionado()"
            (ngModelChange)="onSemestreChange($event)"
            class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option [value]="0">Todos los semestres</option>
            @for (sem of semestresDisponibles(); track sem) {
              <option [value]="sem">Semestre {{ sem }}</option>
            }
          </select>
        </div>

        <div>
          <select aria-label="Filtrar el plan por carácter"
            [ngModel]="caracterSeleccionado()"
            (ngModelChange)="onCaracterChange($event)"
            class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Todos los caracteres</option>
            @for (c of caracteres(); track c.codigo) {
              <option [value]="c.codigo">{{ c.nombre }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Listado de Asignaturas del Plan -->
      @if (cargando()) {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm" role="status">
          <p class="text-sm text-warm-500">Cargando la malla del plan…</p>
        </div>
      } @else if (asignaturas().length === 0) {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
          <p class="text-sm text-warm-500">No hay asignaturas registradas para este filtro.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (asig of asignaturas(); track asig.id) {
            <div class="p-4 bg-white rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between gap-3">
              <div class="space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono font-bold text-xs px-2 py-0.5 rounded bg-warm-100 text-primary-800">
                    {{ asig.codigo }}
                  </span>
                  <span class="text-xs font-bold text-primary-800 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
                    Semestre {{ asig.semestre }}
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-1">
                  @if (asig.nombreCaracter) {
                    <app-badge [variant]="asig.codigoCaracter === 'OPT' ? 'success' : 'info'" size="sm">{{ asig.nombreCaracter }}</app-badge>
                  }
                  @if (asig.compartida) {
                    <app-badge variant="neutral" size="sm">Compartida</app-badge>
                  }
                </div>
                <h3 class="font-serif font-bold text-base text-warm-900">{{ asig.nombre }}</h3>
                <p class="text-xs text-warm-500">Área: {{ asig.area }} • {{ asig.componente }}</p>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-warm-100 text-xs">
                <span class="text-warm-500">{{ asig.horasSemanales }} h/sem</span>
                <span class="px-2 py-0.5 rounded-md bg-warm-100 text-warm-800 font-bold">
                  {{ asig.creditos }} créditos
                </span>
              </div>
            </div>
          }
        </div>

        @if (totalAsignaturas() > pageSize()) {
          <app-pagination
            [totalItems]="totalAsignaturas()"
            [pageSize]="pageSize()"
            [currentPage]="currentPage()"
            [showPageSizeSelector]="false"
            (pageChange)="onPageChange($event)"
          />
        }
      }
    </div>
  `
})
export class DeanPlanMallaComponent implements OnInit {
  private deanService = inject(DeanFacultadService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  planId = input<string>();

  planes = signal<PlanEstudioItem[]>([]);
  asignaturas = signal<AsignaturaPlanItem[]>([]);
  totalAsignaturas = signal(0);
  cargando = signal(false);
  private errorEstructura = signal('');
  private errorMalla = signal('');
  /** El primer error visible: el de la malla (p. ej. 404) o el de la estructura de la facultad. */
  mensajeError = computed(() => this.errorMalla() || this.errorEstructura());

  filtroTexto = signal('');
  semestreSeleccionado = signal<number>(0);
  caracterSeleccionado = signal('');
  currentPage = signal(1);
  pageSize = signal(9);

  /** Caracteres vistos en la malla (el decano no tiene el catálogo del coordinador): código y nombre del backend. */
  private caracteresVistos = signal<Record<string, string>>({});
  caracteres = computed(() =>
    Object.entries(this.caracteresVistos())
      .map(([codigo, nombre]) => ({ codigo, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  );

  private readonly busqueda$ = new Subject<void>();

  effectivePlanId = computed(() => {
    return this.planId() || this.route.snapshot.paramMap.get('planId') || '';
  });

  selectedPlan = computed<PlanEstudioItem | null>(() => {
    const id = this.effectivePlanId();
    if (!id) return null;
    return this.planes().find((p) => p.id === id) || null;
  });

  /** Se cubre hasta el mayor de `totalSemestres` y el semestre más alto de la página cargada, sin inventar valores. */
  semestresDisponibles = computed(() => {
    const maximoAsignaturas = this.asignaturas().reduce((max, a) => Math.max(max, Number(a.semestre) || 0), 0);
    const total = Math.max(this.selectedPlan()?.totalSemestres || 0, maximoAsignaturas);
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  /**
   * HU108: el decano no puede usar las rutas del coordinador. La ficha del plan sale de la estructura de su facultad
   * y la malla de /decano/planes-estudio/{id}/asignaturas (paginada y filtrada en el servidor, limitada a su facultad).
   */
  ngOnInit(): void {
    this.busqueda$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarMalla());
    this.deanService.getEstructura().subscribe({
      next: (res) => this.planes.set(planesDeLaEstructura(res.datos || [])),
      error: (error: unknown) => this.errorEstructura.set(getApiErrorMessage(error)),
    });
    this.cargarMalla();
  }

  cargarMalla(): void {
    const id = this.effectivePlanId();
    if (!id) return;
    this.cargando.set(true);
    this.deanService
      .getAsignaturasPlan(id, {
        semestre: Number(this.semestreSeleccionado()) || null,
        caracter: this.caracterSeleccionado() || null,
        busqueda: this.filtroTexto(),
        pagina: this.currentPage(),
        tamano: this.pageSize(),
      })
      .subscribe({
        next: (page) => {
          this.asignaturas.set(page.elementos);
          this.totalAsignaturas.set(page.totalElementos ?? page.elementos.length);
          this.recordarCaracteres(page.elementos);
          this.errorMalla.set('');
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.asignaturas.set([]);
          this.totalAsignaturas.set(0);
          this.cargando.set(false);
          // Un plan ajeno o inexistente responde 404 (PLA_002).
          this.errorMalla.set(
            error instanceof HttpErrorResponse && error.status === 404 ? 'Plan no encontrado' : getApiErrorMessage(error)
          );
        },
      });
  }

  onFiltroChange(valor: string): void {
    this.filtroTexto.set(valor);
    this.currentPage.set(1);
    this.busqueda$.next();
  }

  onSemestreChange(sem: number): void {
    this.semestreSeleccionado.set(Number(sem));
    this.currentPage.set(1);
    this.cargarMalla();
  }

  onCaracterChange(codigo: string): void {
    this.caracterSeleccionado.set(codigo);
    this.currentPage.set(1);
    this.cargarMalla();
  }

  onPageChange(pagina: number): void {
    this.currentPage.set(pagina);
    this.cargarMalla();
  }

  volverAProgramas(): void {
    void this.router.navigate(['/app/decano/mi-facultad/programas']);
  }

  private recordarCaracteres(items: AsignaturaPlanItem[]): void {
    const nuevos: Record<string, string> = {};
    for (const a of items) {
      if (a.codigoCaracter && a.nombreCaracter) nuevos[a.codigoCaracter] = a.nombreCaracter;
    }
    if (Object.keys(nuevos).length > 0) {
      this.caracteresVistos.update((previos) => ({ ...previos, ...nuevos }));
    }
  }
}

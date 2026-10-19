import { Component, OnInit, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { PlanEstudioItem, AsignaturaPlanItem } from '../../../core/models/role-management.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-dean-plan-malla',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent],
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
                {{ plan.totalCreditos }} créditos en {{ plan.totalSemestres }} semestres • {{ asignaturas().length }} asignaturas registradas
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

      <!-- Filtros de Malla -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2 relative">
          <input
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
          <select
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
      </div>

      <!-- Listado de Asignaturas del Plan -->
      @if (pagedAsignaturas().length === 0) {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
          <p class="text-sm text-warm-500">No hay asignaturas registradas para este filtro.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (asig of pagedAsignaturas(); track asig.id) {
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

        @if (asignaturasFiltradas().length > pageSize()) {
          <app-pagination
            [totalItems]="asignaturasFiltradas().length"
            [pageSize]="pageSize()"
            [currentPage]="currentPage()"
            (pageChange)="currentPage.set($event)"
          />
        }
      }
    </div>
  `,
})
export class DeanPlanMallaComponent implements OnInit {
  private coordService = inject(CoordinatorManagementService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  planId = input<string>();

  planes = signal<PlanEstudioItem[]>(this.coordService.planes());
  asignaturas = signal<AsignaturaPlanItem[]>([]);

  filtroTexto = signal('');
  semestreSeleccionado = signal<number>(0);
  currentPage = signal(1);
  pageSize = signal(9);

  effectivePlanId = computed(() => {
    return this.planId() || this.route.snapshot.paramMap.get('planId') || '';
  });

  selectedPlan = computed<PlanEstudioItem | null>(() => {
    const id = this.effectivePlanId();
    if (!id) return null;
    return this.planes().find((p) => p.id === id) || null;
  });

  semestresDisponibles = computed(() => {
    const total = this.selectedPlan()?.totalSemestres || 10;
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  asignaturasFiltradas = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    const sem = Number(this.semestreSeleccionado());
    return this.asignaturas().filter((a) => {
      const matchQ =
        !q ||
        a.codigo.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q) ||
        a.area.toLowerCase().includes(q);
      const matchSem = sem === 0 || a.semestre === sem;
      return matchQ && matchSem;
    });
  });

  pagedAsignaturas = computed(() => {
    const list = this.asignaturasFiltradas();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    const id = this.effectivePlanId();
    this.coordService.getPlanesEstudio().subscribe({
      next: (res) => this.planes.set(res.datos || []),
    });
    if (id) {
      this.coordService.getAsignaturasPorPlan(id).subscribe({
        next: (res) => this.asignaturas.set(res.datos || []),
      });
    }
  }

  onFiltroChange(valor: string): void {
    this.filtroTexto.set(valor);
    this.currentPage.set(1);
  }

  onSemestreChange(sem: number): void {
    this.semestreSeleccionado.set(Number(sem));
    this.currentPage.set(1);
  }

  volverAProgramas(): void {
    void this.router.navigate(['/app/decano/programas']);
  }
}

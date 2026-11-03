import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DeanFacultadService, planesDeLaEstructura } from '../../../core/services/dean-facultad.service';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { PlanEstudioItem } from '../../../core/models/role-management.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { DeanProgramasGestionComponent } from './components/dean-programas-gestion.component';
import { DeanProgramasCreditosComponent } from './components/dean-programas-creditos.component';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { ProgramaCreditosItem } from '../../../core/models/consultas-transversales.model';
import { EMPTY, expand, reduce } from 'rxjs';

/** HU112: tamaño máximo de página del backend; si la facultad tiene más filas se piden las páginas siguientes. */
const TAMANO_CREDITOS = 100;

@Component({
  selector: 'app-dean-programas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent, DeanProgramasGestionComponent, DeanProgramasCreditosComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header Bento -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-100 text-accent-900 border border-accent-200">
              Decanatura Institucional
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Estructura Curricular</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Programas Académicos y Planes de Estudio
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Consulta los programas académicos adscritos a la facultad, sus créditos, semestres y mallas curriculares.
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="volverAFacultad()"
            class="px-3.5 py-2 rounded-xl bg-warm-50 hover:bg-warm-100 text-xs font-semibold text-warm-700 border border-warm-200 transition-colors"
          >
            ← Resumen de Facultad
          </button>
          <span class="px-3.5 py-2 rounded-xl bg-primary-50 text-xs font-bold text-primary-800 border border-primary-200">
            {{ planes().length }} Planes
          </span>
        </div>
      </div>

      <!-- Gestión de programas (HU076, HU077, HU078, HU108) -->
      <app-dean-programas-gestion />

      <!-- Tabla unificada de programas y créditos (HU112) -->
      <app-dean-programas-creditos [filas]="creditos()" [error]="errorCreditos()" />

      <!-- KPIs Bento -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center justify-between">
          <div>
            <span class="text-xs text-warm-500 font-medium">Planes Registrados</span>
            <p class="text-2xl font-serif font-bold text-warm-900">{{ planes().length }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center justify-between">
          <div>
            <span class="text-xs text-warm-500 font-medium">Planes Vigentes</span>
            <p class="text-2xl font-serif font-bold text-emerald-700">{{ planesVigentes() }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center justify-between">
          <div>
            <span class="text-xs text-warm-500 font-medium">Total Asignaturas</span>
            <p class="text-2xl font-serif font-bold text-primary-800">{{ totalAsignaturasTexto() }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-accent-100 text-accent-800 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Buscador -->
      <div class="relative">
        <input
          type="text"
          [ngModel]="filtroTexto()"
          (ngModelChange)="onFiltroChange($event)"
          placeholder="Buscar programa o plan de estudios por código o nombre..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Grid de Programas y Planes -->
      @if (errorEstructura()) {
        <div class="bg-white rounded-2xl border border-red-200 p-12 text-center shadow-warm-sm" role="alert">
          <p class="text-sm font-semibold text-red-700">No fue posible cargar los planes de estudio de la facultad.</p>
          <p class="text-xs text-red-700 mt-1">{{ errorEstructura() }}</p>
        </div>
      } @else if (pagedPlanes().length === 0) {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
          <p class="text-sm text-warm-500">No se encontraron planes de estudio registrados.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (plan of pagedPlanes(); track plan.id) {
            <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm hover:border-primary-300 transition-all flex flex-col justify-between h-full space-y-3">
              <div>
                <div class="flex items-center justify-between gap-2 mb-1.5">
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-800">
                    {{ plan.codigo }}
                  </span>
                  <app-badge [variant]="plan.estado === 'VIGENTE' ? 'success' : 'neutral'" size="sm">
                    {{ plan.estado }}
                  </app-badge>
                </div>
                <h2 class="font-serif font-bold text-base text-warm-900">{{ plan.nombre }}</h2>
                <p class="text-xs text-warm-500 mt-0.5">{{ plan.programa }} • Vigencia {{ plan.anioVigencia }}</p>
              </div>

              <div class="grid grid-cols-3 gap-2 py-2.5 border-y border-warm-100 text-xs text-warm-700 bg-warm-50/60 rounded-xl px-3 text-center">
                <div>
                  <span class="text-[10px] text-warm-400 font-bold uppercase block">Créditos</span>
                  <span class="font-bold text-warm-900">{{ totalesDe(plan.id)?.totalCreditos ?? '—' }}</span>
                </div>
                <div>
                  <span class="text-[10px] text-warm-400 font-bold uppercase block">Semestres</span>
                  <span class="font-bold text-warm-900">{{ plan.totalSemestres }}</span>
                </div>
                <div>
                  <span class="text-[10px] text-warm-400 font-bold uppercase block">Asignaturas</span>
                  <span class="font-bold text-warm-900">{{ totalesDe(plan.id)?.totalAsignaturas ?? '—' }}</span>
                </div>
              </div>

              <div class="pt-1">
                <button
                  type="button"
                  (click)="verPlanEstudio(plan)"
                  class="w-full py-2 px-3 bg-primary-50 hover:bg-primary-100 text-primary-900 rounded-xl text-xs font-bold border border-primary-200 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <svg class="w-3.5 h-3.5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Ver Plan de Estudios & Asignaturas →
                </button>
              </div>
            </div>
          }
        </div>

        @if (planesFiltrados().length > pageSize()) {
          <app-pagination
            [totalItems]="planesFiltrados().length"
            [pageSize]="pageSize()"
            [currentPage]="currentPage()"
            (pageChange)="currentPage.set($event)"
          />
        }
      }
    </div>
  `,
})
export class DeanProgramasComponent implements OnInit {
  private deanService = inject(DeanFacultadService);
  private consultas = inject(ConsultasTransversalesService);
  private router = inject(Router);

  planes = signal<PlanEstudioItem[]>([]);
  errorEstructura = signal<string | null>(null);
  /** HU112: filas de programas y créditos; alimentan la tabla unificada y los créditos de las tarjetas. */
  creditos = signal<ProgramaCreditosItem[]>([]);
  errorCreditos = signal<string | null>(null);
  private creditosPorPlan = computed(
    () => new Map(this.creditos().filter((c) => c.idPlanEstudio).map((c) => [c.idPlanEstudio as string, c]))
  );
  filtroTexto = signal('');
  currentPage = signal(1);
  pageSize = signal(6);

  planesVigentes = computed(() =>
    this.planes().filter((p) => p.estado === 'VIGENTE').length
  );

  totalAsignaturas = computed(() =>
    this.planes().reduce((sum, p) => sum + (this.totalesDe(p.id)?.totalAsignaturas ?? 0), 0)
  );

  /** «—» mientras falten los créditos de algún plan: un total parcial no es el total de la facultad. */
  totalAsignaturasTexto = computed(() => {
    const planes = this.planes();
    return planes.length > 0 && planes.every((p) => this.creditosCargados(p.id)) ? String(this.totalAsignaturas()) : '—';
  });

  creditosCargados(idPlan: string): boolean {
    return this.creditosPorPlan().has(idPlan);
  }

  /** Créditos y asignaturas del plan según la tabla unificada; indefinido mientras no se hayan cargado. */
  totalesDe(idPlan: string): ProgramaCreditosItem | undefined {
    return this.creditosPorPlan().get(idPlan);
  }

  planesFiltrados = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    if (!q) return this.planes();
    return this.planes().filter(
      (p) =>
        p.codigo.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        p.programa.toLowerCase().includes(q)
    );
  });

  pagedPlanes = computed(() => {
    const list = this.planesFiltrados();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  /** HU108: los planes salen de la estructura de la facultad del decano (la ruta del coordinador no admite DECANO). */
  ngOnInit(): void {
    this.deanService.getEstructura().subscribe({
      next: (res) => {
        const planes = planesDeLaEstructura(res.datos || []);
        this.planes.set(planes);
      },
      error: (error: unknown) => {
        this.planes.set([]);
        this.errorEstructura.set(getApiErrorMessage(error));
      },
    });
    this.cargarCreditos();
  }

  /**
   * HU112: la estructura no trae créditos ni asignaturas (DAT-06). Salen de la tabla unificada de programas y
   * créditos (GET /decano/programas-creditos), una consulta para toda la facultad en lugar de una malla por plan;
   * si la facultad supera el tamaño máximo de página se piden las siguientes. Nunca se muestran ceros fijos.
   */
  private cargarCreditos(): void {
    const pedir = (pagina: number) =>
      this.consultas.getProgramasCreditos({ pagina, tamano: TAMANO_CREDITOS });
    let pagina = 1;
    pedir(pagina)
      .pipe(
        expand((res) => (pagina * TAMANO_CREDITOS < Number(res.total ?? 0) ? pedir(++pagina) : EMPTY)),
        reduce((filas: ProgramaCreditosItem[], res) => [...filas, ...(res.datos ?? [])], [])
      )
      .subscribe({
        next: (filas) => this.creditos.set(filas),
        error: (error: unknown) => {
          this.creditos.set([]);
          this.errorCreditos.set(getApiErrorMessage(error));
        },
      });
  }

  onFiltroChange(valor: string): void {
    this.filtroTexto.set(valor);
    this.currentPage.set(1);
  }

  verPlanEstudio(plan: PlanEstudioItem): void {
    void this.router.navigate(['/app/decano/programas', plan.id]);
  }

  volverAFacultad(): void {
    void this.router.navigate(['/app/decano/facultad']);
  }
}

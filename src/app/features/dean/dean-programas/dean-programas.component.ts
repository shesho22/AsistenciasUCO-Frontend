import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, input } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DeanFacultadService, planesDeLaEstructura } from '../../../core/services/dean-facultad.service';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { PlanEstudioItem } from '../../../core/models/role-management.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  paginarEnCliente,
} from '../../../shared/components/tabla-datos/tabla-datos.component';
import { DeanProgramasGestionComponent } from './components/dean-programas-gestion.component';
import { DeanProgramasCreditosComponent } from './components/dean-programas-creditos.component';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { ProgramaCreditosItem } from '../../../core/models/consultas-transversales.model';
import { EMPTY, expand, reduce } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/** HU112: tamaño máximo de página del backend; si la facultad tiene más filas se piden las páginas siguientes. */
const TAMANO_CREDITOS = 100;

@Component({
    selector: 'app-dean-programas',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [PageHeaderComponent, FormsModule, BadgeComponent, TablaDatosComponent, DeanProgramasGestionComponent, DeanProgramasCreditosComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      <!-- Header Bento -->
      <app-page-header
        [enTarjeta]="true"
        [conTitulo]="!embebido()"
        etiqueta="Decanatura Institucional"
        contexto="Estructura Curricular"
        titulo="Programas Académicos y Planes de Estudio"
        descripcion="Consulta los programas académicos adscritos a la facultad, sus créditos, semestres y planes de estudio."
      >
        <div cabecera-acciones class="flex items-center gap-2.5">
          <span class="px-3.5 py-2 rounded-xl bg-primary-50 text-xs font-bold text-primary-800 border border-primary-200">
            {{ cargandoEstructura() ? '…' : planes().length }} Planes
          </span>
        </div>
      </app-page-header>

      <!-- Gestión de programas (HU076, HU077, HU078, HU108) -->
      <app-dean-programas-gestion />

      <!-- Tabla unificada de programas y créditos (HU112) -->
      <app-dean-programas-creditos />

      @if (!embebido()) {
      <!-- KPIs Bento -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div class="superficie px-3 py-2 sm:p-4 flex items-center justify-between">
          <div>
            <span class="text-xs text-warm-500 font-medium">Planes Registrados</span>
            <p class="text-xl font-serif font-bold text-warm-900">{{ cargandoEstructura() ? '—' : planes().length }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>

        <div class="superficie px-3 py-2 sm:p-4 flex items-center justify-between">
          <div>
            <span class="text-xs text-warm-500 font-medium">Planes Vigentes</span>
            <p class="text-xl font-serif font-bold text-success-700">{{ cargandoEstructura() ? '—' : planesVigentes() }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-success-50 text-success-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div class="superficie px-3 py-2 sm:p-4 flex items-center justify-between">
          <div>
            <span class="text-xs text-warm-500 font-medium">Total Asignaturas</span>
            <p class="text-xl font-serif font-bold text-primary-800">{{ totalAsignaturasTexto() }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-accent-100 text-accent-800 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </div>
      }

      @if (!embebido()) {
      <!-- Buscador -->
      <div class="relative">
        <input
          type="search"
          aria-label="Buscar programa o plan de estudios por código o nombre"
          [ngModel]="filtroTexto()"
          (ngModelChange)="onFiltroChange($event)"
          placeholder="Buscar programa o plan de estudios por código o nombre..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Tabla de Planes de Estudio -->
      @if (errorEstructura()) {
        <div class="bg-white rounded-2xl border border-danger-200 p-12 text-center shadow-warm-sm" role="alert">
          <p class="text-sm font-semibold text-danger-700">No fue posible cargar los planes de estudio de la facultad.</p>
          <p class="text-xs text-danger-700 mt-1">{{ errorEstructura() }}</p>
        </div>
      } @else {
        @if (cargandoEstructura()) {
          <p class="sr-only" role="status">Cargando planes de estudio…</p>
        }
        <app-tabla-datos
          etiqueta="Planes de estudio de la facultad"
          [columnas]="9"
          anchoMinimo="64rem"
          [cargando]="cargandoEstructura()"
          [vacio]="planesFiltrados().length === 0"
          mensajeVacio="No se encontraron planes de estudio registrados."
          [paginada]="true"
          [totalItems]="planesFiltrados().length"
          [pagina]="currentPage()"
          [tamanoPagina]="pageSize()"
          (paginaChange)="currentPage.set($event)"
          (tamanoPaginaChange)="cambiarTamanoPagina($event)"
        >
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Plan de estudios</th>
              <th scope="col">Programa</th>
              <th scope="col">Vigencia</th>
              <th scope="col" class="text-right">Créditos</th>
              <th scope="col" class="text-right">Semestres</th>
              <th scope="col" class="text-right">Asignaturas</th>
              <th scope="col">Estado</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (!cargandoEstructura()) {
              @for (plan of pagedPlanes(); track plan.id) {
                <tr data-testid="plan-fila">
                  <td class="font-mono text-xs font-bold text-warm-800 whitespace-nowrap">{{ plan.codigo }}</td>
                  <td class="font-semibold text-warm-900">{{ plan.nombre }}</td>
                  <td>{{ plan.programa }}</td>
                  <td class="whitespace-nowrap">{{ plan.anioVigencia }}</td>
                  <td class="text-right tabular-nums">{{ totalesDe(plan.id)?.totalCreditos ?? '—' }}</td>
                  <td class="text-right tabular-nums">{{ plan.totalSemestres }}</td>
                  <td class="text-right tabular-nums">{{ totalesDe(plan.id)?.totalAsignaturas ?? '—' }}</td>
                  <td>
                    <app-badge [variant]="plan.estado === 'VIGENTE' ? 'success' : 'neutral'" size="sm">
                      {{ plan.estado }}
                    </app-badge>
                  </td>
                  <td class="text-right">
                    <button
                      type="button"
                      (click)="verPlanEstudio(plan)"
                      class="py-1.5 px-3 bg-primary-50 hover:bg-primary-100 text-primary-900 rounded-xl text-xs font-bold border border-primary-200 transition-colors whitespace-nowrap"
                    >
                      Ver Plan de Estudios & Asignaturas →
                    </button>
                  </td>
                </tr>
              }
            }
          </tbody>
        </app-tabla-datos>
      }
      }
    </div>
  `
})
export class DeanProgramasComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private readonly deanService = inject(DeanFacultadService);
  private readonly consultas = inject(ConsultasTransversalesService);
  private readonly router = inject(Router);

  planes = signal<PlanEstudioItem[]>([]);
  errorEstructura = signal<string | null>(null);
  cargandoEstructura = signal(true);
  /** HU112: filas de programas y créditos; alimentan la tabla unificada y los créditos de las tarjetas. */
  creditos = signal<ProgramaCreditosItem[]>([]);
  errorCreditos = signal<string | null>(null);
  private readonly creditosPorPlan = computed(
    () => new Map(this.creditos().filter((c) => c.idPlanEstudio).map((c) => [c.idPlanEstudio as string, c]))
  );
  filtroTexto = signal('');
  currentPage = signal(1);
  pageSize = signal(TAMANO_PAGINA_TABLA);

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

  pagedPlanes = computed(() => paginarEnCliente(this.planesFiltrados(), this.currentPage(), this.pageSize()));

  cambiarTamanoPagina(tamano: number): void {
    this.pageSize.set(tamano);
    this.currentPage.set(1);
  }

  /** HU108: los planes salen de la estructura de la facultad del decano (la ruta del coordinador no admite DECANO). */
  ngOnInit(): void {
    this.deanService.getEstructura().subscribe({
      next: (res) => {
        const planes = planesDeLaEstructura(res.datos || []);
        this.planes.set(planes);
        this.cargandoEstructura.set(false);
      },
      error: (error: unknown) => {
        this.cargandoEstructura.set(false);
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
        expand((res) => (pagina * TAMANO_CREDITOS < Number(res.totalElementos ?? (res as { total?: number }).total ?? 0) ? pedir(++pagina) : EMPTY)),
        reduce((filas: ProgramaCreditosItem[], res) => [...filas, ...(res.elementos ?? (res as { datos?: typeof res.elementos }).datos ?? [])], [])
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

}

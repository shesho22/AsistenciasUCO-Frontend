import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, input } from '@angular/core';

import { Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { AcademicPeriodsTabComponent } from '../coordinator-study-plans/components/academic-periods-tab.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
    selector: 'app-coordinator-periods',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [PageHeaderComponent, AcademicPeriodsTabComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      <!-- Header Bento -->
      <app-page-header
        [enTarjeta]="true"
        [conTitulo]="!embebido()"
        etiqueta="Coordinación de Programa"
        contexto="Calendario Lectivo"
        titulo="Períodos Académicos"
        descripcion="Consulta de los períodos académicos de la institución (los administra el administrador institucional)."
      >
        <div cabecera-acciones class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="irAPlanes()"
            class="px-3.5 py-2 rounded-xl bg-warm-50 hover:bg-warm-100 text-xs font-semibold text-warm-700 border border-warm-200 transition-colors inline-flex items-center gap-1.5"
          >
            ← Planes de Estudio
          </button>
          <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ totalPeriodos() }} Períodos
          </span>
        </div>
      </app-page-header>

      <!-- KPIs Bento -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Total Períodos</span>
            <div class="text-2xl font-bold font-serif text-warm-900 mt-1">{{ totalPeriodos() }}</div>
            <p class="text-[11px] text-warm-500 mt-0.5">Registrados en el calendario</p>
          </div>
          <div class="p-2.5 rounded-xl bg-primary-50 text-primary-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Períodos Activos</span>
            <div class="text-2xl font-bold font-serif text-success-700 mt-1">{{ totalActivos() }}</div>
            <p class="text-[11px] text-warm-500 mt-0.5">Habilitados para programación</p>
          </div>
          <div class="p-2.5 rounded-xl bg-success-50 text-success-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Período Actual</span>
            <div class="text-lg font-bold font-serif text-primary-800 mt-1 truncate">
              {{ periodoActual()?.codigo || 'Por definir' }}
            </div>
            <p class="text-[11px] text-warm-500 mt-0.5">{{ periodoActual()?.nombre || 'Sin vigencia en curso' }}</p>
          </div>
          <div class="p-2.5 rounded-xl bg-accent-100 text-accent-800">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Gestión de Períodos Académicos -->
      <app-academic-periods-tab
        [periodos]="periodos()"
        [soloLectura]="true"
      />
    </div>
  `
})
export class CoordinatorPeriodsComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private readonly coordService = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  periodos = signal<PeriodoAcademicoItem[]>(this.coordService.periodos());

  /** Totales del servidor (`total` de la lista y de la lista filtrada por estado ACTIVO); la pantalla no cuenta filas. */
  totalPeriodos = signal(0);
  totalActivos = signal(0);

  periodoActual = computed(() =>
    this.periodos().find((p) => p.esActual || p.estado === 'ACTIVO') || null
  );

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  cargarPeriodos(): void {
    this.coordService.getPeriodosAcademicos().subscribe({
      next: (res) => {
        this.periodos.set(res.datos || []);
        this.totalPeriodos.set(Number(res.total ?? 0));
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
    this.coordService.getTotalPeriodosPorEstado('ACTIVO').subscribe({
      next: (total) => this.totalActivos.set(total),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  irAPlanes(): void {
    void this.router.navigate(['/app/coordinador/planes-estudio']);
  }
}

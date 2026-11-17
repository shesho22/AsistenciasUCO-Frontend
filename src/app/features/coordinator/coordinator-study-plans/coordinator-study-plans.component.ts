import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { PlanEstudioItem } from '../../../core/models/role-management.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { StudyPlansListComponent } from './components/study-plans-list.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
    selector: 'app-coordinator-study-plans',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [PageHeaderComponent, StudyPlansListComponent],
    template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header Bento -->
      <app-page-header
        [enTarjeta]="true"
        etiqueta="Coordinación de Programa"
        contexto="Gestión Curricular"
        titulo="Planes de Estudio y Mallas Curriculares"
        descripcion="Administra planes de estudio, mallas por semestres y asignaturas de tu coordinación."
      >
        <div cabecera-acciones class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="irAPeriodos()"
            class="px-3.5 py-2 rounded-xl bg-warm-50 hover:bg-warm-100 text-xs font-semibold text-warm-700 border border-warm-200 transition-colors inline-flex items-center gap-1.5"
          >
            <svg class="w-4 h-4 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Períodos Académicos →
          </button>
          <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ totalPlanes() }} Planes
          </span>
        </div>
      </app-page-header>

      <!-- KPIs Bento -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Total Planes</span>
            <div class="text-2xl font-bold font-serif text-warm-900 mt-1">{{ totalPlanes() }}</div>
            <p class="text-[11px] text-warm-500 mt-0.5">Registrados en el programa</p>
          </div>
          <div class="p-2.5 rounded-xl bg-primary-50 text-primary-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Planes Vigentes</span>
            <div class="text-2xl font-bold font-serif text-success-700 mt-1">{{ totalVigentes() }}</div>
            <p class="text-[11px] text-warm-500 mt-0.5">Activos para cohortes actuales</p>
          </div>
          <div class="p-2.5 rounded-xl bg-success-50 text-success-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Asignaturas Vinculadas</span>
            <div class="text-2xl font-bold font-serif text-primary-800 mt-1">{{ totalAsignaturasVinculadas() }}</div>
            <p class="text-[11px] text-warm-500 mt-0.5">Acumulado en planes curriculares</p>
          </div>
          <div class="p-2.5 rounded-xl bg-accent-100 text-accent-800">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Listado de Planes de Estudio -->
      <app-study-plans-list
        [planes]="planes()"
        (createPlan)="abrirCrearPlan()"
        (editPlan)="abrirEditarPlan($event)"
        (toggleEstado)="toggleEstadoPlan($event)"
        (viewMalla)="verMallaCurricular($event)"
      />
    </div>
  `
})
export class CoordinatorStudyPlansComponent implements OnInit {
  private readonly coordService = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  planes = signal<PlanEstudioItem[]>(this.coordService.planes());

  /** Totales del servidor (`total` de la lista de planes, planes activos y vínculos asignatura-plan); la pantalla no cuenta filas. */
  totalPlanes = signal(0);
  totalVigentes = signal(0);
  totalAsignaturasVinculadas = signal(0);

  ngOnInit(): void {
    this.cargarPlanes();
  }

  cargarPlanes(): void {
    this.coordService.getPlanesEstudio().subscribe({
      next: (res) => {
        this.planes.set(res.datos || []);
        this.totalPlanes.set(Number(res.total ?? 0));
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
    this.coordService.getTotalPlanesVigentes().subscribe({
      next: (total) => this.totalVigentes.set(total),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
    this.coordService.getTotalAsignaturasVinculadas().subscribe({
      next: (total) => this.totalAsignaturasVinculadas.set(total),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  abrirCrearPlan(): void {
    void this.router.navigate(['/app/coordinador/planes-estudio/nuevo']);
  }

  abrirEditarPlan(plan: PlanEstudioItem): void {
    void this.router.navigate(['/app/coordinador/planes-estudio', plan.id, 'editar']);
  }

  verMallaCurricular(plan: PlanEstudioItem): void {
    void this.router.navigate(['/app/coordinador/planes-estudio', plan.id, 'malla']);
  }

  irAPeriodos(): void {
    void this.router.navigate(['/app/coordinador/programa/periodos']);
  }

  toggleEstadoPlan(plan: PlanEstudioItem): void {
    this.coordService.toggleEstadoPlanEstudio(plan.id).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || mensajeUi('UI_COORDINATOR_STUDY_PLANS_001'));
          this.cargarPlanes();
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }
}

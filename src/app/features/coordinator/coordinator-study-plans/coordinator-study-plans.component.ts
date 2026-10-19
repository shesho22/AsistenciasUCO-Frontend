import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { PlanEstudioItem } from '../../../core/models/role-management.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { StudyPlansListComponent } from './components/study-plans-list.component';

@Component({
  selector: 'app-coordinator-study-plans',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, StudyPlansListComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header Bento -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">
              Coordinación de Programa
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Gestión Curricular</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Planes de Estudio y Mallas Curriculares
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Administra planes de estudio, mallas por semestres y asignaturas con prerrequisitos de tu coordinación.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
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
            {{ planes().length }} Planes
          </span>
        </div>
      </div>

      <!-- KPIs Bento -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Total Planes</span>
            <div class="text-2xl font-bold font-serif text-warm-900 mt-1">{{ planes().length }}</div>
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
            <div class="text-2xl font-bold font-serif text-emerald-700 mt-1">{{ totalVigentes() }}</div>
            <p class="text-[11px] text-warm-500 mt-0.5">Activos para cohortes actuales</p>
          </div>
          <div class="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
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
  `,
})
export class CoordinatorStudyPlansComponent implements OnInit {
  private coordService = inject(CoordinatorManagementService);
  private toast = inject(ToastService);
  private router = inject(Router);

  planes = signal<PlanEstudioItem[]>(this.coordService.planes());

  totalVigentes = computed(() =>
    this.planes().filter((p) => p.estado === 'VIGENTE').length
  );

  totalAsignaturasVinculadas = computed(() =>
    this.planes().reduce((acc, p) => acc + (p.totalAsignaturas || 0), 0)
  );

  ngOnInit(): void {
    this.cargarPlanes();
  }

  cargarPlanes(): void {
    this.coordService.getPlanesEstudio().subscribe({
      next: (res) => this.planes.set(res.datos || []),
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
    void this.router.navigate(['/app/coordinador/periodos']);
  }

  toggleEstadoPlan(plan: PlanEstudioItem): void {
    this.coordService.toggleEstadoPlanEstudio(plan.id).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || 'Estado del plan de estudio actualizado.');
          this.cargarPlanes();
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }
}

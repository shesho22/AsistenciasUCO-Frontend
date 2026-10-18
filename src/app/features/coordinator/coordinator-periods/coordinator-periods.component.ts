import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { AcademicPeriodsTabComponent } from '../coordinator-study-plans/components/academic-periods-tab.component';

@Component({
  selector: 'app-coordinator-periods',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, AcademicPeriodsTabComponent],
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
            <span class="text-xs font-medium text-warm-500">Calendario Lectivo</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Períodos Académicos
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Configura las vigencias de períodos lectivos, fechas de apertura y cierre académico del programa.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="irAPlanes()"
            class="px-3.5 py-2 rounded-xl bg-warm-50 hover:bg-warm-100 text-xs font-semibold text-warm-700 border border-warm-200 transition-colors inline-flex items-center gap-1.5"
          >
            ← Planes de Estudio
          </button>
          <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ periodos().length }} Períodos
          </span>
        </div>
      </div>

      <!-- KPIs Bento -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Total Períodos</span>
            <div class="text-2xl font-bold font-serif text-warm-900 mt-1">{{ periodos().length }}</div>
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
            <div class="text-2xl font-bold font-serif text-emerald-700 mt-1">{{ totalActivos() }}</div>
            <p class="text-[11px] text-warm-500 mt-0.5">Habilitados para programación</p>
          </div>
          <div class="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
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
        (savePeriodo)="guardarPeriodo($event)"
        (togglePeriodo)="alternarEstadoPeriodo($event)"
      />
    </div>
  `,
})
export class CoordinatorPeriodsComponent implements OnInit {
  private coordService = inject(CoordinatorManagementService);
  private toast = inject(ToastService);
  private router = inject(Router);

  periodos = signal<PeriodoAcademicoItem[]>(this.coordService.periodos());

  totalActivos = computed(() =>
    this.periodos().filter((p) => p.estado === 'ACTIVO').length
  );

  periodoActual = computed(() =>
    this.periodos().find((p) => p.esActual || p.estado === 'ACTIVO') || null
  );

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  cargarPeriodos(): void {
    this.coordService.getPeriodosAcademicos().subscribe({
      next: (res) => this.periodos.set(res.datos || []),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  irAPlanes(): void {
    this.router.navigate(['/app/coordinador/planes-estudio']);
  }

  guardarPeriodo(event: { modo: 'CREAR' | 'EDITAR'; id?: string; datos: Partial<PeriodoAcademicoItem> }): void {
    if (event.modo === 'CREAR') {
      this.coordService.crearPeriodoAcademico(event.datos).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || 'Período académico creado.');
            this.cargarPeriodos();
          }
        },
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    } else if (event.id) {
      this.coordService.actualizarPeriodoAcademico(event.id, event.datos).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || 'Período académico actualizado.');
            this.cargarPeriodos();
          }
        },
        error: (err) => this.toast.error(getApiErrorMessage(err)),
      });
    }
  }

  alternarEstadoPeriodo(periodo: PeriodoAcademicoItem): void {
    this.coordService.toggleEstadoPeriodoAcademico(periodo.id).subscribe({
      next: (res) => {
        if (res.exitoso) {
          const nuevo = res.datos?.estado || (periodo.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
          this.toast.success(res.mensajeUsuario || `Período ${periodo.codigo} actualizado a ${nuevo}.`);
          this.cargarPeriodos();
        }
      },
      error: () => {
        const nuevoEstado = periodo.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
        this.coordService.actualizarPeriodoAcademico(periodo.id, { estado: nuevoEstado }).subscribe({
          next: (res) => {
            if (res.exitoso) {
              this.toast.success(`Período ${periodo.codigo} actualizado a ${nuevoEstado}.`);
              this.cargarPeriodos();
            }
          },
          error: (err) => this.toast.error(getApiErrorMessage(err)),
        });
      },
    });
  }
}

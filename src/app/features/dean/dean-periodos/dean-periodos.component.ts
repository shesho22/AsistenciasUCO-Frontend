import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-dean-periodos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, BadgeComponent],
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
            <span class="text-xs font-medium text-warm-500">Calendario Académico</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Períodos Académicos Institucionales
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Consulta de semestres académicos activos, fechas de corte de asistencia y planeación lectiva.
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
          <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ periodos().length }} Períodos
          </span>
        </div>
      </div>

      <!-- Buscador -->
      <div class="relative">
        <input
          type="text"
          [ngModel]="filtroTexto()"
          (ngModelChange)="filtroTexto.set($event)"
          placeholder="Buscar período por código o nombre..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Grid de Períodos -->
      @if (periodosFiltrados().length === 0) {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
          <p class="text-sm text-warm-500">No se encontraron períodos académicos registrados.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          @for (p of periodosFiltrados(); track p.id) {
            <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm space-y-3 flex flex-col justify-between h-full">
              <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
                    {{ p.codigo }}
                  </span>
                  <app-badge [variant]="p.estado === 'ACTIVO' ? 'success' : (p.estado === 'PLANEACION' ? 'warning' : 'neutral')">
                    {{ p.estado }}
                  </app-badge>
                </div>
                <h2 class="font-bold text-base text-warm-900">{{ p.nombre }}</h2>
                <div class="space-y-1 text-xs text-warm-600 pt-2 border-t border-warm-100 mt-2">
                  <p>Inicio: <strong>{{ p.fechaInicio }}</strong></p>
                  <p>Finalización: <strong>{{ p.fechaFin }}</strong></p>
                </div>
              </div>

              @if (p.esActual) {
                <div class="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span class="text-[11px] font-bold text-emerald-800">● Período Académico en Curso</span>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DeanPeriodosComponent implements OnInit {
  private coordService = inject(CoordinatorManagementService);
  private router = inject(Router);

  periodos = signal<PeriodoAcademicoItem[]>(this.coordService.periodos());
  filtroTexto = signal('');

  periodosFiltrados = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    if (!q) return this.periodos();
    return this.periodos().filter(
      (p) => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.coordService.getPeriodosAcademicos().subscribe({
      next: (res) => this.periodos.set(res.datos || []),
    });
  }

  volverAFacultad(): void {
    void this.router.navigate(['/app/decano/facultad']);
  }
}

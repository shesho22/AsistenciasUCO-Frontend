import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-dean-areas',
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
            <span class="text-xs font-medium text-warm-500">Estructura Académica</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Áreas de Conocimiento
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Supervisión de las áreas temáticas adscritas a la facultad.
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
            {{ areasTotal() }} Áreas
          </span>
        </div>
      </div>

      @if (errorAreas()) {
        <div class="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-xs text-danger-800" role="alert">
          <p class="font-semibold">No fue posible cargar las áreas.</p>
          <p class="mt-1">El total muestra «—». No equivale a cero registros.</p>
        </div>
      }

      <!-- KPIs Bento -->
      <div class="grid grid-cols-1 gap-4">
        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center justify-between">
          <div>
            <span class="text-xs text-warm-500 font-medium">Áreas de Conocimiento</span>
            <p class="text-2xl font-serif font-bold text-warm-900">{{ areasTotal() }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Buscador -->
      <div class="relative">
        <input
          type="text"
          [ngModel]="filtroTexto()"
          (ngModelChange)="filtroTexto.set($event)"
          placeholder="Filtrar áreas por nombre o código..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Áreas de Conocimiento -->
      <div>
        <h2 class="font-serif font-bold text-lg text-warm-900 mb-3">Áreas Temáticas y de Conocimiento</h2>
        @if (errorAreas()) {
          <div class="bg-white rounded-2xl border border-danger-200 p-8 text-center shadow-warm-sm" role="alert">
            <p class="text-sm text-danger-700">No fue posible cargar las áreas de conocimiento.</p>
          </div>
        } @else if (areasFiltradas().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-8 text-center shadow-warm-sm">
            <p class="text-sm text-warm-500">No se encontraron áreas de conocimiento.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            @for (a of areasFiltradas(); track a.id) {
              <div class="bg-white p-4 rounded-xl border border-warm-200 shadow-warm-sm space-y-2 flex flex-col justify-between h-full">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-700 w-fit">
                    {{ a.codigo }}
                  </span>
                  <app-badge [variant]="a.activa ? 'success' : 'neutral'" size="sm">
                    {{ a.activa ? 'ACTIVO' : 'INACTIVO' }}
                  </app-badge>
                </div>
                <h3 class="font-bold text-sm text-warm-900">{{ a.nombre }}</h3>
              </div>
            }
          </div>
        }
      </div>

    </div>
  `,
})
export class DeanAreasComponent implements OnInit {
  private adminService = inject(AdminManagementService);
  private router = inject(Router);

  areas = this.adminService.areas;

  /** Un error HTTP (403/500) no es «0 registros»: se conserva aparte para mostrar «—» y un aviso. */
  errorAreas = signal(false);
  areasTotal = computed(() => (this.errorAreas() ? '—' : String(this.areas().length)));

  filtroTexto = signal('');

  areasFiltradas = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    if (!q) return this.areas();
    return this.areas().filter(
      (a) =>
        a.codigo.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.adminService.cargarAreas().subscribe({ error: () => this.errorAreas.set(true) });
  }

  volverAFacultad(): void {
    void this.router.navigate(['/app/decano/facultad']);
  }
}


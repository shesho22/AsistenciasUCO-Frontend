import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-dean-infraestructura',
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
            <span class="text-xs font-medium text-warm-500">Estructura Académica y Física</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Áreas de Conocimiento y Sedes Universitarias
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Supervisión de las áreas temáticas adscritas a la facultad y las sedes donde opera.
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
            {{ areas().length }} Áreas • {{ sedes().length }} Sedes
          </span>
        </div>
      </div>

      <!-- KPIs Bento -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center justify-between">
          <div>
            <span class="text-xs text-warm-500 font-medium">Áreas de Conocimiento</span>
            <p class="text-2xl font-serif font-bold text-warm-900">{{ areas().length }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center justify-between">
          <div>
            <span class="text-xs text-warm-500 font-medium">Sedes Operativas</span>
            <p class="text-2xl font-serif font-bold text-emerald-700">{{ sedes().length }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center justify-between">
          <div>
            <span class="text-xs text-warm-500 font-medium">Espacios Físicos</span>
            <p class="text-2xl font-serif font-bold text-primary-800">{{ espacios().length }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-accent-100 text-accent-800 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
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
          placeholder="Filtrar áreas o sedes por nombre, código o municipio..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Áreas de Conocimiento -->
      <div>
        <h2 class="font-serif font-bold text-lg text-warm-900 mb-3">Áreas Temáticas y de Conocimiento</h2>
        @if (areasFiltradas().length === 0) {
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
                  <app-badge [variant]="a.estado === 'ACTIVO' ? 'success' : 'neutral'" size="sm">
                    {{ a.estado }}
                  </app-badge>
                </div>
                <h3 class="font-bold text-sm text-warm-900">{{ a.nombre }}</h3>
                <p class="text-xs text-warm-500">
                  Líder: <strong class="text-warm-800">{{ a.coordinadorArea || 'Por asignar' }}</strong>
                </p>
              </div>
            }
          </div>
        }
      </div>

      <!-- Sedes y Campus Operativos -->
      <div>
        <h2 class="font-serif font-bold text-lg text-warm-900 mb-3">Sedes Universitarias donde Opera la Facultad</h2>
        @if (sedesFiltradas().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-8 text-center shadow-warm-sm">
            <p class="text-sm text-warm-500">No se encontraron sedes registradas.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            @for (s of sedesFiltradas(); track s.id) {
              <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm space-y-2 flex flex-col justify-between h-full">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-800">
                    {{ s.codigo }}
                  </span>
                  <app-badge [variant]="s.estado === 'ACTIVO' ? 'success' : 'neutral'" size="sm">
                    {{ s.estado }}
                  </app-badge>
                </div>
                <h3 class="font-bold text-base text-warm-900">{{ s.nombre }}</h3>
                <p class="text-xs text-warm-600">{{ s.direccion }} ({{ s.municipio }})</p>
                <p class="text-xs text-warm-400">Teléfono: {{ s.telefono || 'No registrado' }}</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class DeanInfraestructuraComponent implements OnInit {
  private adminService = inject(AdminManagementService);
  private router = inject(Router);

  areas = this.adminService.areas;
  sedes = this.adminService.sedes;
  espacios = this.adminService.espacios;

  filtroTexto = signal('');

  areasFiltradas = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    if (!q) return this.areas();
    return this.areas().filter(
      (a) =>
        a.codigo.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q) ||
        (a.coordinadorArea && a.coordinadorArea.toLowerCase().includes(q))
    );
  });

  sedesFiltradas = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    if (!q) return this.sedes();
    return this.sedes().filter(
      (s) =>
        s.codigo.toLowerCase().includes(q) ||
        s.nombre.toLowerCase().includes(q) ||
        s.municipio.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.adminService.cargarAreas().subscribe();
    this.adminService.cargarSedes().subscribe();
    this.adminService.cargarEspacios().subscribe();
  }

  volverAFacultad(): void {
    this.router.navigate(['/app/decano/facultad']);
  }
}

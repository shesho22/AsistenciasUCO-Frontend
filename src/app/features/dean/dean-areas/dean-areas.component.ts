import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, input } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  paginarEnCliente,
} from '../../../shared/components/tabla-datos/tabla-datos.component';

@Component({
    selector: 'app-dean-areas',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [PageHeaderComponent, FormsModule, BadgeComponent, TablaDatosComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      <!-- Header Bento -->
      <app-page-header
        [enTarjeta]="true"
        [conTitulo]="!embebido()"
        etiqueta="Decanatura Institucional"
        contexto="Estructura Académica"
        titulo="Áreas de Conocimiento"
        descripcion="Supervisión de las áreas temáticas adscritas a la facultad."
      >
        <div cabecera-acciones class="flex items-center gap-2.5">
          <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ areasTotal() }} Áreas
          </span>
        </div>
      </app-page-header>

      @if (errorAreas()) {
        <div class="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-xs text-danger-800" role="alert">
          <p class="font-semibold">No fue posible cargar las áreas.</p>
          <p class="mt-1">El total muestra «—». No equivale a cero registros.</p>
        </div>
      }

      <!-- KPIs Bento -->
      <div class="grid grid-cols-1 gap-4">
        <div class="superficie p-4 flex items-center justify-between">
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
        <input aria-label="Buscar área de conocimiento"
          type="text"
          [ngModel]="filtroTexto()"
          (ngModelChange)="filtroTexto.set($event); pagina.set(1)"
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
        } @else {
          <app-tabla-datos
            etiqueta="Áreas de conocimiento"
            [columnas]="3"
            anchoMinimo="36rem"
            [vacio]="areasFiltradas().length === 0"
            mensajeVacio="No se encontraron áreas de conocimiento."
            [paginada]="true"
            [totalItems]="areasFiltradas().length"
            [pagina]="pagina()"
            [tamanoPagina]="tamanoPagina()"
            (paginaChange)="pagina.set($event)"
            (tamanoPaginaChange)="cambiarTamano($event)"
          >
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Nombre</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (a of areasPagina(); track a.id) {
                <tr data-testid="area-fila">
                  <td class="font-mono text-xs font-bold text-warm-700 whitespace-nowrap">{{ a.codigo }}</td>
                  <td class="font-semibold text-warm-900">{{ a.nombre }}</td>
                  <td>
                    <app-badge [variant]="a.activa ? 'success' : 'neutral'" size="sm">
                      {{ a.activa ? 'ACTIVO' : 'INACTIVO' }}
                    </app-badge>
                  </td>
                </tr>
              }
            </tbody>
          </app-tabla-datos>
        }
      </div>

    </div>
  `
})
export class DeanAreasComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private readonly adminService = inject(AdminManagementService);

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

  pagina = signal(1);
  tamanoPagina = signal(TAMANO_PAGINA_TABLA);
  areasPagina = computed(() => paginarEnCliente(this.areasFiltradas(), this.pagina(), this.tamanoPagina()));

  cambiarTamano(tamano: number): void {
    this.tamanoPagina.set(tamano);
    this.pagina.set(1);
  }

  ngOnInit(): void {
    this.adminService.cargarAreas().subscribe({ error: () => this.errorAreas.set(true) });
  }

}


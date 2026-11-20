import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  paginarEnCliente,
} from '../../../shared/components/tabla-datos/tabla-datos.component';

@Component({
    selector: 'app-dean-periodos',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [PageHeaderComponent, FormsModule, BadgeComponent, TablaDatosComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      <!-- Header Bento -->
      <app-page-header
        [enTarjeta]="true"
        etiqueta="Decanatura Institucional"
        contexto="Calendario Académico"
        titulo="Períodos Académicos Institucionales"
        descripcion="Consulta de semestres académicos activos, fechas de corte de asistencia y planeación lectiva."
      >
        <div cabecera-acciones class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="volverAFacultad()"
            class="px-3.5 py-2 rounded-xl bg-warm-50 hover:bg-warm-100 text-xs font-semibold text-warm-700 border border-warm-200 transition-colors"
          >
            ← Mi facultad
          </button>
          <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ errorPeriodos() ? '—' : periodos().length }} Períodos
          </span>
        </div>
      </app-page-header>

      <!-- Buscador -->
      <div class="relative">
        <input aria-label="Buscar período académico"
          type="text"
          [ngModel]="filtroTexto()"
          (ngModelChange)="filtroTexto.set($event); pagina.set(1)"
          placeholder="Buscar período por código o nombre..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Tabla de Períodos -->
      @if (errorPeriodos()) {
        <div class="bg-white rounded-2xl border border-danger-200 p-12 text-center shadow-warm-sm" role="alert">
          <p class="text-sm font-semibold text-danger-700">No fue posible cargar los períodos académicos.</p>
          <p class="text-xs text-danger-700 mt-1">{{ errorPeriodos() }}</p>
          <button type="button" (click)="cargar()" class="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg border border-danger-200 hover:bg-danger-50">
            Reintentar
          </button>
        </div>
      } @else {
        <app-tabla-datos
          etiqueta="Períodos académicos"
          [columnas]="5"
          anchoMinimo="44rem"
          [vacio]="periodosFiltrados().length === 0"
          mensajeVacio="No se encontraron períodos académicos registrados."
          [paginada]="true"
          [totalItems]="periodosFiltrados().length"
          [pagina]="pagina()"
          [tamanoPagina]="tamanoPagina()"
          (paginaChange)="pagina.set($event)"
          (tamanoPaginaChange)="cambiarTamano($event)"
        >
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Nombre</th>
              <th scope="col">Inicio</th>
              <th scope="col">Finalización</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (p of periodosPagina(); track p.id) {
              <tr data-testid="periodo-fila">
                <td class="font-mono text-xs font-bold text-warm-800 whitespace-nowrap">{{ p.codigo }}</td>
                <td class="font-semibold text-warm-900">{{ p.nombre }}</td>
                <td class="whitespace-nowrap">{{ p.fechaInicio }}</td>
                <td class="whitespace-nowrap">{{ p.fechaFin }}</td>
                <td>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <app-badge [variant]="p.estado === 'ACTIVO' ? 'success' : (p.estado === 'PLANEACION' ? 'warning' : 'neutral')" size="sm">
                      {{ p.estado }}
                    </app-badge>
                    @if (p.esActual) {
                      <app-badge variant="success" size="sm" data-testid="periodo-en-curso">En curso</app-badge>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </app-tabla-datos>
      }
    </div>
  `
})
export class DeanPeriodosComponent implements OnInit {
  private readonly coordService = inject(CoordinatorManagementService);
  private readonly router = inject(Router);

  periodos = signal<PeriodoAcademicoItem[]>(this.coordService.periodos());
  filtroTexto = signal('');
  /** Mensaje del último error HTTP; `null` si la última carga fue exitosa (aunque vacía). */
  errorPeriodos = signal<string | null>(null);

  /** Más recientes primero (por fecha de inicio). */
  periodosFiltrados = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    const lista = q
      ? this.periodos().filter((p) => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q))
      : this.periodos();
    return [...lista].sort((a, b) => (b.fechaInicio ?? '').localeCompare(a.fechaInicio ?? ''));
  });

  pagina = signal(1);
  tamanoPagina = signal(TAMANO_PAGINA_TABLA);
  periodosPagina = computed(() => paginarEnCliente(this.periodosFiltrados(), this.pagina(), this.tamanoPagina()));

  cambiarTamano(tamano: number): void {
    this.tamanoPagina.set(tamano);
    this.pagina.set(1);
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.errorPeriodos.set(null);
    this.coordService.getPeriodosAcademicos().subscribe({
      next: (res) => this.periodos.set(res.datos || []),
      error: (error: unknown) => {
        this.periodos.set([]);
        this.errorPeriodos.set(getApiErrorMessage(error));
      },
    });
  }

  volverAFacultad(): void {
    void this.router.navigate(['/app/decano/mi-facultad']);
  }
}

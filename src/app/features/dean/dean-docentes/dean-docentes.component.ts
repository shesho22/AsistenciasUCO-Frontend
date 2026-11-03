import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { DeanFacultadService } from '../../../core/services/dean-facultad.service';
import { DocenteFacultadItem } from '../../../core/models/consultas-transversales.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { FiltroEstado, ListadoPaginado, estadoComoFiltro } from '../../../shared/utils/listado-paginado';

interface OpcionPrograma {
  id: string;
  nombre: string;
}

/** HU128: docentes de la facultad con vínculo activo, filtrables por programa asignado, nombre o documento. */
@Component({
  selector: 'app-dean-docentes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">Decanatura</span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Planta Docente</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Docentes de la Facultad</h1>
          <p class="text-sm text-warm-600 mt-1">Profesores con vínculo activo en los programas de tu facultad, filtrables por programa.</p>
        </div>
        <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">{{ listado.total() }} Docentes</span>
      </div>

      <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            aria-label="Buscar docente"
            [ngModel]="busqueda()"
            (ngModelChange)="busqueda.set($event)"
            (keyup.enter)="listado.buscar()"
            placeholder="Buscar por nombre o documento y presiona Enter..."
            class="sm:col-span-2 px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900"
          />
          <select
            aria-label="Programa"
            [ngModel]="idPrograma()"
            (ngModelChange)="onPrograma($event)"
            class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
          >
            <option value="">Todos los programas</option>
            @for (p of programas(); track p.id) {
              <option [value]="p.id">{{ p.nombre }}</option>
            }
          </select>
          <select
            aria-label="Estado"
            [ngModel]="estado()"
            (ngModelChange)="onEstado($event)"
            class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>

        @if (listado.filas().length === 0 && !listado.cargando()) {
          <p class="text-sm text-warm-500 text-center py-6">No hay docentes que coincidan con los filtros.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th class="py-2 pr-3">Docente</th>
                  <th class="py-2 pr-3">Documento</th>
                  <th class="py-2 pr-3">Programas</th>
                  <th class="py-2 pr-3">Grupos</th>
                  <th class="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (d of listado.filas(); track d.idDocente) {
                  <tr class="border-b border-warm-50">
                    <td class="py-2 pr-3">
                      <span class="font-semibold text-warm-900 block">{{ d.nombreCompleto }}</span>
                      <span class="text-xs text-warm-500">{{ d.correo || '—' }}</span>
                    </td>
                    <td class="py-2 pr-3 font-mono text-xs text-warm-600">{{ d.numeroIdentificacion || '—' }}</td>
                    <td class="py-2 pr-3 text-warm-700">{{ d.programas || '—' }}</td>
                    <td class="py-2 pr-3 text-warm-700">{{ d.totalGrupos }}</td>
                    <td class="py-2">
                      <app-badge [variant]="d.activo ? 'success' : 'neutral'">{{ d.activo ? 'Activo' : 'Inactivo' }}</app-badge>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <app-pagination
          [totalItems]="listado.total()"
          [pageSize]="listado.tamano()"
          [currentPage]="listado.pagina()"
          (pageChange)="listado.irAPagina($event)"
          (pageSizeChange)="listado.cambiarTamano($event)"
        ></app-pagination>
      </section>
    </div>
  `,
})
export class DeanDocentesComponent implements OnInit {
  private readonly service = inject(ConsultasTransversalesService);
  private readonly facultad = inject(DeanFacultadService);
  private readonly toast = inject(ToastService);

  busqueda = signal('');
  idPrograma = signal('');
  estado = signal<FiltroEstado>('TODOS');
  programas = signal<OpcionPrograma[]>([]);

  readonly listado = new ListadoPaginado<DocenteFacultadItem>(
    (pagina, tamano) =>
      this.service.getDocentesFacultad({
        busqueda: this.busqueda(),
        idPrograma: this.idPrograma() || null,
        estaActivo: estadoComoFiltro(this.estado()),
        pagina,
        tamano,
      }),
    (mensaje) => this.toast.error(mensaje)
  );

  ngOnInit(): void {
    this.listado.cargar();
    this.cargarProgramas();
  }

  onPrograma(idPrograma: string): void {
    this.idPrograma.set(idPrograma);
    this.listado.buscar();
  }

  onEstado(estado: FiltroEstado): void {
    this.estado.set(estado);
    this.listado.buscar();
  }

  /** El selector de programas sale de la estructura de la facultad; si falla, la pantalla sigue sin ese filtro. */
  private cargarProgramas(): void {
    this.facultad.getEstructura().subscribe({
      next: (res) =>
        this.programas.set((res.datos ?? []).flatMap((f) => f.programas.map((p) => ({ id: p.id, nombre: p.nombre })))),
      error: () => this.programas.set([]),
    });
  }
}

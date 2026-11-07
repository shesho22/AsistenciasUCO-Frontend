import { Component, ElementRef, OnInit, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { EstudianteInstitucionItem, FichaUnificadaEstudiante } from '../../../core/models/consultas-transversales.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { HistorialEstudianteComponent } from '../../../shared/components/historial-estudiante/historial-estudiante.component';
import { FiltroEstado, ListadoPaginado, estadoComoFiltro } from '../../../shared/utils/listado-paginado';

interface OpcionFacultad {
  id: string;
  nombre: string;
}

/**
 * HU157: el administrador busca estudiantes de su institución (nombre o documento, facultad y estado) y abre la ficha
 * unificada con su historial completo: programas, grupos por período y resumen de asistencia. Solo lectura.
 */
@Component({
  selector: 'app-admin-estudiantes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent, HistorialEstudianteComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">Administración</span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Ficha Unificada</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Estudiantes de la Institución</h1>
          <p class="text-sm text-warm-600 mt-1">Busca un estudiante y consulta su historial completo de programas, grupos y asistencia.</p>
        </div>
        <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">{{ listado.cargando() && listado.filas().length === 0 ? '…' : listado.total() }} Estudiantes</span>
      </div>

      <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            type="search"
            aria-label="Buscar estudiante"
            [ngModel]="busqueda()"
            (ngModelChange)="busqueda.set($event)"
            (keyup.enter)="listado.buscar()"
            placeholder="Buscar por nombre o documento..."
            class="sm:col-span-2 px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900"
          />
          <button
            type="button"
            (click)="listado.buscar()"
            class="min-h-[44px] px-4 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold sm:col-span-1"
          >
            Buscar
          </button>
          <select
            aria-label="Facultad"
            [ngModel]="idFacultad()"
            (ngModelChange)="onFacultad($event)"
            class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
          >
            <option value="">Todas las facultades</option>
            @for (f of facultades(); track f.id) {
              <option [value]="f.id">{{ f.nombre }}</option>
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

        @if (listado.cargando() && listado.filas().length === 0) {
          <p role="status" class="text-sm text-warm-500 text-center py-6">Cargando estudiantes…</p>
        } @else if (listado.filas().length === 0) {
          <p class="text-sm text-warm-500 text-center py-6">No hay estudiantes que coincidan con la búsqueda.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="py-2 pr-3">Estudiante</th>
                  <th scope="col" class="py-2 pr-3">Documento</th>
                  <th scope="col" class="py-2 pr-3">Facultades y programas</th>
                  <th scope="col" class="py-2 pr-3">Grupos</th>
                  <th scope="col" class="py-2 pr-3">Estado</th>
                  <th scope="col" class="py-2"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (e of listado.filas(); track e.idEstudiante) {
                  <tr class="border-b border-warm-50" [class.bg-primary-50]="ficha()?.idEstudiante === e.idEstudiante">
                    <td class="py-2 pr-3">
                      <span class="font-semibold text-warm-900 block">{{ e.nombreCompleto }}</span>
                      <span class="text-xs text-warm-500">{{ e.correo || '—' }}</span>
                    </td>
                    <td class="py-2 pr-3 font-mono text-xs text-warm-600">{{ e.numeroIdentificacion || '—' }}</td>
                    <td class="py-2 pr-3">
                      <span class="text-warm-900 block">{{ e.programas || '—' }}</span>
                      <span class="text-xs text-warm-500">{{ e.facultades || '—' }}</span>
                    </td>
                    <td class="py-2 pr-3 text-warm-700">{{ e.totalGrupos }}</td>
                    <td class="py-2 pr-3">
                      <app-badge [variant]="e.activo ? 'success' : 'neutral'">{{ e.activo ? 'Activo' : 'Inactivo' }}</app-badge>
                    </td>
                    <td class="py-2 text-right">
                      <button type="button" class="min-h-[44px] px-2 text-xs font-semibold text-primary-700 hover:underline" (click)="verFicha(e)">Ver ficha</button>
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

      @if (ficha(); as f) {
        <section
          #fichaPanel
          tabindex="-1"
          role="region"
          aria-label="Ficha unificada del estudiante"
          class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4 outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-serif font-bold text-lg text-warm-900">{{ f.nombreCompleto }}</h2>
              <p class="text-xs text-warm-500">Historial completo · {{ f.matriculas.length }} matrículas</p>
            </div>
            <button type="button" class="text-xs font-semibold text-warm-600 hover:underline" (click)="ficha.set(null)">Cerrar</button>
          </div>
          <app-historial-estudiante [ficha]="f" />
        </section>
      }
    </div>
  `,
})
export class AdminEstudiantesComponent implements OnInit {
  private readonly service = inject(ConsultasTransversalesService);
  private readonly admin = inject(AdminManagementService);
  private readonly toast = inject(ToastService);

  busqueda = signal('');
  idFacultad = signal('');
  estado = signal<FiltroEstado>('TODOS');
  facultades = signal<OpcionFacultad[]>([]);
  ficha = signal<FichaUnificadaEstudiante | null>(null);
  private readonly fichaPanel = viewChild<ElementRef<HTMLElement>>('fichaPanel');

  readonly listado = new ListadoPaginado<EstudianteInstitucionItem>(
    (pagina, tamano) =>
      this.service.buscarEstudiantes({
        busqueda: this.busqueda(),
        idFacultad: this.idFacultad() || null,
        estaActivo: estadoComoFiltro(this.estado()),
        pagina,
        tamano,
      }),
    (mensaje) => this.toast.error(mensaje)
  );

  ngOnInit(): void {
    this.listado.cargar();
    this.admin.cargarFacultades().subscribe({
      next: (res) => this.facultades.set((res.datos ?? []).map((f) => ({ id: f.id, nombre: f.nombre }))),
      error: () => this.facultades.set([]),
    });
  }

  onFacultad(idFacultad: string): void {
    this.idFacultad.set(idFacultad);
    this.listado.buscar();
  }

  onEstado(estado: FiltroEstado): void {
    this.estado.set(estado);
    this.listado.buscar();
  }

  verFicha(estudiante: EstudianteInstitucionItem): void {
    this.service.getHistorialEstudiante(estudiante.idEstudiante, true).subscribe({
      next: (res) => {
        this.ficha.set(res.datos ?? null);
        setTimeout(() => this.fichaPanel()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      },
      error: (error: unknown) => {
        this.ficha.set(null);
        this.toast.error(getApiErrorMessage(error));
      },
    });
  }
}

import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { AsignaturaInstitucionItem } from '../../../core/models/consultas-transversales.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { FiltroEstado, ListadoPaginado, estadoComoFiltro } from '../../../shared/utils/listado-paginado';

interface OpcionFacultad {
  id: string;
  nombre: string;
}

/**
 * HU143: búsqueda transversal de asignaturas por código o nombre, con su programa, plan, semestre y créditos. El
 * decano busca en su facultad; el administrador (ruta con `data.comoAdministrador`) en toda su institución, con
 * filtro opcional por facultad.
 */
@Component({
  selector: 'app-dean-asignaturas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">
              {{ comoAdministrador ? 'Administración' : 'Decanatura' }}
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Catálogo de Asignaturas</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Búsqueda de Asignaturas</h1>
          <p class="text-sm text-warm-600 mt-1">
            {{ comoAdministrador ? 'Asignaturas de todas las facultades de la institución.' : 'Asignaturas de los programas y planes de tu facultad.' }}
          </p>
        </div>
        <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">{{ listado.total() }} Asignaturas</span>
      </div>

      <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            aria-label="Buscar asignatura"
            [ngModel]="busqueda()"
            (ngModelChange)="busqueda.set($event)"
            (keyup.enter)="listado.buscar()"
            placeholder="Buscar por código o nombre y presiona Enter..."
            class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900"
            [ngClass]="{ 'sm:col-span-2': !comoAdministrador }"
          />
          @if (comoAdministrador) {
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
          }
          <select
            aria-label="Estado"
            [ngModel]="estado()"
            (ngModelChange)="onEstado($event)"
            class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVO">Activas</option>
            <option value="INACTIVO">Inactivas</option>
          </select>
        </div>

        @if (listado.filas().length === 0 && !listado.cargando()) {
          <p class="text-sm text-warm-500 text-center py-6">No hay asignaturas que coincidan con la búsqueda.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="py-2 pr-3">Asignatura</th>
                  <th scope="col" class="py-2 pr-3">Créditos</th>
                  <th scope="col" class="py-2 pr-3">Programa y plan</th>
                  <th scope="col" class="py-2 pr-3">Área y componente</th>
                  <th scope="col" class="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (a of listado.filas(); track a.idAsignatura) {
                  <tr class="border-b border-warm-50">
                    <td class="py-2 pr-3">
                      <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-800">{{ a.codigo }}</span>
                      <span class="font-semibold text-warm-900 block mt-1">{{ a.nombre }}</span>
                    </td>
                    <td class="py-2 pr-3 text-warm-700">{{ a.creditos ?? '—' }}</td>
                    <td class="py-2 pr-3">
                      <span class="text-warm-900 block">{{ a.nombrePrograma }}</span>
                      <span class="text-xs text-warm-500">{{ a.nombreFacultad }} · Plan {{ a.inpPlanEstudio ?? '—' }} · {{ a.codigoSemestre || '—' }}</span>
                    </td>
                    <td class="py-2 pr-3 text-warm-700">{{ a.nombreArea || '—' }} · {{ a.nombreComponente || '—' }}</td>
                    <td class="py-2">
                      <app-badge [variant]="a.activa ? 'success' : 'neutral'">{{ a.activa ? 'Activa' : 'Inactiva' }}</app-badge>
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
export class DeanAsignaturasComponent implements OnInit {
  private readonly service = inject(ConsultasTransversalesService);
  private readonly admin = inject(AdminManagementService);
  private readonly toast = inject(ToastService);
  readonly comoAdministrador = inject(ActivatedRoute).snapshot.data['comoAdministrador'] === true;

  busqueda = signal('');
  idFacultad = signal('');
  estado = signal<FiltroEstado>('TODOS');
  facultades = signal<OpcionFacultad[]>([]);

  readonly listado = new ListadoPaginado<AsignaturaInstitucionItem>(
    (pagina, tamano) =>
      this.service.buscarAsignaturas(
        {
          busqueda: this.busqueda(),
          idFacultad: this.idFacultad() || null,
          estaActiva: estadoComoFiltro(this.estado()),
          pagina,
          tamano,
        },
        this.comoAdministrador
      ),
    (mensaje) => this.toast.error(mensaje)
  );

  ngOnInit(): void {
    this.listado.cargar();
    if (this.comoAdministrador) {
      this.admin.cargarFacultades().subscribe({
        next: (res) => this.facultades.set((res.datos ?? []).map((f) => ({ id: f.id, nombre: f.nombre }))),
        error: () => this.facultades.set([]),
      });
    }
  }

  onFacultad(idFacultad: string): void {
    this.idFacultad.set(idFacultad);
    this.listado.buscar();
  }

  onEstado(estado: FiltroEstado): void {
    this.estado.set(estado);
    this.listado.buscar();
  }
}

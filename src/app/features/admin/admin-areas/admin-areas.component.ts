import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { AreaConocimientoItem, FacultadItem } from '../../../core/models/role-management.model';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

type VistaArea = 'LISTA' | 'FORM';

@Component({
  selector: 'app-admin-areas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- ================= HEADER & BREADCRUMB ================= -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">
            <span>Administración Institucional</span>
            <span>/</span>
            <span class="text-primary-700">Estructura Académica</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-serif font-bold text-warm-900 tracking-tight">
            Áreas de Conocimiento
          </h1>
          <p class="text-sm text-warm-600 mt-0.5">
            Departamentos y divisiones temáticas asociadas a las facultades de la Universidad Católica de Oriente.
          </p>
        </div>

        @if (vista() === 'LISTA') {
          <button
            type="button"
            (click)="abrirFormularioCrear()"
            class="px-4 py-2.5 bg-primary-700 text-white rounded-xl text-sm font-semibold hover:bg-primary-800 shadow-sm transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nueva Área</span>
          </button>
        }
      </div>

      <!-- ================= BENTO GRID OVERVIEW (SOLO EN LISTA) ================= -->
      @if (vista() === 'LISTA') {
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Total Áreas -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Total Áreas</span>
              <div class="p-2 rounded-xl bg-primary-50 text-primary-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div class="text-2xl font-bold font-serif text-warm-900">{{ areas().length }}</div>
            <p class="text-[11px] text-warm-500 mt-1">Disciplinas y departamentos</p>
          </div>

          <!-- Áreas Activas -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Áreas Activas</span>
              <div class="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="text-2xl font-bold font-serif text-emerald-800">{{ totalActivas() }}</div>
            <p class="text-[11px] text-warm-500 mt-1">Vigentes curricularmente</p>
          </div>

          <!-- Facultades Vinculadas -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs col-span-2 lg:col-span-1">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Facultades con Áreas</span>
              <div class="p-2 rounded-xl bg-blue-50 text-blue-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div class="text-2xl font-bold font-serif text-blue-900">{{ facultadesConAreas() }}</div>
            <p class="text-[11px] text-warm-500 mt-1">Unidades académicas mayores</p>
          </div>
        </div>

        <!-- ================= TOOLBAR: BUSCADOR ================= -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative flex-1">
            <input
              type="text"
              [ngModel]="filtroTexto()"
              (ngModelChange)="filtroTexto.set($event)"
              placeholder="Buscar área por código, nombre o facultad..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 bg-white"
            />
            <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- ================= LISTADO DE ÁREAS ================= -->
        @if (pagedAreas().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
            <div class="w-12 h-12 rounded-full bg-warm-100 text-warm-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-warm-900">No se encontraron áreas de conocimiento</h3>
            <p class="text-xs text-warm-500 mt-1">Prueba con otros términos de búsqueda.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (area of pagedAreas(); track area.id) {
              <div class="bg-white border border-warm-200 rounded-2xl p-5 shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between h-full">
                <div>
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <span class="text-xs font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800 border border-warm-200 font-mono">
                      {{ area.codigo }}
                    </span>
                    <span
                      class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      [class]="area.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ area.estado }}
                    </span>
                  </div>

                  <h3 class="font-serif font-bold text-warm-900 text-base mb-1">{{ area.nombre }}</h3>
                  <p class="text-xs text-warm-600 mb-4 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>{{ area.facultadNombre }}</span>
                  </p>

                  <div class="p-3 bg-warm-50/60 rounded-xl border border-warm-100 text-xs text-warm-600 mb-4 space-y-1">
                    <div class="flex justify-between">
                      <span class="text-warm-400">Asignaturas adscritas:</span>
                      <span class="font-bold text-warm-800">{{ area.totalAsignaturas || 0 }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2 pt-2 border-t border-warm-100">
                  <button
                    type="button"
                    (click)="editarArea(area)"
                    class="flex-1 py-2 px-3 bg-warm-100 hover:bg-warm-200 text-warm-800 rounded-xl text-xs font-semibold transition-colors text-center"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    (click)="toggleEstadoArea(area)"
                    class="p-2 text-warm-500 hover:text-warm-800 hover:bg-warm-100 rounded-xl transition-colors"
                    [title]="area.estado === 'ACTIVO' ? 'Desactivar Área' : 'Activar Área'"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>

          @if (areasFiltradas().length > pageSize()) {
            <div class="mt-6 flex justify-center">
              <app-pagination
                [currentPage]="currentPage()"
                [totalItems]="areasFiltradas().length"
                [pageSize]="pageSize()"
                (pageChange)="currentPage.set($event)"
              />
            </div>
          }
        }
      }

      <!-- ================= 2. FORMULARIO ÁREA ================= -->
      @if (vista() === 'FORM') {
        <div class="bg-white border border-warm-200 rounded-2xl p-6 sm:p-8 shadow-warm-sm max-w-xl mx-auto space-y-6">
          <div class="flex items-center justify-between pb-4 border-b border-warm-100">
            <div>
              <h2 class="text-xl font-serif font-bold text-warm-900">
                {{ areaEnEdicion ? 'Editar Área' : 'Registrar Nueva Área' }}
              </h2>
              <p class="text-xs text-warm-600 mt-0.5">Departamentos de conocimiento y mallas curriculares.</p>
            </div>
            <button
              type="button"
              (click)="vista.set('LISTA')"
              class="px-3.5 py-1.5 rounded-xl border border-warm-200 text-xs font-semibold text-warm-700 hover:bg-warm-100 transition-colors flex items-center gap-1.5"
            >
              ← Volver
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-warm-700 uppercase mb-1">Código del Área *</label>
              <input
                type="text"
                [(ngModel)]="formArea.codigo"
                placeholder="Ej: AREA-ING-SOFT"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-warm-700 uppercase mb-1">Nombre del Área *</label>
              <input
                type="text"
                [(ngModel)]="formArea.nombre"
                placeholder="Ej: Ingeniería de Software y Sistemas"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-warm-700 uppercase mb-1">Facultad Perteneciente *</label>
              <select
                [(ngModel)]="formArea.facultadId"
                (ngModelChange)="onFacultadChange($event)"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 bg-white"
              >
                <option value="">-- Seleccionar Facultad --</option>
                @for (fac of facultades(); track fac.id) {
                  <option [value]="fac.id">{{ fac.nombre }} ({{ fac.codigo }})</option>
                }
              </select>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-warm-100">
              <button
                type="button"
                (click)="vista.set('LISTA')"
                class="px-4 py-2 text-xs font-semibold text-warm-600 hover:text-warm-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                [disabled]="!formArea.codigo.trim() || !formArea.nombre.trim() || !formArea.facultadId"
                (click)="guardar()"
                class="px-5 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Guardar Área
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminAreasComponent implements OnInit {
  private adminService = inject(AdminManagementService);
  private toast = inject(ToastService);

  vista = signal<VistaArea>('LISTA');
  filtroTexto = signal('');
  currentPage = signal(1);
  pageSize = signal(6);

  areas = this.adminService.areas;
  facultades = this.adminService.facultades;

  areaEnEdicion: AreaConocimientoItem | null = null;
  formArea = {
    codigo: '',
    nombre: '',
    facultadId: '',
    facultadNombre: '',
    totalAsignaturas: 0,
    estado: 'ACTIVO' as 'ACTIVO' | 'INACTIVO',
  };

  totalActivas = computed(() => this.areas().filter((a) => a.estado === 'ACTIVO').length);
  facultadesConAreas = computed(() => {
    const facIds = new Set(this.areas().map((a) => a.facultadId));
    return facIds.size;
  });

  areasFiltradas = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    return this.areas().filter(
      (a) =>
        !txt ||
        a.codigo.toLowerCase().includes(txt) ||
        a.nombre.toLowerCase().includes(txt) ||
        (a.facultadNombre && a.facultadNombre.toLowerCase().includes(txt))
    );
  });

  pagedAreas = computed(() => {
    const list = this.areasFiltradas();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.adminService.cargarAreas().subscribe();
    this.adminService.cargarFacultades().subscribe();
  }

  onFacultadChange(facId: string): void {
    const fac = this.facultades().find((f) => f.id === facId);
    if (fac) {
      this.formArea.facultadNombre = fac.nombre;
    }
  }

  abrirFormularioCrear(): void {
    this.areaEnEdicion = null;
    const defaultFac = this.facultades().length > 0 ? this.facultades()[0] : null;
    this.formArea = {
      codigo: '',
      nombre: '',
      facultadId: defaultFac ? defaultFac.id : '',
      facultadNombre: defaultFac ? defaultFac.nombre : '',
      totalAsignaturas: 0,
      estado: 'ACTIVO',
    };
    this.vista.set('FORM');
  }

  editarArea(area: AreaConocimientoItem): void {
    this.areaEnEdicion = area;
    this.formArea = {
      codigo: area.codigo,
      nombre: area.nombre,
      facultadId: area.facultadId,
      facultadNombre: area.facultadNombre || '',
      totalAsignaturas: area.totalAsignaturas || 0,
      estado: area.estado,
    };
    this.vista.set('FORM');
  }

  guardar(): void {
    if (!this.formArea.codigo.trim() || !this.formArea.nombre.trim() || !this.formArea.facultadId) return;

    if (this.areaEnEdicion) {
      this.adminService.actualizarArea(this.areaEnEdicion.id, { ...this.formArea });
      this.toast.success('Área de conocimiento actualizada.');
    } else {
      this.adminService.crearArea({ ...this.formArea });
      this.toast.success('Área de conocimiento registrada exitosamente.');
    }
    this.vista.set('LISTA');
  }

  toggleEstadoArea(area: AreaConocimientoItem): void {
    this.adminService.cambiarEstadoArea(area.id);
    this.toast.info(`Estado del área cambiado a ${area.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'}.`);
  }
}

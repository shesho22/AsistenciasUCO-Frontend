import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { SedeInstitucionalItem } from '../../../core/models/role-management.model';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

type VistaSede = 'LISTA' | 'FORM';

@Component({
  selector: 'app-admin-sedes',
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
            <span class="text-primary-700">Infraestructura</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-serif font-bold text-warm-900 tracking-tight">
            Sedes Institucionales
          </h1>
          <p class="text-sm text-warm-600 mt-0.5">
            Administración de sedes, campus universitarios y centros regionales de la Universidad Católica de Oriente.
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
            <span>Nueva Sede</span>
          </button>
        }
      </div>

      <!-- ================= BENTO GRID OVERVIEW (SOLO EN LISTA) ================= -->
      @if (vista() === 'LISTA') {
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Total Sedes -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Total Sedes</span>
              <div class="p-2 rounded-xl bg-primary-50 text-primary-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div class="text-2xl font-bold font-serif text-warm-900">{{ sedes().length }}</div>
            <p class="text-[11px] text-warm-500 mt-1">Campus y centros institucionales</p>
          </div>

          <!-- Sedes Activas -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Sedes Activas</span>
              <div class="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="text-2xl font-bold font-serif text-emerald-800">{{ totalActivas() }}</div>
            <p class="text-[11px] text-warm-500 mt-1">Habilitadas para actividad académica</p>
          </div>

          <!-- Sede Principal -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs col-span-2 lg:col-span-1">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Sede Principal</span>
              <div class="p-2 rounded-xl bg-blue-50 text-blue-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div class="text-base font-bold text-warm-900 truncate">Rionegro - Campus Central</div>
            <p class="text-[11px] text-warm-500 mt-1">Sector San Antonio de Pereira</p>
          </div>
        </div>

        <!-- ================= TOOLBAR: BUSCADOR ================= -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative flex-1">
            <input
              type="text"
              [ngModel]="filtroTexto()"
              (ngModelChange)="filtroTexto.set($event)"
              placeholder="Buscar sede por código, nombre o municipio..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 bg-white"
            />
            <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- ================= LISTADO DE SEDES ================= -->
        @if (pagedSedes().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
            <div class="w-12 h-12 rounded-full bg-warm-100 text-warm-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-warm-900">No se encontraron sedes</h3>
            <p class="text-xs text-warm-500 mt-1">Prueba con otros términos de búsqueda.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (sede of pagedSedes(); track sede.id) {
              <div class="bg-white border border-warm-200 rounded-2xl p-5 shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between h-full">
                <div>
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <span class="text-xs font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800 border border-warm-200 font-mono">
                      {{ sede.codigo }}
                    </span>
                    <span
                      class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      [class]="sede.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ sede.estado }}
                    </span>
                  </div>

                  <h3 class="font-serif font-bold text-warm-900 text-base mb-1">{{ sede.nombre }}</h3>
                  <p class="text-xs text-warm-600 mb-3 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{{ sede.municipio }} • {{ sede.direccion }}</span>
                  </p>

                  <div class="p-3 bg-warm-50/60 rounded-xl border border-warm-100 text-xs text-warm-600 mb-4 space-y-1">
                    <div class="flex justify-between">
                      <span class="text-warm-400">Teléfono:</span>
                      <span class="font-semibold text-warm-800">{{ sede.telefono || 'No registrado' }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2 pt-2 border-t border-warm-100">
                  <button
                    type="button"
                    (click)="editarSede(sede)"
                    class="flex-1 py-2 px-3 bg-warm-100 hover:bg-warm-200 text-warm-800 rounded-xl text-xs font-semibold transition-colors text-center"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    (click)="toggleEstadoSede(sede)"
                    class="p-2 text-warm-500 hover:text-warm-800 hover:bg-warm-100 rounded-xl transition-colors"
                    [title]="sede.estado === 'ACTIVO' ? 'Desactivar Sede' : 'Activar Sede'"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>

          @if (sedesFiltradas().length > pageSize()) {
            <div class="mt-6 flex justify-center">
              <app-pagination
                [currentPage]="currentPage()"
                [totalItems]="sedesFiltradas().length"
                [pageSize]="pageSize()"
                (pageChange)="currentPage.set($event)"
              />
            </div>
          }
        }
      }

      <!-- ================= 2. FORMULARIO SEDE ================= -->
      @if (vista() === 'FORM') {
        <div class="bg-white border border-warm-200 rounded-2xl p-6 sm:p-8 shadow-warm-sm max-w-xl mx-auto space-y-6">
          <div class="flex items-center justify-between pb-4 border-b border-warm-100">
            <div>
              <h2 class="text-xl font-serif font-bold text-warm-900">
                {{ sedeEnEdicion ? 'Editar Sede' : 'Registrar Nueva Sede' }}
              </h2>
              <p class="text-xs text-warm-600 mt-0.5">Ubicación y cobertura geográfica institucional.</p>
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
              <label class="block text-xs font-bold text-warm-700 uppercase mb-1">Código de Sede *</label>
              <input
                type="text"
                [(ngModel)]="formSede.codigo"
                placeholder="Ej: SEDE-RION"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-warm-700 uppercase mb-1">Nombre de la Sede *</label>
              <input
                type="text"
                [(ngModel)]="formSede.nombre"
                placeholder="Ej: Campus Principal Rionegro"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-warm-700 uppercase mb-1">Municipio *</label>
                <input
                  type="text"
                  [(ngModel)]="formSede.municipio"
                  placeholder="Ej: Rionegro"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-warm-700 uppercase mb-1">Teléfono</label>
                <input
                  type="text"
                  [(ngModel)]="formSede.telefono"
                  placeholder="Ej: (604) 569-8000"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-warm-700 uppercase mb-1">Dirección</label>
              <input
                type="text"
                [(ngModel)]="formSede.direccion"
                placeholder="Ej: Sector San Antonio de Pereira"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
              />
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
                [disabled]="!formSede.codigo.trim() || !formSede.nombre.trim() || !formSede.municipio.trim()"
                (click)="guardar()"
                class="px-5 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Guardar Sede
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminSedesComponent implements OnInit {
  private adminService = inject(AdminManagementService);
  private toast = inject(ToastService);

  vista = signal<VistaSede>('LISTA');
  filtroTexto = signal('');
  currentPage = signal(1);
  pageSize = signal(6);

  sedes = this.adminService.sedes;

  sedeEnEdicion: SedeInstitucionalItem | null = null;
  formSede = {
    codigo: '',
    nombre: '',
    municipio: '',
    direccion: '',
    telefono: '',
    estado: 'ACTIVO' as 'ACTIVO' | 'INACTIVO',
  };

  totalActivas = computed(() => this.sedes().filter((s) => s.estado === 'ACTIVO').length);

  sedesFiltradas = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    return this.sedes().filter(
      (s) =>
        !txt ||
        s.codigo.toLowerCase().includes(txt) ||
        s.nombre.toLowerCase().includes(txt) ||
        s.municipio.toLowerCase().includes(txt)
    );
  });

  pagedSedes = computed(() => {
    const list = this.sedesFiltradas();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.adminService.cargarSedes().subscribe();
  }

  abrirFormularioCrear(): void {
    this.sedeEnEdicion = null;
    this.formSede = {
      codigo: '',
      nombre: '',
      municipio: '',
      direccion: '',
      telefono: '',
      estado: 'ACTIVO',
    };
    this.vista.set('FORM');
  }

  editarSede(sede: SedeInstitucionalItem): void {
    this.sedeEnEdicion = sede;
    this.formSede = {
      codigo: sede.codigo,
      nombre: sede.nombre,
      municipio: sede.municipio,
      direccion: sede.direccion,
      telefono: sede.telefono || '',
      estado: sede.estado,
    };
    this.vista.set('FORM');
  }

  guardar(): void {
    if (!this.formSede.codigo.trim() || !this.formSede.nombre.trim() || !this.formSede.municipio.trim()) return;

    if (this.sedeEnEdicion) {
      this.adminService.actualizarSede(this.sedeEnEdicion.id, { ...this.formSede });
      this.toast.success('Sede institucional actualizada correctamente.');
    } else {
      this.adminService.crearSede({ ...this.formSede });
      this.toast.success('Sede institucional registrada con éxito.');
    }
    this.vista.set('LISTA');
  }

  toggleEstadoSede(sede: SedeInstitucionalItem): void {
    this.adminService.cambiarEstadoSede(sede.id);
    this.toast.info(`Estado de la sede cambiado a ${sede.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'}.`);
  }
}

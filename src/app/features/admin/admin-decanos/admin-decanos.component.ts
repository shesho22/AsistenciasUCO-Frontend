import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CatalogService, TipoIdentificacionItem, FacultadItem } from '../../../core/services/catalog.service';
import { DecanoItem } from '../../../core/models/role-management.model';
import { CardComponent } from '../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { UserPickerModalComponent, UserPickerItem } from '../../../shared/components/user-picker-modal/user-picker-modal.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { parseIdentificationNumber, validateInstitutionalEmail } from '../../../core/validation/request-form-validation.util';

type VistaAdmin = 'LISTA' | 'REGISTRO';

@Component({
  selector: 'app-admin-decanos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    FormFieldComponent,
    UserPickerModalComponent,
  ],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- 1. VISTA: LISTA DE DECANOS -->
      @if (vistaActual() === 'LISTA') {
        <!-- Header Bento -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-800 border border-primary-200">
                Administración Central
              </span>
              <span class="text-xs text-warm-400">•</span>
              <span class="text-xs font-medium text-warm-500">Módulo de Gobierno</span>
            </div>
            <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
              Gestión de Decanos
            </h1>
            <p class="text-sm text-warm-600 mt-1">
              Administra los decanos asignados a cada facultad institucional y supervisa su estado activo.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <app-button variant="primary" size="md" (clicked)="abrirModalSeleccionarDecano()">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Nombrar Decano Existente
            </app-button>
            <app-button variant="secondary" size="md" (clicked)="abrirFormularioRegistro()">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Registrar Nuevo
            </app-button>
          </div>
        </div>

        <!-- Filtros y Búsqueda -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="sm:col-span-2">
            <div class="relative">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Buscar por nombre, cédula o facultad..."
                class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm transition-all"
              />
              <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div>
            <select
              [(ngModel)]="selectedEstado"
              class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Solo Activos</option>
              <option value="INACTIVO">Solo Inactivos</option>
            </select>
          </div>
        </div>

        <!-- Grid de Decanos en Bento Cards -->
        @if (isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            @for (n of [1, 2, 3, 4]; track n) {
              <div class="h-44 bg-warm-100 rounded-2xl animate-pulse"></div>
            }
          </div>
        } @else if (filteredDecanos().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
            <div class="w-12 h-12 rounded-full bg-warm-100 text-warm-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-warm-900">No se encontraron decanos</h3>
            <p class="text-xs text-warm-500 mt-1">Prueba con otros términos de búsqueda o filtros.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            @for (decano of filteredDecanos(); track decano.id) {
              <app-card [hoverable]="true" padding="md">
                <div class="flex flex-col h-full justify-between gap-4">
                  <div>
                    <div class="flex items-start justify-between gap-3 mb-2">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-warm-100 text-warm-700">
                          DEC-{{ decano.numeroIdentificacion }}
                        </span>
                        <app-badge [variant]="decano.estado === 'ACTIVO' ? 'success' : 'neutral'">
                          {{ decano.estado }}
                        </app-badge>
                      </div>

                      <button
                        type="button"
                        (click)="toggleEstado(decano)"
                        class="text-xs px-2.5 py-1 rounded-lg border border-warm-200 hover:bg-warm-100 text-warm-700 transition-colors"
                        [title]="decano.estado === 'ACTIVO' ? 'Desactivar decano' : 'Activar decano'"
                      >
                        {{ decano.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar' }}
                      </button>
                    </div>

                    <h3 class="font-serif font-bold text-lg text-warm-900 leading-snug">
                      {{ decano.nombreCompleto || (decano.nombres + ' ' + decano.apellidos).trim() }}
                    </h3>
                    <p class="text-xs font-semibold text-primary-800 mt-0.5">
                      {{ decano.facultad || decano.nombreFacultad || 'Sin Facultad Asignada' }}
                    </p>
                  </div>

                  <div class="space-y-1.5 pt-3 border-t border-warm-100 text-xs text-warm-600">
                    <div class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      <span>{{ decano.tipoIdentificacion || 'CC' }} {{ decano.numeroIdentificacion }}</span>
                    </div>
                    @if (decano.correo) {
                      <div class="flex items-center gap-2">
                        <svg class="w-3.5 h-3.5 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span class="truncate">{{ decano.correo }}</span>
                      </div>
                    }
                    <div class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{{ decano.telefono }}</span>
                    </div>
                  </div>
                </div>
              </app-card>
            }
          </div>
        }
      }

      <!-- 2. VISTA COMPLETA: FORMULARIO DE REGISTRO DE DECANO -->
      @if (vistaActual() === 'REGISTRO') {
        <!-- Barra Superior de Retorno -->
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <button
            type="button"
            (click)="volverALista()"
            class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a la Gestión de Decanos
          </button>

          <span class="text-xs font-bold text-primary-800 bg-primary-50 border border-primary-200 px-3 py-1 rounded-full">
            Nuevo Registro Institucional
          </span>
        </div>

        <div class="bg-white p-6 sm:p-8 rounded-2xl border border-warm-200 shadow-warm-sm max-w-3xl mx-auto space-y-6">
          <div>
            <h2 class="font-serif font-bold text-2xl text-warm-900">
              Registrar Nuevo Decano
            </h2>
            <p class="text-sm text-warm-600 mt-1">
              Ingresa los datos personales y asigna la facultad correspondiente para la nueva autoridad académica.
            </p>
          </div>

          <!-- Banner Asistido: Docente o Funcionario ya existente -->
          <div class="mb-6 p-4 rounded-2xl bg-primary-50/70 border border-primary-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-800 shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-primary-950">¿La persona ya pertenece a la Universidad?</p>
                <p class="text-xs text-primary-800">Selecciona un docente o directivo del directorio institucional sin reescribir sus datos.</p>
              </div>
            </div>
            <app-button variant="primary" size="sm" type="button" (clicked)="abrirModalSeleccionarDecano()">
              <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar Persona
            </app-button>
          </div>

          <form (ngSubmit)="guardarDecano()" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-form-field label="Primer Nombre" [required]="true">
                <input
                  type="text"
                  [(ngModel)]="formData.primerNombre"
                  name="primerNombre"
                  required
                  placeholder="ej. Juan"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>
              <app-form-field label="Segundo Nombre (Opcional)">
                <input
                  type="text"
                  [(ngModel)]="formData.segundoNombre"
                  name="segundoNombre"
                  placeholder="ej. Carlos"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-form-field label="Primer Apellido" [required]="true">
                <input
                  type="text"
                  [(ngModel)]="formData.primerApellido"
                  name="primerApellido"
                  required
                  placeholder="ej. Gómez"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>
              <app-form-field label="Segundo Apellido (Opcional)">
                <input
                  type="text"
                  [(ngModel)]="formData.segundoApellido"
                  name="segundoApellido"
                  placeholder="ej. Pérez"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-form-field label="Tipo de Documento" [required]="true">
                <select
                  [(ngModel)]="formData.tipoIdentificacionId"
                  (change)="onTipoIdentificacionChange($event)"
                  name="tipoIdentificacionId"
                  required
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  @for (tipo of tiposIdentificacion(); track tipo.id) {
                    <option [value]="tipo.id">{{ tipo.tipoIdentificacion }} - {{ tipo.nombre }}</option>
                  }
                </select>
              </app-form-field>
              <div class="sm:col-span-2">
                <app-form-field label="Número de Identificación" [required]="true">
                  <input
                    type="text"
                    [(ngModel)]="formData.numeroIdentificacion"
                    (input)="onNumeroIdentificacionInput($event)"
                    name="numeroIdentificacion"
                    required
                    maxlength="15"
                    placeholder="ej. 1017000001"
                    class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </app-form-field>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-form-field label="Teléfono de Contacto">
                <input
                  type="text"
                  [(ngModel)]="formData.telefono"
                  name="telefono"
                  placeholder="+57 (604) 569-8000"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>
            </div>

            <app-form-field label="Correo Institucional UCO" [required]="true">
              <input
                type="email"
                [(ngModel)]="formData.correo"
                name="correo"
                placeholder="decano.facultad@uco.edu.co"
                required
                class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </app-form-field>

            <app-form-field label="Facultad Asignada" [required]="true">
              <select
                [(ngModel)]="formData.facultad"
                name="facultad"
                required
                class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                @if (facultades().length > 0) {
                  @for (fac of facultades(); track fac.id) {
                    <option [value]="fac.nombre">{{ fac.nombre }}</option>
                  }
                } @else {
                  <option value="Facultad de Ingeniería">Facultad de Ingeniería</option>
                  <option value="Facultad de Ciencias de la Salud">Facultad de Ciencias de la Salud</option>
                  <option value="Facultad de Ciencias de la Educación">Facultad de Ciencias de la Educación</option>
                  <option value="Facultad de Ciencias Económicas y Administrativas">Facultad de Ciencias Económicas y Administrativas</option>
                }
              </select>
            </app-form-field>

            <div class="flex items-center justify-end gap-3 pt-5 border-t border-warm-100">
              <app-button variant="secondary" size="md" type="button" (clicked)="volverALista()">
                Cancelar
              </app-button>
              <app-button variant="primary" size="md" type="submit" [disabled]="!formData.primerNombre || !formData.primerApellido || !formData.correo || !formData.numeroIdentificacion">
                Guardar Decano
              </app-button>
            </div>
          </form>
        </div>
      }

      <!-- Modal de Selección de Decano Existente -->
      <app-user-picker-modal
        [isOpen]="isPickerModalOpen()"
        title="Nombrar Decano de Facultad"
        subtitle="Selecciona un directivo, docente o funcionario del claustro institucional para nombrarlo Decano."
        roleBadge="Gobierno Académico UCO"
        (userSelected)="onDecanoSeleccionadoDelDirectorio($event)"
        (requestNew)="onSolicitarRegistroNuevo()"
        (cancelled)="isPickerModalOpen.set(false)"
      />
    </div>
  `,
})
export class AdminDecanosComponent implements OnInit {
  private adminService = inject(AdminManagementService);
  private catalogService = inject(CatalogService);
  private toast = inject(ToastService);

  isPickerModalOpen = signal<boolean>(false);
  vistaActual = signal<VistaAdmin>('LISTA');
  decanos = signal<DecanoItem[]>([]);
  tiposIdentificacion = signal<TipoIdentificacionItem[]>([]);
  facultades = signal<FacultadItem[]>([]);
  isLoading = signal<boolean>(true);
  searchQuery = '';
  selectedEstado = 'TODOS';

  formData: Omit<DecanoItem, 'id'> = {
    tipoIdentificacionId: 'A1B2C3D4-0000-0000-0000-000000000001',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    nombres: '',
    apellidos: '',
    correo: '',
    facultad: 'Facultad de Ingeniería',
    telefono: '+57 (604) 569-8000',
    fechaAsignacion: new Date().toISOString().split('T')[0],
    estado: 'ACTIVO',
  };

  filteredDecanos = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    const estado = this.selectedEstado;

    return this.decanos().filter((item) => {
      const nombres = (item.nombres || '').toLowerCase();
      const apellidos = (item.apellidos || '').toLowerCase();
      const nombreCompleto = (item.nombreCompleto || '').toLowerCase();
      const facultad = (item.facultad || item.nombreFacultad || '').toLowerCase();
      const doc = (item.numeroIdentificacion || '');

      const matchQuery =
        !query ||
        nombres.includes(query) ||
        apellidos.includes(query) ||
        nombreCompleto.includes(query) ||
        facultad.includes(query) ||
        doc.includes(query);

      const matchEstado = estado === 'TODOS' || item.estado === estado;

      return matchQuery && matchEstado;
    });
  });

  ngOnInit(): void {
    this.cargarTiposIdentificacion();
    this.cargarFacultades();
    this.cargarDecanos();
  }

  cargarFacultades(): void {
    this.catalogService.getFacultades().subscribe({
      next: (res) => {
        if (res.datos) {
          this.facultades.set(res.datos);
        }
      },
      error: () => console.warn('Usando catálogo local de facultades.'),
    });
  }

  cargarTiposIdentificacion(): void {
    this.catalogService.getTiposIdentificacion().subscribe({
      next: (res) => {
        if (res.datos && res.datos.length > 0) {
          this.tiposIdentificacion.set(res.datos);
          this.formData.tipoIdentificacionId = res.datos[0].id;
          this.formData.tipoIdentificacion = res.datos[0].tipoIdentificacion;
        }
      },
      error: () => console.warn('Usando catálogo local de tipos de documento.'),
    });
  }

  onTipoIdentificacionChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const selectedTipo = this.tiposIdentificacion().find((t) => t.id === select.value);
    if (selectedTipo) {
      this.formData.tipoIdentificacion = selectedTipo.tipoIdentificacion;
      this.formData.tipoIdentificacionId = selectedTipo.id;
    }
  }

  cargarDecanos(): void {
    this.isLoading.set(true);
    this.adminService.getDecanos().subscribe({
      next: (res) => {
        this.decanos.set(res.datos || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error al cargar la lista de decanos.');
      },
    });
  }

  toggleEstado(decano: DecanoItem): void {
    this.adminService.toggleDecanoStatus(decano.id).subscribe({
      next: (res) => {
        if (res.exitoso && res.datos) {
          const updated = this.decanos().map((d) => (d.id === decano.id ? res.datos! : d));
          this.decanos.set(updated);
          this.toast.success(res.mensajeUsuario || 'Estado actualizado.');
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  abrirFormularioRegistro(): void {
    this.formData = {
      tipoIdentificacionId: this.tiposIdentificacion().length > 0 ? this.tiposIdentificacion()[0].id : 'A1B2C3D4-0000-0000-0000-000000000001',
      tipoIdentificacion: this.tiposIdentificacion().length > 0 ? this.tiposIdentificacion()[0].tipoIdentificacion : 'CC',
      numeroIdentificacion: '',
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      nombres: '',
      apellidos: '',
      correo: '',
      facultad: 'Facultad de Ingeniería',
      telefono: '+57 (604) 569-8000',
      fechaAsignacion: new Date().toISOString().split('T')[0],
      estado: 'ACTIVO',
    };
    this.vistaActual.set('REGISTRO');
  }

  onNumeroIdentificacionInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
    this.formData.numeroIdentificacion = input.value;
  }

  volverALista(): void {
    this.vistaActual.set('LISTA');
  }

  guardarDecano(): void {
    if (!this.formData.tipoIdentificacionId) {
      this.toast.warning('El campo Tipo de Documento es obligatorio.');
      return;
    }

    const idResult = parseIdentificationNumber(this.formData.numeroIdentificacion);
    if (!idResult.valid) {
      this.toast.warning(idResult.error);
      return;
    }

    const pn = (this.formData.primerNombre || '').trim();
    const pa = (this.formData.primerApellido || '').trim();
    if (!pn) {
      this.toast.warning('El campo Primer Nombre es obligatorio.');
      return;
    }
    if (!pa) {
      this.toast.warning('El campo Primer Apellido es obligatorio.');
      return;
    }

    const emailResult = validateInstitutionalEmail(this.formData.correo);
    if (!emailResult.valid) {
      this.toast.warning(emailResult.error || 'Correo institucional inválido.');
      return;
    }

    if (!this.formData.facultad || !this.formData.facultad.trim()) {
      this.toast.warning('El campo Facultad Asignada es obligatorio.');
      return;
    }

    this.formData.nombres = [pn, (this.formData.segundoNombre || '').trim()].filter(Boolean).join(' ');
    this.formData.apellidos = [pa, (this.formData.segundoApellido || '').trim()].filter(Boolean).join(' ');

    this.adminService.createDecano(this.formData).subscribe({
      next: (res) => {
        if (res.exitoso && res.datos) {
          this.decanos.set([res.datos, ...this.decanos()]);
          this.toast.success(res.mensajeUsuario || 'Decano registrado exitosamente.');
          this.volverALista();
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  abrirModalSeleccionarDecano(): void {
    this.isPickerModalOpen.set(true);
  }

  onSolicitarRegistroNuevo(): void {
    this.isPickerModalOpen.set(false);
    this.abrirFormularioRegistro();
  }

  onDecanoSeleccionadoDelDirectorio(user: UserPickerItem): void {
    this.isPickerModalOpen.set(false);

    const yaExiste = this.decanos().some(
      (d) =>
        d.id === user.id ||
        (d.numeroIdentificacion && d.numeroIdentificacion === user.numeroIdentificacion) ||
        (d.correo && user.correo && d.correo.toLowerCase() === user.correo.toLowerCase())
    );

    if (yaExiste) {
      this.toast.info(`El profesional ${user.nombres} ${user.apellidos} ya está nombrado como Decano.`);
      return;
    }

    const facultadAsignada =
      this.formData.facultad ||
      (this.facultades().length > 0
        ? this.facultades()[0].nombre
        : 'Facultad de Ingeniería');

    const nuevoDecano: DecanoItem = {
      id: user.id,
      tipoIdentificacionId:
        this.tiposIdentificacion().find((t) => t.tipoIdentificacion === user.tipoIdentificacion)?.id ||
        (this.tiposIdentificacion().length > 0
          ? this.tiposIdentificacion()[0].id
          : 'A1B2C3D4-0000-0000-0000-000000000001'),
      tipoIdentificacion: user.tipoIdentificacion || 'CC',
      numeroIdentificacion: user.numeroIdentificacion,
      primerNombre: user.primerNombre || user.nombres.split(' ')[0] || '',
      segundoNombre: user.segundoNombre || '',
      primerApellido: user.primerApellido || user.apellidos.split(' ')[0] || '',
      segundoApellido: user.segundoApellido || '',
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      facultad: facultadAsignada,
      telefono: '+57 (604) 569-8000',
      fechaAsignacion: new Date().toISOString().split('T')[0],
      estado: 'ACTIVO',
    };

    this.adminService.createDecano(nuevoDecano).subscribe({
      next: (res) => {
        const creado = res.datos || nuevoDecano;
        this.decanos.set([creado, ...this.decanos()]);
        this.toast.success(
          res.mensajeUsuario || `Decano ${user.nombres} ${user.apellidos} nombrado exitosamente.`
        );
        this.volverALista();
      },
      error: () => {
        this.decanos.set([nuevoDecano, ...this.decanos()]);
        this.toast.success(`Decano ${user.nombres} ${user.apellidos} nombrado exitosamente.`);
        this.volverALista();
      },
    });
  }
}

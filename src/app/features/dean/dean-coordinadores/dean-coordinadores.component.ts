import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeanManagementService } from '../../../core/services/dean-management.service';
import { CatalogService, TipoIdentificacionItem } from '../../../core/services/catalog.service';
import { ActualizarCoordinadorPayload, CoordinadorItem, ResultadoGestionCoordinador } from '../../../core/models/role-management.model';
import { ApiResponse } from '../../../core/models/api-response.model';
import { DeanCoordinadorEditModalComponent } from './components/dean-coordinador-edit-modal.component';
import { DeanCoordinadorEstadoModalComponent } from './components/dean-coordinador-estado-modal.component';
import { CardComponent } from '../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ActionMenuComponent, ActionMenuItem } from '../../../shared/components/action-menu/action-menu.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { UserPickerModalComponent, UserPickerItem } from '../../../shared/components/user-picker-modal/user-picker-modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { AccountAccessStatusComponent } from '../../../shared/components/account-access-status/account-access-status.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import {
  parseIdentificationNumber,
  validateInstitutionalEmail,
  getPasswordValidationError,
} from '../../../core/validation/request-form-validation.util';
import { finalize } from 'rxjs';
import { IdentidadEsperada, UltimaPeticion, advertirRegistroNoListado } from '../../../core/utils/registro-confirmado.util';
import { CargaMasivaUsuariosComponent } from '../../../shared/components/carga-masiva-usuarios/carga-masiva-usuarios.component';

type VistaDecano = 'LISTA' | 'REGISTRO';

@Component({
    selector: 'app-dean-coordinadores',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ActionMenuComponent,
        CommonModule,
        FormsModule,
        CardComponent,
        BadgeComponent,
        ButtonComponent,
        FormFieldComponent,
        UserPickerModalComponent,
        AccountAccessStatusComponent,
        PaginationComponent,
        DeanCoordinadorEditModalComponent,
        DeanCoordinadorEstadoModalComponent,
        CargaMasivaUsuariosComponent,
    ],
    template: `
    <div class="space-y-6 animate-fade-in">
      <!-- 1. VISTA: LISTA DE COORDINADORES -->
      @if (vistaActual() === 'LISTA') {
        <!-- Header Bento -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
          @if (!embebido()) {
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-100 text-accent-900 border border-accent-200">
                Decanatura
              </span>
              <span class="text-xs text-warm-400">•</span>
              <span class="text-xs font-medium text-warm-500">Gestión Académica de Programas</span>
            </div>
            <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
              Gestión de Coordinadores
            </h1>
            <p class="text-sm text-warm-600 mt-1">
              Supervisa los coordinadores a cargo de los programas adscritos a la facultad, su carga de docentes y grupos.
            </p>
          </div>
          }

          <div class="flex items-center gap-3" data-testid="acciones-encabezado">
            <app-button variant="primary" size="md" (clicked)="abrirModalSeleccionarCoordinador()">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Nombrar Coordinador Existente
            </app-button>
            <app-action-menu label="Más acciones" [items]="accionesEncabezado" (selected)="alElegirAccion($event)" />
          </div>
        </div>

        @if (mostrarCargaMasiva()) {
          <app-carga-masiva-usuarios
            destino="COORDINADOR"
            (cargaCompletada)="onCargaMasivaCompletada()"
            (cancelar)="mostrarCargaMasiva.set(false)"
          />
        }

        <!-- Estado de acceso de la ultima cuenta registrada (verificado por el backend, nunca por la SPA) -->
        <app-account-access-status [correo]="ultimaCuentaRegistrada()" />

        <!-- Filtros y Búsqueda -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="sm:col-span-2">
            <div class="relative">
              <input
                type="search"
                id="dean-coord-busqueda"
                aria-label="Buscar coordinador por nombre, cédula o programa"
                [ngModel]="searchQuery"
                (ngModelChange)="searchQuery = $event"
                placeholder="Buscar por coordinador, cédula o programa académico..."
                class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm transition-all"
              />
              <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div>
            <select
              id="dean-coord-estado"
              aria-label="Filtrar coordinadores por estado"
              [ngModel]="selectedEstado"
              (ngModelChange)="selectedEstado = $event"
              class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Solo Activos</option>
              <option value="INACTIVO">Solo Inactivos</option>
            </select>
          </div>
        </div>

        <!-- Grid de Coordinadores -->
        @if (isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            @for (n of [1, 2, 3, 4]; track n) {
              <div class="h-44 bg-warm-100 rounded-2xl animate-pulse"></div>
            }
          </div>
        } @else if (errorCarga() !== null) {
          <div class="bg-white rounded-2xl border border-danger-200 p-12 text-center shadow-warm-sm" role="alert">
            <h3 class="text-base font-semibold text-danger-700">No fue posible cargar los coordinadores</h3>
            <p class="text-xs text-danger-700 mt-1">{{ errorCarga() }}</p>
            <button type="button" (click)="cargarCoordinadores()" class="mt-4 min-h-[44px] px-4 text-xs font-semibold rounded-xl border border-danger-200 text-danger-700 hover:bg-danger-50">Reintentar</button>
          </div>
        } @else if (filteredCoordinadores().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
            <div class="w-12 h-12 rounded-full bg-warm-100 text-warm-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-warm-900">No se encontraron coordinadores</h3>
            <p class="text-xs text-warm-500 mt-1">Verifica los filtros o asigna un nuevo coordinador.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            @for (coord of paginatedCoordinadores(); track coord.id) {
              <app-card [hoverable]="true" padding="md">
                <div class="flex flex-col h-full justify-between gap-4">
                  <div>
                    <div class="flex items-start justify-between gap-3 mb-2">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-warm-100 text-warm-700">
                          COORD-{{ coord.numeroIdentificacion }}
                        </span>
                        <app-badge [variant]="coord.estado === 'ACTIVO' ? 'success' : 'neutral'">
                          {{ coord.estado }}
                        </app-badge>
                      </div>

                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          (click)="abrirEdicion(coord)"
                          class="text-xs px-2.5 py-1 rounded-lg border border-warm-200 hover:bg-warm-100 text-warm-700 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          (click)="toggleEstado(coord)"
                          class="text-xs px-2.5 py-1 rounded-lg border border-warm-200 hover:bg-warm-100 text-warm-700 transition-colors"
                        >
                          {{ coord.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar' }}
                        </button>
                      </div>
                    </div>

                    <h3 class="font-serif font-bold text-lg text-warm-900 leading-snug">
                      {{ coord.nombres }} {{ coord.apellidos }}
                    </h3>
                    <div class="flex items-center gap-1.5 mt-1">
                      <span class="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md">
                        {{ coord.programaAcademico }}
                      </span>
                    </div>
                    @if (coord.facultad) {
                      <p class="text-xs text-warm-500 mt-1">{{ coord.facultad }}</p>
                    }
                  </div>

                  <!-- Métricas Bento -->
                  <div class="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-warm-50 border border-warm-100">
                    <div class="text-center">
                      <span class="block text-base font-bold text-warm-900 font-serif">{{ coord.totalDocentes ?? '—' }}</span>
                      <span class="text-[11px] text-warm-500">Docentes activos</span>
                    </div>
                    <div class="text-center border-l border-warm-200">
                      <span class="block text-base font-bold text-primary-700 font-serif">{{ coord.totalGrupos ?? '—' }}</span>
                      <span class="text-[11px] text-warm-500">Grupos gestionados</span>
                    </div>
                  </div>

                  <div class="space-y-1 pt-2 border-t border-warm-100 text-xs text-warm-600">
                    <div class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      <span>{{ coord.tipoIdentificacion || 'CC' }} {{ coord.numeroIdentificacion }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span class="truncate">{{ coord.correo }}</span>
                    </div>
                  </div>
                </div>
              </app-card>
            }
          </div>
          <app-pagination
            [totalItems]="filteredCoordinadores().length"
            [pageSize]="pageSize()"
            [currentPage]="currentPage()"
            [pageSizeOptions]="[6, 10, 20]"
            (pageChange)="currentPage.set($event)"
            (pageSizeChange)="onPageSizeChange($event)"
          />
        }
      }

      <!-- 2. VISTA COMPLETA: FORMULARIO DE ASIGNACIÓN DE COORDINADOR -->
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
            Volver a la Gestión de Coordinadores
          </button>

          <span class="text-xs font-bold text-accent-900 bg-accent-100 border border-accent-200 px-3 py-1 rounded-full">
            Asignación de Programa
          </span>
        </div>

        <div class="bg-white p-6 sm:p-8 rounded-2xl border border-warm-200 shadow-warm-sm max-w-3xl mx-auto space-y-6">
          <div>
            <h2 class="font-serif font-bold text-2xl text-warm-900">
              Asignar Nuevo Coordinador de Programa
            </h2>
            <p class="text-sm text-warm-600 mt-1">
              Asigna a un docente o profesional la responsabilidad de coordinación para un programa académico.
            </p>
          </div>

          <!-- Banner Asistido: Docente o Funcionario ya existente -->
          <div class="mb-6 p-4 rounded-2xl bg-accent-50/70 border border-accent-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center text-accent-800 shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-accent-950">¿La persona ya pertenece a la Universidad?</p>
                <p class="text-xs text-accent-800">Selecciona un docente o funcionario del directorio institucional sin reescribir sus datos.</p>
              </div>
            </div>
            <app-button variant="primary" size="sm" type="button" (clicked)="abrirModalSeleccionarCoordinador()">
              <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar Persona
            </app-button>
          </div>

          <form (ngSubmit)="guardarCoordinador()" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-form-field label="Primer Nombre" [required]="true" [errorMessage]="errorCampo('primerNombre')">
                <input
                  type="text"
                  [(ngModel)]="formData.primerNombre"
                  name="primerNombre"
                  required
                  placeholder="ej. Andrés"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>
              <app-form-field label="Segundo Nombre (Opcional)">
                <input
                  type="text"
                  [(ngModel)]="formData.segundoNombre"
                  name="segundoNombre"
                  placeholder="ej. Felipe"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-form-field label="Primer Apellido" [required]="true" [errorMessage]="errorCampo('primerApellido')">
                <input
                  type="text"
                  [(ngModel)]="formData.primerApellido"
                  name="primerApellido"
                  required
                  placeholder="ej. López"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>
              <app-form-field label="Segundo Apellido (Opcional)">
                <input
                  type="text"
                  [(ngModel)]="formData.segundoApellido"
                  name="segundoApellido"
                  placeholder="ej. Martínez"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-form-field label="Tipo de Documento" [required]="true" [errorMessage]="errorCampo('tipoIdentificacionId')">
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
                <app-form-field label="Número de Identificación" [required]="true" [errorMessage]="errorCampo('numeroIdentificacion')">
                  <input
                    type="text"
                    [(ngModel)]="formData.numeroIdentificacion"
                    (input)="onNumeroIdentificacionInput($event)"
                    name="numeroIdentificacion"
                    required
                    maxlength="15"
                    placeholder="ej. 1017000002"
                    class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </app-form-field>
              </div>
            </div>

            <app-form-field label="Programa Académico" [required]="true" [errorMessage]="errorCampo('programaAcademico')">
              <select
                [(ngModel)]="formData.programaAcademico"
                name="programaAcademico"
                required
                class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">-- Selecciona un Programa --</option>
                <option value="SIN_PROGRAMA">Sin programa asignado (Aprovisionar para nuevo programa)</option>
                @for (prog of programasAcademicos(); track prog.id) {
                  <option [value]="prog.nombre">{{ prog.nombre }}</option>
                }
              </select>
            </app-form-field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-form-field label="Correo Institucional UCO" [required]="true" [errorMessage]="errorCampo('correo')">
                <input
                  type="email"
                  [(ngModel)]="formData.correo"
                  name="correo"
                  placeholder="coordinador.programa@uco.edu.co"
                  required
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>

              <app-form-field label="Contraseña" [required]="true" [errorMessage]="errorCampo('password')">
                <input
                  type="text"
                  [(ngModel)]="formData.password"
                  name="password"
                  required
                  placeholder="ej. UcoCoord2026!"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>
            </div>

            <app-form-field label="Facultad">
              <input
                type="text"
                [(ngModel)]="formData.facultad"
                name="facultad"
                readonly
                class="w-full px-3.5 py-2.5 bg-warm-100 border border-warm-200 rounded-xl text-sm text-warm-600 cursor-not-allowed"
              />
            </app-form-field>

            <div class="flex items-center justify-end gap-3 pt-5 border-t border-warm-100">
              <app-button variant="secondary" size="md" type="button" (clicked)="volverALista()">
                Cancelar
              </app-button>
              <app-button variant="primary" size="md" type="submit" [loading]="isSubmitting()">
                Guardar Coordinador
              </app-button>
            </div>
          </form>
        </div>
      }

      <!-- Modal de Selección de Coordinador Existente -->
      <app-user-picker-modal
        [isOpen]="isPickerModalOpen()"
        title="Nombrar Coordinador de Programa"
        subtitle="Selecciona un docente o funcionario existente para nombrarlo coordinador de un programa académico."
        roleBadge="Directorio Institucional UCO"
        (userSelected)="onCoordinadorSeleccionadoDelDirectorio($event)"
        (requestNew)="onSolicitarRegistroNuevo()"
        (cancelled)="isPickerModalOpen.set(false)"
      />

      <!-- HU121: edición de datos del coordinador -->
      @if (coordinadorEnEdicion(); as coordEdicion) {
        <app-dean-coordinador-edit-modal
          [coordinador]="coordEdicion"
          (guardar)="guardarEdicion($event)"
          (cancelar)="cerrarEdicion()"
        />
      }

      <!-- HU122: confirmación de activación o desactivación -->
      @if (coordinadorParaCambioEstado(); as coordEstado) {
        <app-dean-coordinador-estado-modal
          [coordinador]="coordEstado"
          (confirmar)="confirmarCambioEstado()"
          (cancelar)="cancelarCambioEstado()"
        />
      }
    </div>
  `
})
export class DeanCoordinadoresComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private deanService = inject(DeanManagementService);
  private catalogService = inject(CatalogService);
  private toast = inject(ToastService);

  isPickerModalOpen = signal<boolean>(false);
  /** Correo de la ultima cuenta registrada: el panel consulta su estado de acceso real. */
  ultimaCuentaRegistrada = signal<string | null>(null);
  coordinadorEnEdicion = signal<CoordinadorItem | null>(null);
  coordinadorParaCambioEstado = signal<CoordinadorItem | null>(null);
  vistaActual = signal<VistaDecano>('LISTA');
  coordinadores = signal<CoordinadorItem[]>([]);
  tiposIdentificacion = signal<TipoIdentificacionItem[]>([]);
  programasAcademicos = signal<Array<{ id: string; nombre: string }>>([]);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  readonly mostrarCargaMasiva = signal<boolean>(false);

  /** Acciones secundarias de la cabecera: se agrupan en "Mas" para dejar una sola accion primaria. */
  readonly accionesEncabezado: ActionMenuItem[] = [
    { id: 'registrar', label: 'Registrar nuevo', testid: 'accion-registrar-nuevo' },
    { id: 'carga-masiva', label: 'Carga masiva CSV', testid: 'accion-carga-masiva' },
  ];

  alElegirAccion(id: string): void {
    if (id === 'registrar') this.abrirFormularioRegistro();
    else if (id === 'carga-masiva') this.mostrarCargaMasiva.set(true);
  }
  private readonly searchQuerySig = signal('');
  private readonly selectedEstadoSig = signal('TODOS');
  currentPage = signal(1);
  pageSize = signal(6);

  get searchQuery(): string {
    return this.searchQuerySig();
  }
  set searchQuery(valor: string) {
    this.searchQuerySig.set(valor ?? '');
    this.currentPage.set(1);
  }

  get selectedEstado(): string {
    return this.selectedEstadoSig();
  }
  set selectedEstado(valor: string) {
    this.selectedEstadoSig.set(valor);
    this.currentPage.set(1);
  }
  /** Mensaje del backend si falla la carga del directorio de coordinadores. */
  errorCarga = signal<string | null>(null);
  /** Se activa al intentar guardar para mostrar los errores por campo. */
  intentoGuardar = signal(false);
  private readonly ultimaPeticionCoordinadores = new UltimaPeticion();

  formData: Omit<CoordinadorItem, 'id' | 'totalDocentes' | 'totalGrupos'> = {
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
    programaAcademico: '',
    estado: 'ACTIVO',
  };

  filteredCoordinadores = computed(() => {
    const query = this.searchQuerySig().toLowerCase().trim();
    const estado = this.selectedEstadoSig();

    return this.coordinadores().filter((item) => {
      const matchQuery =
        !query ||
        item.nombres.toLowerCase().includes(query) ||
        item.apellidos.toLowerCase().includes(query) ||
        item.programaAcademico.toLowerCase().includes(query) ||
        item.numeroIdentificacion.includes(query);

      const matchEstado = estado === 'TODOS' || item.estado === estado;

      return matchQuery && matchEstado;
    });
  });

  paginatedCoordinadores = computed(() => {
    const inicio = (this.currentPage() - 1) * this.pageSize();
    return this.filteredCoordinadores().slice(inicio, inicio + this.pageSize());
  });

  onPageSizeChange(tamano: number): void {
    this.pageSize.set(tamano);
    this.currentPage.set(1);
  }

  onCargaMasivaCompletada(): void {
    this.cargarCoordinadores();
  }

  ngOnInit(): void {
    this.cargarTiposIdentificacion();
    this.cargarProgramasAcademicos();
    this.cargarCoordinadores();
  }

  cargarProgramasAcademicos(): void {
    this.catalogService.getProgramasAcademicos().subscribe({
      next: (res) => {
        if (res.datos) {
          this.programasAcademicos.set(res.datos);
        }
      },
      error: (err) => this.toast.warning(getApiErrorMessage(err)),
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
      error: (err) => this.toast.warning(getApiErrorMessage(err)),
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

  cargarCoordinadores(identidadEsperada?: IdentidadEsperada): void {
    const peticion = this.ultimaPeticionCoordinadores.iniciar();
    this.isLoading.set(true);
    this.errorCarga.set(null);
    this.deanService.getCoordinadores().subscribe({
      next: (res) => {
        if (!this.ultimaPeticionCoordinadores.esVigente(peticion)) {
          return;
        }
        const datos = res.datos || [];
        this.coordinadores.set(datos);
        this.isLoading.set(false);
        advertirRegistroNoListado(datos, identidadEsperada, (aviso) => this.toast.warning(aviso));
      },
      error: (err) => {
        if (!this.ultimaPeticionCoordinadores.esVigente(peticion)) {
          return;
        }
        this.isLoading.set(false);
        const mensaje = getApiErrorMessage(err);
        this.errorCarga.set(mensaje);
        this.toast.error(mensaje);
      },
    });
  }

  /** HU122: abre la confirmación; el cambio se envía solo al confirmar (con el estado destino explícito). */
  toggleEstado(coord: CoordinadorItem): void {
    this.coordinadorParaCambioEstado.set(coord);
  }

  cancelarCambioEstado(): void {
    this.coordinadorParaCambioEstado.set(null);
  }

  confirmarCambioEstado(): void {
    const coord = this.coordinadorParaCambioEstado();
    if (!coord) {
      return;
    }
    this.deanService.setCoordinadorEstado(coord.id, coord.estado !== 'ACTIVO').subscribe({
      next: (res) => {
        this.coordinadorParaCambioEstado.set(null);
        this.notificarResultado(res);
        this.cargarCoordinadores();
      },
      error: (err) => {
        this.coordinadorParaCambioEstado.set(null);
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }

  /** HU121: abre el formulario de edición con los datos del coordinador. */
  abrirEdicion(coord: CoordinadorItem): void {
    this.coordinadorEnEdicion.set(coord);
  }

  cerrarEdicion(): void {
    this.coordinadorEnEdicion.set(null);
  }

  guardarEdicion(payload: ActualizarCoordinadorPayload): void {
    const coord = this.coordinadorEnEdicion();
    if (!coord) {
      return;
    }
    this.deanService.updateCoordinador(coord.id, payload).subscribe({
      next: (res) => {
        this.coordinadorEnEdicion.set(null);
        this.notificarResultado(res);
        this.cargarCoordinadores();
      },
      // El formulario queda abierto para corregir; el mensaje viene del backend tal cual.
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  private notificarResultado(res: ApiResponse<ResultadoGestionCoordinador>): void {
    const mensaje = res.datos?.mensajeUsuario ?? res.mensajeUsuario;
    if (res.datos?.sincronizacionIdentidad === 'PENDIENTE') {
      this.toast.warning(mensaje ?? 'El cambio se guardó. La cuenta de acceso se sincronizará pronto.');
    } else {
      this.toast.success(mensaje ?? 'Cambio guardado.');
    }
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
      password: '',
      facultad: 'Facultad de Ingeniería',
      programaAcademico: this.programasAcademicos().length === 0 ? 'SIN_PROGRAMA' : '',
      idPrograma: null,
      estado: 'ACTIVO',
    };
    this.intentoGuardar.set(false);
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

  /** Mensaje visible bajo el campo tras un intento de guardado; vacío si el campo es válido. */
  errorCampo(campo: string): string {
    if (!this.intentoGuardar()) {
      return '';
    }
    const f = this.formData;
    const vacio = (v: string | null | undefined) => !(v ?? '').toString().trim();
    switch (campo) {
      case 'primerNombre':
        return vacio(f.primerNombre) ? 'El primer nombre es obligatorio.' : '';
      case 'primerApellido':
        return vacio(f.primerApellido) ? 'El primer apellido es obligatorio.' : '';
      case 'tipoIdentificacionId':
        return vacio(f.tipoIdentificacionId) ? 'Seleccione el tipo de documento.' : '';
      case 'numeroIdentificacion': {
        const r = parseIdentificationNumber(f.numeroIdentificacion);
        return r.valid ? '' : r.error;
      }
      case 'programaAcademico':
        return vacio(f.programaAcademico) ? 'Seleccione el programa académico.' : '';
      case 'correo': {
        const r = validateInstitutionalEmail(f.correo);
        return r.valid ? '' : r.error || 'Correo institucional inválido.';
      }
      case 'password': {
        if (vacio(f.password)) return 'La contraseña es obligatoria.';
        return getPasswordValidationError((f.password ?? '').trim(), (f.numeroIdentificacion ?? '').trim()) ?? '';
      }
      default:
        return '';
    }
  }

  guardarCoordinador(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.intentoGuardar.set(true);
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

    if (!this.formData.programaAcademico || !this.formData.programaAcademico.trim()) {
      this.toast.warning('El campo Programa Académico es obligatorio.');
      return;
    }

    if (!this.formData.password || !this.formData.password.trim()) {
      this.toast.warning('El campo Contraseña Inicial IAM es obligatorio.');
      return;
    }

    const passwordError = getPasswordValidationError(this.formData.password.trim(), this.formData.numeroIdentificacion.trim());
    if (passwordError) {
      this.toast.warning(passwordError);
      return;
    }

    this.formData.nombres = [pn, (this.formData.segundoNombre || '').trim()].filter(Boolean).join(' ');
    this.formData.apellidos = [pa, (this.formData.segundoApellido || '').trim()].filter(Boolean).join(' ');

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let idProgramaSeleccionado: string | null = null;
    if (this.formData.programaAcademico === 'SIN_PROGRAMA') {
      idProgramaSeleccionado = null;
    } else {
      const progMatch = this.programasAcademicos().find(
        (p) => p.nombre === this.formData.programaAcademico || p.id === this.formData.programaAcademico
      );
      idProgramaSeleccionado = progMatch && uuidRegex.test(progMatch.id) ? progMatch.id : null;
    }

    const payload = {
      numeroIdentificacion: this.formData.numeroIdentificacion.trim(),
      primerNombre: pn,
      segundoNombre: (this.formData.segundoNombre || '').trim(),
      primerApellido: pa,
      segundoApellido: (this.formData.segundoApellido || '').trim(),
      correo: this.formData.correo.trim(),
      idPrograma: idProgramaSeleccionado,
      password: (this.formData.password || '').trim() || undefined,
    };

    this.isSubmitting.set(true);
    this.deanService.createCoordinador(payload).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || 'Coordinador registrado exitosamente.');
          this.ultimaCuentaRegistrada.set(payload.correo);
          this.cargarCoordinadores({ numeroIdentificacion: payload.numeroIdentificacion, correo: payload.correo });
          this.volverALista();
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  abrirModalSeleccionarCoordinador(): void {
    this.isPickerModalOpen.set(true);
  }

  onSolicitarRegistroNuevo(): void {
    this.isPickerModalOpen.set(false);
    this.abrirFormularioRegistro();
  }

  onCoordinadorSeleccionadoDelDirectorio(user: UserPickerItem): void {
    this.isPickerModalOpen.set(false);

    // Si ya existe como coordinador
    const yaExiste = this.coordinadores().some(
      (c) =>
        c.id === user.id ||
        (c.numeroIdentificacion && c.numeroIdentificacion === user.numeroIdentificacion) ||
        (c.correo && user.correo && c.correo.toLowerCase() === user.correo.toLowerCase())
    );

    if (yaExiste) {
      this.toast.info(`El profesional ${user.nombres} ${user.apellidos} ya coordina un programa académico.`);
      return;
    }

    this.abrirFormularioRegistro();
    this.formData.tipoIdentificacionId =
      this.tiposIdentificacion().find((t) => t.tipoIdentificacion === user.tipoIdentificacion)?.id ||
      (this.tiposIdentificacion().length > 0
        ? this.tiposIdentificacion()[0].id
        : 'A1B2C3D4-0000-0000-0000-000000000001');
    this.formData.tipoIdentificacion = user.tipoIdentificacion || 'CC';
    this.formData.numeroIdentificacion = String(user.numeroIdentificacion || '');
    this.formData.primerNombre = user.primerNombre || user.nombres.split(' ')[0] || '';
    this.formData.segundoNombre = user.segundoNombre || '';
    this.formData.primerApellido = user.primerApellido || user.apellidos.split(' ')[0] || '';
    this.formData.segundoApellido = user.segundoApellido || '';
    this.formData.correo = user.correo || '';
    this.formData.programaAcademico = 'SIN_PROGRAMA';
    this.formData.idPrograma = null;
    this.toast.info(`Datos de ${user.nombres} ${user.apellidos} precargados. Confirme el programa y guarde.`);
  }
}

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CatalogService, TipoIdentificacionItem, FacultadItem } from '../../../core/services/catalog.service';
import { DecanoItem, InstitucionItem } from '../../../core/models/role-management.model';
import { CardComponent } from '../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ActionMenuComponent, ActionMenuItem } from '../../../shared/components/action-menu/action-menu.component';
import { SelectorModoComponent, OpcionModo } from '../../../shared/components/selector-modo/selector-modo.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { UserPickerModalComponent, UserPickerItem } from '../../../shared/components/user-picker-modal/user-picker-modal.component';
import { AccountAccessStatusComponent } from '../../../shared/components/account-access-status/account-access-status.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { parseIdentificationNumber, validateInstitutionalEmail } from '../../../core/validation/request-form-validation.util';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { finalize } from 'rxjs';
import { IdentidadEsperada, UltimaPeticion, advertirRegistroNoListado } from '../../../core/utils/registro-confirmado.util';
import { CorreccionIdentidadService } from '../../../core/services/correccion-identidad.service';
import { CorregirIdentidadPayload, IdentidadActual } from '../../../core/models/correccion-identidad.model';
import { CorreccionIdentidadModalComponent } from '../../../shared/components/correccion-identidad-modal/correccion-identidad-modal.component';
import { CargaMasivaUsuariosComponent } from '../../../shared/components/carga-masiva-usuarios/carga-masiva-usuarios.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';

type VistaAdmin = 'LISTA' | 'REGISTRO';

/** Cómo se resuelve la facultad del decano al registrarlo. */
export type ModoFacultad = 'CREAR' | 'VINCULAR' | 'SIN';

const NOMBRE_FACULTAD_MIN = 3;
const NOMBRE_FACULTAD_MAX = 50;

@Component({
  selector: 'app-admin-decanos',
  standalone: true,
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
    CorreccionIdentidadModalComponent,
    CargaMasivaUsuariosComponent,
    SelectorModoComponent,
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

          <div class="flex items-center gap-3" data-testid="acciones-encabezado">
            <app-button variant="primary" size="md" (clicked)="abrirModalSeleccionarDecano()">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Nombrar Decano Existente
            </app-button>
            <app-action-menu label="Más acciones" [items]="accionesEncabezado" (selected)="alElegirAccion($event)" />
          </div>
        </div>

        @if (mostrarCargaMasiva()) {
          <app-carga-masiva-usuarios
            destino="DECANO"
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
              <input aria-label="Buscar decano por nombre, cédula o facultad"
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
            <select aria-label="Filtrar decanos por estado"
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
                      <!-- HU159: el administrador corrige los datos de identidad del decano -->
                      <button
                        type="button"
                        data-accion="corregir-identidad"
                        (click)="decanoACorregir.set(decano)"
                        class="text-xs px-2.5 py-1 rounded-lg border border-warm-200 hover:bg-warm-100 text-warm-700 transition-colors"
                      >
                        Corregir datos
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
              Ingresa los datos personales para dar de alta la autoridad académica institucional y define su facultad en el mismo paso.
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
              <app-form-field label="Teléfono de Contacto (Opcional)">
                <input
                  type="text"
                  [(ngModel)]="formData.telefono"
                  name="telefono"
                  placeholder="ej. +57 300 123 4567"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </app-form-field>
              <app-form-field label="Contraseña Inicial de Acceso" [required]="true" [helperText]="'Mínimo 12 caracteres (mayúscula, minúscula, número y símbolo).'">
                <input
                  type="text"
                  [(ngModel)]="formData.password"
                  name="password"
                  required
                  placeholder="Ingrese una contraseña segura (mín. 12 car.)"
                  class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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

            <fieldset class="space-y-4 p-4 rounded-2xl border border-warm-200 bg-warm-50/60" data-testid="seccion-facultad">
              <legend class="px-2 text-sm font-bold text-warm-800">Facultad</legend>
              <app-selector-modo etiqueta="Facultad del decano" [opciones]="opcionesModoFacultad" [(valor)]="modoFacultad" />

              @switch (modoFacultad()) {
                @case ('CREAR') {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="facultad-crear">
                    <app-form-field label="Nombre de la facultad" [required]="true" [helperText]="'Entre 3 y 50 caracteres.'" [errorMessage]="errorNombreFacultad()">
                      <input
                        type="text"
                        [(ngModel)]="facultadNueva.nombre"
                        name="facultadNombre"
                        maxlength="50"
                        placeholder="ej. Facultad de Ingeniería"
                        class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </app-form-field>
                    <app-form-field label="Código (Opcional)">
                      <input
                        type="text"
                        [(ngModel)]="facultadNueva.codigo"
                        name="facultadCodigo"
                        placeholder="ej. ING"
                        class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </app-form-field>
                    <div class="sm:col-span-2">
                      <app-form-field label="Institución" [required]="true">
                        <select
                          [(ngModel)]="facultadNueva.idInstitucion"
                          name="facultadInstitucion"
                          class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                          <option value="">-- Selecciona una institución --</option>
                          @for (inst of instituciones(); track inst.id) {
                            <option [value]="inst.id">{{ inst.nombre }}</option>
                          }
                        </select>
                      </app-form-field>
                    </div>
                  </div>
                }
                @case ('VINCULAR') {
                  <div data-testid="facultad-vincular">
                    <app-form-field label="Facultad existente" [required]="true">
                      <select
                        [(ngModel)]="idFacultadExistente"
                        name="facultadExistente"
                        class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      >
                        <option value="">-- Selecciona una facultad --</option>
                        @for (fac of facultades(); track fac.id) {
                          <option [value]="fac.id">{{ fac.nombre }}</option>
                        }
                      </select>
                    </app-form-field>
                  </div>
                }
                @case ('SIN') {
                  <p class="text-xs text-warm-600" data-testid="facultad-sin">
                    El decano se registra sin facultad. Podrás asociarla más adelante.
                  </p>
                }
              }
            </fieldset>

            <div class="flex items-center justify-end gap-3 pt-5 border-t border-warm-100">
              <app-button variant="secondary" size="md" type="button" (clicked)="volverALista()">
                Cancelar
              </app-button>
              <app-button variant="primary" size="md" type="submit" [loading]="isSubmitting()" [disabled]="!formularioValido() || isSubmitting()">
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

      @if (decanoACorregir(); as d) {
        <app-correccion-identidad-modal
          titulo="Corregir datos del decano"
          [actual]="identidadDe(d)"
          [guardando]="guardandoCorreccion()"
          [error]="errorCorreccion()"
          (guardar)="corregirDecano(d, $event)"
          (cancelar)="cerrarCorreccion()"
        />
      }
    </div>
  `,
})
export class AdminDecanosComponent implements OnInit {
  private adminService = inject(AdminManagementService);
  private catalogService = inject(CatalogService);
  private toast = inject(ToastService);
  private sessionTimeZone = inject(SessionTimeZoneService);
  private correccionIdentidad = inject(CorreccionIdentidadService);

  /** HU159: decano cuya identidad se corrige (null = modal cerrado). */
  decanoACorregir = signal<DecanoItem | null>(null);
  guardandoCorreccion = signal(false);
  errorCorreccion = signal<string | null>(null);

  isPickerModalOpen = signal<boolean>(false);
  /** Correo de la ultima cuenta registrada: el panel consulta su estado de acceso real. */
  ultimaCuentaRegistrada = signal<string | null>(null);
  vistaActual = signal<VistaAdmin>('LISTA');
  decanos = signal<DecanoItem[]>([]);
  tiposIdentificacion = signal<TipoIdentificacionItem[]>([]);
  facultades = signal<FacultadItem[]>([]);
  readonly instituciones = this.adminService.instituciones;

  readonly opcionesModoFacultad: OpcionModo<ModoFacultad>[] = [
    { valor: 'CREAR', etiqueta: 'Crear facultad nueva' },
    { valor: 'VINCULAR', etiqueta: 'Vincular facultad existente' },
    { valor: 'SIN', etiqueta: 'Sin facultad por ahora' },
  ];
  modoFacultad = signal<ModoFacultad>('CREAR');
  facultadNueva = { nombre: '', codigo: '', idInstitucion: '' };
  idFacultadExistente = '';
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
  searchQuery = '';
  selectedEstado = 'TODOS';
  private readonly ultimaPeticionDecanos = new UltimaPeticion();

  formData: Omit<DecanoItem, 'id'> & { password?: string } = {
    tipoIdentificacionId: '',
    tipoIdentificacion: '',
    numeroIdentificacion: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    nombres: '',
    apellidos: '',
    correo: '',
    facultad: 'Sin Facultad Asignada',
    idFacultad: null,
    telefono: '',
    fechaAsignacion: this.sessionTimeZone.currentDate(),
    estado: 'ACTIVO',
    password: '',
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

  identidadDe(d: DecanoItem): IdentidadActual {
    const nombres = d.nombres?.trim().split(/\s+/).filter(Boolean) ?? [];
    const apellidos = d.apellidos?.trim().split(/\s+/).filter(Boolean) ?? [];
    return {
      primerNombre: d.primerNombre ?? nombres[0] ?? '',
      segundoNombre: d.segundoNombre ?? (nombres.slice(1).join(' ') || null),
      primerApellido: d.primerApellido ?? apellidos[0] ?? '',
      segundoApellido: d.segundoApellido ?? (apellidos.slice(1).join(' ') || null),
      numeroIdentificacion: d.numeroIdentificacion,
      codigoTipoIdentificacion: d.tipoIdentificacion ?? null,
      idTipoIdentificacion: d.tipoIdentificacionId ?? null,
    };
  }

  corregirDecano(d: DecanoItem, payload: CorregirIdentidadPayload): void {
    this.guardandoCorreccion.set(true);
    this.errorCorreccion.set(null);
    this.correccionIdentidad.corregirDecano(d.id, payload).subscribe({
      next: (r) => {
        this.guardandoCorreccion.set(false);
        this.decanoACorregir.set(null);
        if (r.datos?.sincronizacionIdentidad === 'PENDIENTE') {
          this.toast.warning(r.datos.mensajeUsuario ?? mensajeUi('UI_ADMIN_DECANOS_001'));
        } else {
          this.toast.success(mensajeUi('UI_ADMIN_DECANOS_002'));
        }
        this.cargarDecanos();
      },
      error: (e) => {
        this.guardandoCorreccion.set(false);
        this.errorCorreccion.set(getApiErrorMessage(e));
      },
    });
  }

  cerrarCorreccion(): void {
    this.decanoACorregir.set(null);
    this.errorCorreccion.set(null);
  }

  onCargaMasivaCompletada(): void {
    this.cargarDecanos();
  }

  ngOnInit(): void {
    this.cargarTiposIdentificacion();
    this.cargarFacultades();
    this.cargarInstituciones();
    this.cargarDecanos();
  }

  cargarInstituciones(): void {
    this.adminService.getInstituciones().subscribe({
      next: (res) => this.preseleccionarInstitucion(res.datos ?? []),
      error: (err) => this.toast.warning(getApiErrorMessage(err)),
    });
  }

  private preseleccionarInstitucion(lista: InstitucionItem[]): void {
    if (lista.length === 1 && !this.facultadNueva.idInstitucion) {
      this.facultadNueva.idInstitucion = lista[0].id;
    }
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

  cargarDecanos(identidadEsperada?: IdentidadEsperada): void {
    const peticion = this.ultimaPeticionDecanos.iniciar();
    this.isLoading.set(true);
    this.adminService.getDecanos().subscribe({
      next: (res) => {
        if (!this.ultimaPeticionDecanos.esVigente(peticion)) {
          return;
        }
        const datos = res.datos || [];
        this.decanos.set(datos);
        this.isLoading.set(false);
        advertirRegistroNoListado(datos, identidadEsperada, (aviso) => this.toast.warning(aviso));
      },
      error: (err) => {
        if (!this.ultimaPeticionDecanos.esVigente(peticion)) {
          return;
        }
        this.isLoading.set(false);
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }

  toggleEstado(decano: DecanoItem): void {
    this.adminService.toggleDecanoStatus(decano.id).subscribe({
      next: (res) => {
        if (res.exitoso && res.datos) {
          const updated = this.decanos().map((d) => (d.id === decano.id ? res.datos! : d));
          this.decanos.set(updated);
          this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_DECANOS_003'));
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  abrirFormularioRegistro(): void {
    this.formData = {
      tipoIdentificacionId: this.tiposIdentificacion().length > 0 ? this.tiposIdentificacion()[0].id : '',
      tipoIdentificacion: this.tiposIdentificacion().length > 0 ? this.tiposIdentificacion()[0].tipoIdentificacion : '',
      numeroIdentificacion: '',
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      nombres: '',
      apellidos: '',
      correo: '',
      facultad: 'Sin Facultad Asignada',
      idFacultad: null,
      telefono: '',
      fechaAsignacion: this.sessionTimeZone.currentDate(),
      estado: 'ACTIVO',
      password: '',
    };
    this.modoFacultad.set('CREAR');
    this.facultadNueva = { nombre: '', codigo: '', idInstitucion: '' };
    this.idFacultadExistente = '';
    this.preseleccionarInstitucion(this.instituciones());
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

  /** Mensaje del nombre de facultad nueva; vacío si es válido o aún no se escribió. */
  errorNombreFacultad(): string {
    const nombre = this.facultadNueva.nombre.trim();
    if (!nombre) {
      return '';
    }
    return nombre.length < NOMBRE_FACULTAD_MIN || nombre.length > NOMBRE_FACULTAD_MAX
      ? mensajeUi('UI_ADMIN_DECANOS_012')
      : '';
  }

  /** Primer problema de la sección Facultad según el modo elegido; null si es válida. */
  errorFacultad(): string | null {
    switch (this.modoFacultad()) {
      case 'CREAR': {
        const nombre = this.facultadNueva.nombre.trim();
        if (nombre.length < NOMBRE_FACULTAD_MIN || nombre.length > NOMBRE_FACULTAD_MAX) {
          return mensajeUi('UI_ADMIN_DECANOS_013');
        }
        return this.facultadNueva.idInstitucion ? null : mensajeUi('UI_ADMIN_DECANOS_014');
      }
      case 'VINCULAR':
        return this.idFacultadExistente ? null : mensajeUi('UI_ADMIN_DECANOS_015');
      default:
        return null;
    }
  }

  /** Habilita Guardar solo cuando datos personales, acceso y facultad son válidos. */
  formularioValido(): boolean {
    const f = this.formData;
    return (
      !!f.tipoIdentificacionId &&
      parseIdentificationNumber(f.numeroIdentificacion).valid &&
      !!(f.primerNombre || '').trim() &&
      !!(f.primerApellido || '').trim() &&
      validateInstitutionalEmail(f.correo).valid &&
      !!(f.password || '').trim() &&
      this.errorFacultad() === null
    );
  }

  private facultadParaPayload(): { idFacultad: string | null; facultadNueva: { nombre: string; codigo?: string; idInstitucion: string } | null } {
    switch (this.modoFacultad()) {
      case 'CREAR': {
        const codigo = this.facultadNueva.codigo.trim();
        return {
          idFacultad: null,
          facultadNueva: {
            nombre: this.facultadNueva.nombre.trim(),
            ...(codigo ? { codigo } : {}),
            idInstitucion: this.facultadNueva.idInstitucion,
          },
        };
      }
      case 'VINCULAR':
        return { idFacultad: this.idFacultadExistente, facultadNueva: null };
      default:
        return { idFacultad: null, facultadNueva: null };
    }
  }

  guardarDecano(): void {
    if (this.isSubmitting()) {
      return;
    }
    if (!this.formData.tipoIdentificacionId) {
      this.toast.warning(mensajeUi('UI_ADMIN_DECANOS_004'));
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
      this.toast.warning(mensajeUi('UI_ADMIN_DECANOS_005'));
      return;
    }
    if (!pa) {
      this.toast.warning(mensajeUi('UI_ADMIN_DECANOS_006'));
      return;
    }

    const emailResult = validateInstitutionalEmail(this.formData.correo);
    if (!emailResult.valid) {
      this.toast.warning(emailResult.error || mensajeUi('UI_ADMIN_DECANOS_007'));
      return;
    }

    const pwd = (this.formData.password || '').trim();
    if (!pwd) {
      this.toast.warning(mensajeUi('UI_ADMIN_DECANOS_008'));
      return;
    }

    const errorFacultad = this.errorFacultad();
    if (errorFacultad) {
      this.toast.warning(errorFacultad);
      return;
    }

    this.formData.nombres = [pn, (this.formData.segundoNombre || '').trim()].filter(Boolean).join(' ');
    this.formData.apellidos = [pa, (this.formData.segundoApellido || '').trim()].filter(Boolean).join(' ');

    const payload = {
      tipoIdentificacionId: this.formData.tipoIdentificacionId,
      numeroIdentificacion: Number(this.formData.numeroIdentificacion),
      primerNombre: pn,
      segundoNombre: (this.formData.segundoNombre || '').trim(),
      primerApellido: pa,
      segundoApellido: (this.formData.segundoApellido || '').trim(),
      correo: this.formData.correo.trim(),
      password: pwd,
      ...this.facultadParaPayload(),
    };

    this.isSubmitting.set(true);
    this.adminService.createDecano(payload).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_DECANOS_009'));
          this.ultimaCuentaRegistrada.set(payload.correo);
          this.cargarDecanos({ numeroIdentificacion: String(payload.numeroIdentificacion), correo: payload.correo });
          this.cargarFacultades();
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
      this.toast.info(mensajeUi('UI_ADMIN_DECANOS_010', { nombres: user.nombres, apellidos: user.apellidos }));
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
    this.formData.password = '';
    this.toast.info(mensajeUi('UI_ADMIN_DECANOS_011', { nombres: user.nombres, apellidos: user.apellidos }));
  }
}

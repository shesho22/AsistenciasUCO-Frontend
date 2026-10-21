import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import {
  DecanoItem,
  InstitucionItem,
  FacultadItem,
  PlanEstudioItem,
  AsignaturaPlanItem,
} from '../../../core/models/role-management.model';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

type VistaFacultad = 'LISTA' | 'FORM';
type FiltroEstadoFacultad = 'TODOS' | 'ACTIVO' | 'INACTIVO';

@Component({
  selector: 'app-admin-facultades',
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
            <span class="text-primary-700">Gobierno Universitario</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-serif font-bold text-warm-900 tracking-tight">
            Gestión de Facultades
          </h1>
          <p class="text-sm text-warm-600 mt-0.5">
            Administración de facultades institucionales, estructura académica y asignación de decanos titulares.
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
            <span>Nueva Facultad</span>
          </button>
        }
      </div>

      <!-- ================= BENTO GRID OVERVIEW (SOLO EN VISTA LISTA) ================= -->
      @if (vista() === 'LISTA') {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total Facultades -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Total Facultades</span>
              <div class="p-2 rounded-xl bg-primary-50 text-primary-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div class="text-2xl font-bold font-serif text-warm-900">{{ facultades().length }}</div>
            <p class="text-[11px] text-warm-500 mt-1">Registradas institucionalmente</p>
          </div>

          <!-- Facultades Activas -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Activas</span>
              <div class="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="text-2xl font-bold font-serif text-emerald-800">{{ totalActivas() }}</div>
            <p class="text-[11px] text-warm-500 mt-1">En operación académica</p>
          </div>

          <!-- Facultades Inactivas -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Inactivas</span>
              <div class="p-2 rounded-xl bg-amber-50 text-amber-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
            <div class="text-2xl font-bold font-serif text-amber-800">{{ totalInactivas() }}</div>
            <p class="text-[11px] text-warm-500 mt-1">Fuera de oferta académica</p>
          </div>

          <!-- Con Decano Titular -->
          <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Decanaturas</span>
              <div class="p-2 rounded-xl bg-blue-50 text-blue-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div class="text-2xl font-bold font-serif text-blue-900">{{ totalConDecano() }}</div>
            <p class="text-[11px] text-warm-500 mt-1">Titulares designados</p>
          </div>
        </div>

        <!-- ================= TOOLBAR: BÚSQUEDA Y FILTROS ================= -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <!-- SEARCH BAR -->
          <div class="relative flex-1">
            <input
              type="text"
              [ngModel]="filtroTexto()"
              (ngModelChange)="filtroTexto.set($event)"
              placeholder="Buscar facultad por nombre o decano..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 bg-white"
            />
            <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <!-- SELECT DE FILTRO DE ESTADO -->
          <div class="flex items-center gap-2">
            <select
              [ngModel]="filtroEstado()"
              (ngModelChange)="filtroEstado.set($event)"
              class="px-3 py-2.5 rounded-xl border border-warm-200 text-xs font-semibold bg-white text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Solo Activas</option>
              <option value="INACTIVO">Solo Inactivas</option>
            </select>
          </div>
        </div>

        <!-- ================= LISTADO DE FACULTADES ================= -->
        @if (pagedFacultades().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
            <div class="w-12 h-12 rounded-full bg-warm-100 text-warm-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-warm-900">No se encontraron facultades</h3>
            <p class="text-xs text-warm-500 mt-1">Prueba con otros términos de búsqueda o ajusta los filtros.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (fac of pagedFacultades(); track fac.id) {
              <div class="bg-white border border-warm-200 rounded-2xl p-5 shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between h-full">
                <div>
                  <!-- Encabezado de Tarjeta -->
                  <div class="flex items-start justify-between gap-3 mb-2.5">
                    <h3 class="font-serif font-bold text-warm-900 text-base leading-snug">{{ fac.nombre }}</h3>
                    <span
                      class="text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0"
                      [class]="fac.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ fac.estado }}
                    </span>
                  </div>

                  <!-- SECCIÓN DECANATO: ASIGNACIÓN Y GOBIERNO INSTITUCIONAL -->
                  <div class="p-3.5 rounded-xl border mb-4 bg-warm-50/70 border-warm-200/80">
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-warm-500">
                        Decanatura
                      </span>
                      <span class="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Titular Asignado
                      </span>
                    </div>

                    <div class="flex items-center gap-2 mb-2">
                      <svg class="w-4 h-4 text-warm-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p class="text-xs font-bold text-warm-900 truncate">{{ fac.decanoNombre }}</p>
                    </div>

                    <div class="flex items-center pt-1 border-t border-warm-200/60">
                      <button
                        type="button"
                        (click)="abrirModalVincularDecano(fac)"
                        class="text-[11px] font-semibold text-primary-700 hover:text-primary-900 transition-colors flex items-center gap-1"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Cambiar Decano(a)</span>
                      </button>
                    </div>
                  </div>

                  <!-- Métricas Académicas -->
                  <div class="grid grid-cols-2 gap-3 py-2.5 border-t border-warm-100 mb-4 bg-warm-50/50 rounded-xl px-3">
                    <div>
                      <span class="text-[10px] text-warm-500 font-semibold uppercase block">Programas</span>
                      <span class="text-sm font-bold text-warm-900">{{ fac.totalProgramas || 4 }}</span>
                    </div>
                    <div>
                      <span class="text-[10px] text-warm-500 font-semibold uppercase block">Estudiantes</span>
                      <span class="text-sm font-bold text-warm-900">{{ fac.totalEstudiantes || 320 }}</span>
                    </div>
                  </div>
                </div>

                <!-- Botonera de Acciones -->
                <div class="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    (click)="verProgramasFacultad(fac)"
                    class="w-full py-2 px-3 bg-primary-50 hover:bg-primary-100 text-primary-900 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg class="w-3.5 h-3.5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Ver Programas y Planes (HU108)</span>
                  </button>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="editarFacultad(fac)"
                      class="flex-1 py-2 px-3 bg-warm-100 hover:bg-warm-200 text-warm-800 rounded-xl text-xs font-semibold transition-colors text-center"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      (click)="toggleEstadoFacultad(fac)"
                      class="p-2 text-warm-500 hover:text-warm-800 hover:bg-warm-100 rounded-xl transition-colors"
                      [title]="fac.estado === 'ACTIVO' ? 'Desactivar Facultad' : 'Activar Facultad'"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Paginación -->
          @if (facultadesFiltradas().length > pageSize()) {
            <div class="mt-6 flex justify-center">
              <app-pagination
                [currentPage]="currentPage()"
                [totalItems]="facultadesFiltradas().length"
                [pageSize]="pageSize()"
                (pageChange)="currentPage.set($event)"
              />
            </div>
          }
        }
      }

      <!-- ================= 2. FORMULARIO: CREAR / EDITAR FACULTAD ================= -->
      @if (vista() === 'FORM') {
        <div class="bg-white border border-warm-200 rounded-2xl p-6 sm:p-8 shadow-warm-sm max-w-xl mx-auto space-y-6">
          <div class="flex items-center justify-between pb-4 border-b border-warm-100">
            <div>
              <h2 class="text-xl font-serif font-bold text-warm-900">
                {{ facultadEnEdicion ? 'Editar Facultad' : 'Registrar Nueva Facultad' }}
              </h2>
              <p class="text-xs text-warm-600 mt-0.5">
                {{ facultadEnEdicion ? 'Modifica los datos institucionales de la facultad.' : 'Registra la estructura de la facultad y designa su decano(a) titular correspondiente.' }}
              </p>
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
            <!-- Institución -->
            <div>
              <label class="block text-xs font-bold text-warm-700 uppercase mb-1">Institución Adscrita</label>
              <select
                [(ngModel)]="formFacultad.idInstitucion"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 bg-white"
              >
                @if (instituciones().length === 0) {
                  <option value="">Cargando instituciones...</option>
                }
                @for (inst of instituciones(); track inst.id) {
                  <option [value]="inst.id">{{ inst.nombre }}</option>
                }
              </select>
            </div>

            <!-- Nombre de la Facultad -->
            <div>
              <label class="block text-xs font-bold text-warm-700 uppercase mb-1">Nombre de la Facultad *</label>
              <input
                type="text"
                [(ngModel)]="formFacultad.nombre"
                placeholder="Ej: Facultad de Ciencias de la Salud"
                maxlength="50"
                class="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
                [class.border-red-300]="nombreDuplicado()"
                [class.border-warm-200]="!nombreDuplicado()"
              />
              @if (nombreDuplicado()) {
                <p class="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Ya existe una facultad con este nombre en la institución.</span>
                </p>
              } @else {
                <p class="text-[10px] text-warm-500 mt-1">Obligatorio (entre 3 y 50 caracteres institucionales).</p>
              }
            </div>

            <!-- Decano(a) Titular Asignado -->
            <div>
              <label class="block text-xs font-bold text-warm-700 uppercase mb-1">Decano(a) Titular Asignado *</label>
              <select
                [(ngModel)]="formFacultad.idDecano"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 bg-white"
              >
                <option value="">-- Seleccionar Decano(a) Titular --</option>
                @for (dec of decanos(); track dec.id) {
                  <option [value]="dec.id">
                    {{ dec.nombreCompleto || (dec.nombres + ' ' + dec.apellidos).trim() }} (CC {{ dec.numeroIdentificacion }}{{ dec.correo ? ' - ' + dec.correo : '' }})
                  </option>
                }
              </select>
              @if (decanos().length === 0) {
                <p class="text-[11px] text-amber-600 mt-1">
                  No hay decanos registrados en el directorio central.
                </p>
              } @else {
                <p class="text-[10px] text-warm-500 mt-1">
                  Requisito normativo: toda facultad institucional debe contar con un decano titular designado.
                </p>
              }
            </div>

            <!-- Botonera de Guardado -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-warm-100">
              <button
                type="button"
                [disabled]="guardando()"
                (click)="vista.set('LISTA')"
                class="px-4 py-2 text-xs font-semibold text-warm-600 hover:text-warm-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                [disabled]="!formFacultad.nombre.trim() || formFacultad.nombre.trim().length < 3 || !formFacultad.idDecano || nombreDuplicado() || guardando()"
                (click)="guardar()"
                class="px-5 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
              >
                @if (guardando()) {
                  <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Guardando...</span>
                } @else {
                  <span>{{ facultadEnEdicion ? 'Actualizar Facultad' : 'Guardar Facultad' }}</span>
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ================= MODAL: CAMBIAR DECANO ================= -->
      @if (facultadParaDecano()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-950/40 backdrop-blur-xs animate-fade-in">
          <div class="bg-white border border-warm-200 rounded-3xl max-w-md w-full shadow-warm-xl overflow-hidden animate-slide-down">
            <div class="p-6 bg-warm-50 border-b border-warm-200/80 flex items-start justify-between">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-primary-800 bg-primary-100 px-2.5 py-0.5 rounded-full border border-primary-200">
                  Gobierno Académico
                </span>
                <h3 class="text-lg font-serif font-bold text-warm-900 mt-2">
                  Cambiar Decano(a) Titular
                </h3>
                <p class="text-xs text-warm-600 mt-0.5">
                  Facultad: <span class="font-bold text-warm-900">{{ facultadParaDecano()?.nombre }}</span>
                </p>
              </div>
              <button
                type="button"
                (click)="cerrarModalDecano()"
                class="p-1.5 rounded-full text-warm-400 hover:text-warm-700 hover:bg-warm-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-bold text-warm-700 uppercase mb-1">
                  Seleccionar Decano(a) del Directorio
                </label>
                <select
                  [(ngModel)]="decanoSeleccionadoId"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 bg-white"
                >
                  <option value="">-- Seleccionar Profesional --</option>
                  @for (dec of decanos(); track dec.id) {
                    <option [value]="dec.id">
                      {{ dec.nombreCompleto || (dec.nombres + ' ' + dec.apellidos).trim() }} ({{ dec.tipoIdentificacion || 'CC' }} {{ dec.numeroIdentificacion }})
                    </option>
                  }
                </select>
                @if (decanos().length === 0) {
                  <p class="text-[11px] text-amber-600 mt-1.5">
                    No hay decanos registrados en el directorio central. Puedes registrar nuevos en la vista de Decanos.
                  </p>
                }
              </div>

              <!-- Vista previa del decano seleccionado -->
              @if (decanoSeleccionadoObjeto()) {
                <div class="p-3 rounded-xl bg-warm-50 border border-warm-200 text-xs space-y-1">
                  <p class="font-bold text-warm-900">
                    {{ decanoSeleccionadoObjeto()?.nombreCompleto || (decanoSeleccionadoObjeto()?.nombres + ' ' + decanoSeleccionadoObjeto()?.apellidos) }}
                  </p>
                  <p class="text-warm-600">
                    <span class="text-warm-400">Documento:</span> {{ decanoSeleccionadoObjeto()?.tipoIdentificacion || 'CC' }} {{ decanoSeleccionadoObjeto()?.numeroIdentificacion }}
                  </p>
                  @if (decanoSeleccionadoObjeto()?.correo) {
                    <p class="text-warm-600 truncate">
                      <span class="text-warm-400">Correo:</span> {{ decanoSeleccionadoObjeto()?.correo }}
                    </p>
                  }
                </div>
              }

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-warm-100">
                <button
                  type="button"
                  (click)="cerrarModalDecano()"
                  class="px-4 py-2 text-xs font-semibold text-warm-600 hover:text-warm-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  [disabled]="!decanoSeleccionadoId"
                  (click)="confirmarAsignacionDecano()"
                  class="px-5 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  Asignar a Facultad
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ================= MODAL: VER PROGRAMAS Y PLANES DE ESTUDIO (HU108) ================= -->
      @if (facultadSeleccionada()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-950/40 backdrop-blur-xs animate-fade-in">
          <div class="bg-white border border-warm-200 rounded-3xl max-w-3xl w-full shadow-warm-xl overflow-hidden animate-slide-down">
            <div class="p-6 bg-warm-50 border-b border-warm-200/80 flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-semibold text-primary-800 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200">
                    Estructura Curricular
                  </span>
                </div>
                <h3 class="text-xl font-serif font-bold text-warm-900">
                  {{ facultadSeleccionada()?.nombre }}
                </h3>
                <p class="text-xs text-warm-500 mt-0.5">
                  Decano(a): <span class="font-bold text-warm-800">{{ facultadSeleccionada()?.decanoNombre || 'Titular designado' }}</span>
                </p>
              </div>
              <button
                type="button"
                (click)="facultadSeleccionada.set(null)"
                class="p-2 rounded-full text-warm-400 hover:text-warm-700 hover:bg-warm-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-warm-500 mb-3">
                  Planes de Estudio Vigentes
                </h4>
                @if (planes().length === 0) {
                  <p class="text-xs text-warm-500 italic">No hay planes de estudio registrados para esta facultad.</p>
                } @else {
                  <div class="space-y-4">
                    @for (plan of planes(); track plan.id) {
                      <div class="p-4 rounded-2xl border border-warm-200 bg-warm-50/40 space-y-3">
                        <div class="flex items-center justify-between">
                          <div>
                            <span class="text-xs font-mono font-bold text-primary-800 bg-primary-50 px-2 py-0.5 rounded-md">
                              {{ plan.codigo }}
                            </span>
                            <span class="font-bold text-sm text-warm-900 ml-2">{{ plan.nombre }}</span>
                          </div>
                          <span class="text-xs font-bold text-warm-600">
                            {{ plan.totalCreditos }} créditos
                          </span>
                        </div>

                        <!-- Asignaturas del Plan -->
                        <div class="pt-2 border-t border-warm-100">
                          <span class="text-[10px] font-bold uppercase tracking-wider text-warm-400 block mb-2">
                            Malla Curricular
                          </span>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            @for (asig of getAsignaturasPlan(plan.id); track asig.id) {
                              <div class="flex items-center justify-between p-2 rounded-xl bg-white border border-warm-200/80 text-xs">
                                <span class="font-semibold text-warm-800 truncate">{{ asig.nombre }}</span>
                                <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-warm-100 text-warm-600">
                                  {{ asig.creditos }} cr.
                                </span>
                              </div>
                            }
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="p-4 bg-warm-50 border-t border-warm-200 flex justify-end">
              <button
                type="button"
                (click)="facultadSeleccionada.set(null)"
                class="px-5 py-2 bg-warm-200 hover:bg-warm-300 text-warm-800 text-xs font-bold rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminFacultadesComponent implements OnInit {
  private adminService = inject(AdminManagementService);
  private coordService = inject(CoordinatorManagementService);
  private toast = inject(ToastService);

  vista = signal<VistaFacultad>('LISTA');
  guardando = signal<boolean>(false);
  filtroTexto = signal('');
  filtroEstado = signal<FiltroEstadoFacultad>('TODOS');
  currentPage = signal(1);
  pageSize = signal(6);

  facultades = this.adminService.facultades;
  decanos = this.adminService.decanos;
  instituciones = this.adminService.instituciones;
  planes = this.coordService.planes;

  facultadEnEdicion: FacultadItem | null = null;
  facultadSeleccionada = signal<FacultadItem | null>(null);

  // Modal de asignación / cambio de decano
  facultadParaDecano = signal<FacultadItem | null>(null);
  decanoSeleccionadoId = '';

  // Formulario Facultad (DECANO OBLIGATORIO SEGÚN DB NOT NULL)
  formFacultad = {
    nombre: '',
    idInstitucion: '',
    idDecano: '',
    estado: 'ACTIVO' as 'ACTIVO' | 'INACTIVO',
  };

  // Métricas Bento
  totalActivas = computed(() => this.facultades().filter((f) => f.estado === 'ACTIVO').length);
  totalInactivas = computed(() => this.facultades().filter((f) => f.estado === 'INACTIVO').length);
  totalConDecano = computed(() => this.facultades().filter((f) => this.tieneDecano(f)).length);

  // Validación preventiva de unicidad de nombre de facultad
  nombreDuplicado = computed(() => {
    const nom = this.formFacultad.nombre.trim().toLowerCase();
    if (!nom) return false;
    return this.facultades().some(
      (f) => f.nombre.trim().toLowerCase() === nom && (!this.facultadEnEdicion || f.id !== this.facultadEnEdicion.id)
    );
  });

  facultadesFiltradas = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    const estado = this.filtroEstado();

    return this.facultades().filter((f) => {
      const matchTxt =
        !txt ||
        f.nombre.toLowerCase().includes(txt) ||
        (f.decanoNombre && f.decanoNombre.toLowerCase().includes(txt));

      let matchEstado = true;
      if (estado === 'ACTIVO') matchEstado = f.estado === 'ACTIVO';
      else if (estado === 'INACTIVO') matchEstado = f.estado === 'INACTIVO';

      return matchTxt && matchEstado;
    });
  });

  pagedFacultades = computed(() => {
    const list = this.facultadesFiltradas();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  decanoSeleccionadoObjeto = computed(() => {
    const id = this.decanoSeleccionadoId;
    if (!id) return null;
    return this.decanos().find((d) => d.id === id) || null;
  });

  ngOnInit(): void {
    this.coordService.cargarDatosAcademicosBase();
    this.adminService.cargarFacultades().subscribe();
    this.adminService.getDecanos().subscribe();
    this.adminService.getInstituciones().subscribe();
  }

  getAsignaturasPlan(planId: string): AsignaturaPlanItem[] {
    return this.coordService.getAsignaturasPlan(planId);
  }

  tieneDecano(fac: FacultadItem): boolean {
    if (!fac) return false;
    if (fac.decanoId && fac.decanoId.trim() !== '') return true;
    if (fac.decanoNombre && fac.decanoNombre.trim() !== '' && fac.decanoNombre !== 'Sin asignar' && fac.decanoNombre !== 'No asignado') {
      return true;
    }
    return false;
  }

  abrirFormularioCrear(): void {
    this.facultadEnEdicion = null;
    const inst = this.instituciones();
    const instId = inst.length > 0 ? inst[0].id : '';
    const decs = this.decanos();
    const decId = decs.length > 0 ? decs[0].id : '';
    this.formFacultad = {
      nombre: '',
      idInstitucion: instId,
      idDecano: decId,
      estado: 'ACTIVO',
    };
    this.vista.set('FORM');
  }

  editarFacultad(fac: FacultadItem): void {
    this.facultadEnEdicion = fac;
    const inst = this.instituciones();
    const instId = inst.length > 0 ? inst[0].id : '';
    this.formFacultad = {
      nombre: fac.nombre,
      idInstitucion: instId,
      idDecano: fac.decanoId || '',
      estado: fac.estado,
    };
    this.vista.set('FORM');
  }

  guardar(): void {
    const nombre = this.formFacultad.nombre.trim();
    const idDecano = this.formFacultad.idDecano;
    if (!nombre || nombre.length < 3 || !idDecano || this.nombreDuplicado() || this.guardando()) return;

    this.guardando.set(true);

    if (this.facultadEnEdicion) {
      this.adminService.actualizarFacultad(this.facultadEnEdicion.id, {
        nombre,
        decanoId: idDecano,
      });
      this.toast.success('Facultad actualizada correctamente.');
      this.guardando.set(false);
      this.vista.set('LISTA');
    } else {
      this.adminService
        .crearFacultad({
          nombre,
          idDecano,
          idInstitucion: this.formFacultad.idInstitucion || undefined,
        })
        .subscribe({
          next: (res) => {
            this.guardando.set(false);
            if (res.exitoso) {
              this.toast.success('Facultad registrada exitosamente.');
              this.vista.set('LISTA');
            } else {
              this.toast.error(res.mensajeUsuario || 'Error al registrar la facultad.');
            }
          },
          error: (err) => {
            this.guardando.set(false);
            if (err?.status === 409 || err?.error?.code === 'CONFLICT') {
              this.toast.error('Ya existe una facultad con este nombre en la institución (Conflicto 409).');
            } else {
              const msg =
                err?.error?.mensajeUsuario ||
                err?.error?.mensajeTecnico ||
                err?.message ||
                'Error al registrar la facultad en el servidor.';
              this.toast.error(msg);
            }
          },
        });
    }
  }

  toggleEstadoFacultad(fac: FacultadItem): void {
    this.adminService.cambiarEstadoFacultad(fac.id);
    this.toast.info(`Estado de la facultad cambiado a ${fac.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'}.`);
  }

  verProgramasFacultad(fac: FacultadItem): void {
    this.facultadSeleccionada.set(fac);
  }

  // ================= DECANATO: VINCULACIÓN / CAMBIO =================
  abrirModalVincularDecano(fac: FacultadItem): void {
    this.facultadParaDecano.set(fac);
    this.decanoSeleccionadoId = fac.decanoId || '';
  }

  cerrarModalDecano(): void {
    this.facultadParaDecano.set(null);
    this.decanoSeleccionadoId = '';
  }

  confirmarAsignacionDecano(): void {
    const fac = this.facultadParaDecano();
    const decano = this.decanoSeleccionadoObjeto();
    if (!fac || !decano) return;

    const decanoNombre = `${decano.nombres} ${decano.apellidos}`;

    this.adminService.asignarDecanoFacultad(fac.id, decano.id, decanoNombre).subscribe({
      next: () => {
        this.toast.success(`Decano(a) ${decanoNombre} asignado(a) exitosamente a ${fac.nombre}.`);
        this.cerrarModalDecano();
      },
      error: () => {
        this.toast.error('No se pudo asignar el decano en este momento.');
      },
    });
  }
}

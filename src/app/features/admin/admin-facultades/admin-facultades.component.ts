import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import {
  FacultadItem,
  ProgramaInstitucionDto,
} from '../../../core/models/role-management.model';
import { getBackendUserMessage } from '../../../core/api/errors/api-error.util';
import { ActionMenuComponent, ActionMenuItem } from '../../../shared/components/action-menu/action-menu.component';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  paginarEnCliente,
} from '../../../shared/components/tabla-datos/tabla-datos.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { getSafeTextError } from '../../../core/validation/form-fields.util';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

type VistaFacultad = 'LISTA' | 'FORM';
type FiltroEstadoFacultad = 'TODOS' | 'ACTIVO' | 'INACTIVO';

@Component({
    selector: 'app-admin-facultades',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalComponent, PageHeaderComponent, FormsModule, TablaDatosComponent, BadgeComponent, ActionMenuComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      <!-- ================= HEADER & BREADCRUMB ================= -->
      <app-page-header
        etiqueta="Administración Institucional"
        contexto="Gobierno Universitario"
        titulo="Gestión de Facultades"
        descripcion="Administración de facultades institucionales, estructura académica y asignación de decanos titulares."
      >
        @if (vista() === 'LISTA') {
          <button
            cabecera-acciones
            type="button"
            (click)="abrirFormularioCrear()"
            class="px-4 py-2.5 bg-primary-700 text-white rounded-xl text-sm font-semibold hover:bg-primary-800 shadow-sm transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nueva Facultad</span>
          </button>
        }
      </app-page-header>

      <!-- ================= BENTO GRID OVERVIEW (SOLO EN VISTA LISTA) ================= -->
      @if (vista() === 'LISTA') {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <!-- Total Facultades -->
          <div class="bg-white px-3 py-2 sm:p-4 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Total Facultades</span>
              <div class="p-2 rounded-xl bg-primary-50 text-primary-700">
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div class="text-xl font-bold font-serif text-warm-900">{{ facultades().length }}</div>
            <p class="text-[11px] text-warm-500 mt-1">Registradas institucionalmente</p>
          </div>

          <!-- Facultades Activas -->
          <div class="bg-white px-3 py-2 sm:p-4 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Activas</span>
              <div class="p-2 rounded-xl bg-success-50 text-success-700">
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="text-xl font-bold font-serif text-success-800">{{ totalActivas() }}</div>
            <p class="text-[11px] text-warm-500 mt-1">En operación académica</p>
          </div>

          <!-- Facultades Inactivas -->
          <div class="bg-white px-3 py-2 sm:p-4 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Inactivas</span>
              <div class="p-2 rounded-xl bg-warning-50 text-warning-700">
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
            <div class="text-xl font-bold font-serif text-warning-800">{{ totalInactivas() }}</div>
            <p class="text-[11px] text-warm-500 mt-1">Fuera de oferta académica</p>
          </div>

          <!-- Con Decano Titular -->
          <div class="bg-white px-3 py-2 sm:p-4 rounded-2xl border border-warm-200 shadow-warm-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500">Decanaturas</span>
              <div class="p-2 rounded-xl bg-info-50 text-info-700">
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div class="text-xl font-bold font-serif text-info-900">{{ totalConDecano() }}</div>
            <p class="text-[11px] text-warm-500 mt-1">Titulares designados</p>
          </div>
        </div>

        <!-- ================= TOOLBAR: BÚSQUEDA Y FILTROS ================= -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <!-- SEARCH BAR -->
          <div class="relative flex-1">
            <input aria-label="Buscar facultad por nombre"
              type="text"
              [ngModel]="filtroTexto()"
              (ngModelChange)="filtroTexto.set($event); currentPage.set(1)"
              placeholder="Buscar facultad por nombre o decano..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 bg-white"
            />
            <svg aria-hidden="true" class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <!-- SELECT DE FILTRO DE ESTADO -->
          <div class="flex items-center gap-2">
            <select aria-label="Filtrar facultades por estado"
              [ngModel]="filtroEstado()"
              (ngModelChange)="filtroEstado.set($event); currentPage.set(1)"
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
          <div class="superficie p-12 text-center">
            <div class="w-12 h-12 rounded-full bg-warm-100 text-warm-400 flex items-center justify-center mx-auto mb-3">
              <svg aria-hidden="true" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-warm-900">No se encontraron facultades</h3>
            <p class="text-xs text-warm-500 mt-1">Prueba con otros términos de búsqueda o ajusta los filtros.</p>
          </div>
        } @else {
          <app-tabla-datos
            etiqueta="Facultades"
            [columnas]="6"
            anchoMinimo="54rem"
            [paginada]="true"
            [totalItems]="facultadesFiltradas().length"
            [pagina]="currentPage()"
            [tamanoPagina]="pageSize()"
            (paginaChange)="currentPage.set($event)"
            (tamanoPaginaChange)="cambiarTamanoPagina($event)"
          >
            <thead>
              <tr>
                <th scope="col">Facultad</th>
                <th scope="col">Decano(a) titular</th>
                <th scope="col" class="text-right">Programas</th>
                <th scope="col" class="text-right">Estudiantes</th>
                <th scope="col">Estado</th>
                <th scope="col"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (fac of pagedFacultades(); track fac.id) {
                <tr data-testid="facultad-fila">
                  <td class="font-semibold text-warm-900">{{ fac.nombre }}</td>
                  <td>{{ fac.decanoNombre || '—' }}</td>
                  <td class="text-right tabular-nums">{{ totalProgramasDe(fac) ?? '—' }}</td>
                  <td class="text-right tabular-nums">{{ totalEstudiantesDe(fac) ?? '—' }}</td>
                  <td>
                    <app-badge [variant]="fac.estado === 'ACTIVO' ? 'success' : 'danger'" size="sm">{{ fac.estado }}</app-badge>
                  </td>
                  <td>
                    <!-- Una accion primaria y el resto en "Mas" -->
                    <div class="flex items-center justify-end gap-2" data-testid="acciones-facultad">
                      <button
                        type="button"
                        (click)="verProgramasFacultad(fac)"
                        class="min-h-[36px] py-1.5 px-3 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        Ver Programas
                      </button>
                      <app-action-menu
                        label="Más acciones de la facultad"
                        [items]="accionesFacultad(fac)"
                        (selected)="alElegirAccionFacultad(fac, $event)"
                      />
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </app-tabla-datos>
        }
      }

      <!-- ================= 2. FORMULARIO: CREAR / EDITAR FACULTAD ================= -->
      @if (vista() === 'FORM') {
        <div class="superficie p-4 sm:p-8 max-w-xl mx-auto space-y-4">
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
              <label for="fac-institucion" class="block text-xs font-bold text-warm-700 uppercase mb-1">Institución Adscrita</label>
              <select
                id="fac-institucion"
                [(ngModel)]="formFacultad.idInstitucion"
                [disabled]="facultadEnEdicion !== null"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 bg-white"
              >
                <option value="">{{ instituciones().length === 0 ? 'Cargando instituciones...' : '-- Seleccionar institución --' }}</option>
                @for (inst of instituciones(); track inst.id) {
                  <option [value]="inst.id">{{ inst.nombre }}</option>
                }
              </select>
            </div>

            <!-- Nombre de la Facultad -->
            <div>
              <label for="fac-nombre" class="block text-xs font-bold text-warm-700 uppercase mb-1">Nombre de la Facultad *</label>
              <input
                id="fac-nombre"
                type="text"
                [attr.aria-invalid]="errorNombre() ? 'true' : null"
                [attr.aria-describedby]="errorNombre() ? 'fac-nombre-error' : 'fac-nombre-ayuda'"
                [(ngModel)]="formFacultad.nombre"
                placeholder="Ej: Facultad de Ciencias de la Salud"
                maxlength="50"
                class="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
                [class.border-danger-300]="errorNombre()"
                [class.border-warm-200]="!errorNombre()"
              />
              @if (errorNombre()) {
                <p id="fac-nombre-error" role="alert" class="text-xs text-danger-600 font-semibold mt-1 flex items-center gap-1">
                  <svg aria-hidden="true" class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{{ errorNombre() }}</span>
                </p>
              } @else {
                <p id="fac-nombre-ayuda" class="text-[10px] text-warm-500 mt-1">Obligatorio (entre 3 y 50 caracteres institucionales).</p>
              }
            </div>

            <!-- Decano(a) Titular Asignado -->
            <div>
              <label for="fac-decano" class="block text-xs font-bold text-warm-700 uppercase mb-1">Decano(a) Titular Asignado *</label>
              <select
                id="fac-decano"
                [(ngModel)]="formFacultad.idDecano"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 bg-white"
              >
                <option value="">{{ decanos().length === 0 ? '-- No hay decanos disponibles --' : '-- Seleccionar Decano(a) Titular --' }}</option>
                @for (dec of decanos(); track dec.id) {
                  <option [value]="dec.id">
                    {{ dec.nombreCompleto || (dec.nombres + ' ' + dec.apellidos).trim() }} (CC {{ dec.numeroIdentificacion }}{{ dec.correo ? ' - ' + dec.correo : '' }})
                  </option>
                }
              </select>
              @if (decanos().length === 0) {
                <p class="text-[11px] text-warning-600 mt-1">
                  No hay decanos registrados en el directorio central.
                </p>
              } @else {
                <p class="text-[10px] text-warm-500 mt-1">
                  Requisito normativo: toda facultad institucional debe contar con un decano titular designado.
                </p>
              }
            </div>

            @if (errorGuardado(); as mensajeError) {
              <p class="text-xs font-semibold text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2" role="alert">
                {{ mensajeError }}
              </p>
            }

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
                [disabled]="guardando()"
                (click)="guardar()"
                class="px-5 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
              >
                @if (guardando()) {
                  <svg aria-hidden="true" class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
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
        <app-modal
          [isOpen]="true"
          title="Cambiar Decano(a) Titular"
          tamano="md"
          etiquetaCerrar="Cerrar"
          [cerrarAlPulsarFondo]="false"
          (closed)="cerrarModalDecano()"
        >
          <div modal-encabezado>
            <p class="text-xs text-warm-600 mt-0.5">
              Facultad: <span class="font-bold text-warm-900">{{ facultadParaDecano()?.nombre }}</span>
            </p>
            <span class="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-primary-800 bg-primary-100 px-2.5 py-0.5 rounded-full border border-primary-200">
              Gobierno Académico
            </span>
          </div>

          <div class="space-y-4">
            <div>
              <label for="fac-decano-directorio" class="block text-xs font-bold text-warm-700 uppercase mb-1">
                Seleccionar Decano(a) del Directorio
              </label>
              <select
                id="fac-decano-directorio"
                [ngModel]="decanoSeleccionadoId()"
                (ngModelChange)="decanoSeleccionadoId.set($event)"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 bg-white"
              >
                <option value="">{{ decanos().length === 0 ? '-- No hay decanos disponibles --' : '-- Seleccionar Profesional --' }}</option>
                @for (dec of decanos(); track dec.id) {
                  <option [value]="dec.id">
                    {{ dec.nombreCompleto || (dec.nombres + ' ' + dec.apellidos).trim() }} ({{ dec.tipoIdentificacion || 'CC' }} {{ dec.numeroIdentificacion }})
                  </option>
                }
              </select>
              @if (decanos().length === 0) {
                <p class="text-[11px] text-warning-600 mt-1.5">
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
                [disabled]="!decanoSeleccionadoId() || guardandoDecano()"
                (click)="confirmarAsignacionDecano()"
                class="px-5 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Asignar a Facultad
              </button>
            </div>
          </div>
        </app-modal>
      }

      <!-- ================= MODAL: VER PROGRAMAS DE LA FACULTAD (HU108) ================= -->
      @if (facultadSeleccionada()) {
        <app-modal
          [isOpen]="true"
          [title]="facultadSeleccionada()?.nombre ?? ''"
          tamano="3xl"
          etiquetaCerrar="Cerrar"
          (closed)="cerrarProgramas()"
        >
          <div modal-encabezado>
            <p class="text-xs text-warm-500 mt-0.5">
              Decano(a): <span class="font-bold text-warm-800">{{ facultadSeleccionada()?.decanoNombre || 'Titular designado' }}</span>
            </p>
            <span class="inline-block mt-2 text-xs font-semibold text-primary-800 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200">
              Estructura académica
            </span>
          </div>

          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-warm-500">Programas académicos</h4>
            @if (cargandoProgramas()) {
              <p role="status" class="text-xs text-warm-500">Cargando programas…</p>
            } @else if (errorProgramas()) {
              <p role="alert" class="text-xs text-danger-700">{{ errorProgramas() }}</p>
            } @else if (programasFacultad().length === 0) {
              <p class="text-xs text-warm-500 italic">Esta facultad aún no tiene programas académicos registrados.</p>
            } @else {
              <div class="tabla-contenedor max-h-[50vh]" data-testid="programas-facultad">
                <table class="tabla">
                  <caption class="sr-only">Programas académicos de la facultad</caption>
                  <thead>
                    <tr>
                      <th scope="col">Programa</th>
                      <th scope="col">Código</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of programasFacultad(); track p.id) {
                      <tr data-testid="programa-facultad-fila">
                        <td class="font-semibold text-warm-800">{{ p.nombre }}</td>
                        <td class="font-mono text-xs text-warm-600">{{ p.codigo || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <div modal-footer>
            <button
              type="button"
              (click)="cerrarProgramas()"
              class="px-5 py-2 bg-warm-200 hover:bg-warm-300 text-warm-800 text-xs font-bold rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </app-modal>
      }
    </div>
  `
})
export class AdminFacultadesComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);
  private readonly toast = inject(ToastService);

  vista = signal<VistaFacultad>('LISTA');
  guardando = signal<boolean>(false);
  /** Mensaje del backend del último guardado fallido; se muestra junto al botón (F-ADM-S05). */
  errorGuardado = signal<string | null>(null);
  intentoGuardar = signal(false);
  guardandoDecano = signal<boolean>(false);
  facultadCambiandoEstado = signal<string | null>(null);
  filtroTexto = signal('');
  filtroEstado = signal<FiltroEstadoFacultad>('TODOS');
  currentPage = signal(1);
  pageSize = signal(TAMANO_PAGINA_TABLA);

  facultades = this.adminService.facultades;
  decanos = this.adminService.decanos;
  instituciones = this.adminService.instituciones;
  programasFacultad = signal<ProgramaInstitucionDto[]>([]);
  cargandoProgramas = signal(false);
  errorProgramas = signal<string | null>(null);

  facultadEnEdicion: FacultadItem | null = null;
  facultadSeleccionada = signal<FacultadItem | null>(null);

  // Modal de asignación / cambio de decano
  facultadParaDecano = signal<FacultadItem | null>(null);
  /** Signal: decanoSeleccionadoObjeto (computed) debe recalcularse con cada eleccion del selector. */
  decanoSeleccionadoId = signal('');

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
  nombreDuplicado(): boolean {
    const nom = this.formFacultad.nombre.trim().toLowerCase();
    if (!nom) return false;
    return this.facultades().some(
      (f) => f.nombre.trim().toLowerCase() === nom && f.id !== this.facultadEnEdicion?.id
    );
  }

  /** Mensaje visible bajo el campo nombre (F-ADM-S23); vacío si el nombre es válido o aún no se escribió. */
  errorNombre(): string {
    const nombre = this.formFacultad.nombre.trim();
    if (this.nombreDuplicado()) return 'Ya existe una facultad con este nombre en la institución.';
    if (this.intentoGuardar() && nombre.length === 0) return 'El nombre de la facultad es obligatorio.';
    if (nombre.length > 0 && nombre.length < 3) return 'El nombre debe tener entre 3 y 50 caracteres.';
    // DEC-073: texto seguro (sin < > ni comillas).
    return getSafeTextError(nombre, 'Nombre de la Facultad') ?? '';
  }

  facultadesFiltradas = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    const estado = this.filtroEstado();

    return this.facultades().filter((f) => {
      const matchTxt =
        !txt ||
        f.nombre.toLowerCase().includes(txt) ||
        f.decanoNombre?.toLowerCase().includes(txt);

      let matchEstado = true;
      if (estado === 'ACTIVO') matchEstado = f.estado === 'ACTIVO';
      else if (estado === 'INACTIVO') matchEstado = f.estado === 'INACTIVO';

      return matchTxt && matchEstado;
    });
  });

  pagedFacultades = computed(() => paginarEnCliente(this.facultadesFiltradas(), this.currentPage(), this.pageSize()));

  cambiarTamanoPagina(tamano: number): void {
    this.pageSize.set(tamano);
    this.currentPage.set(1);
  }

  decanoSeleccionadoObjeto = computed(() => {
    const id = this.decanoSeleccionadoId();
    if (!id) return null;
    return this.decanos().find((d) => d.id === id) || null;
  });

  ngOnInit(): void {
    this.adminService.cargarFacultades().subscribe();
    this.adminService.getDecanos().subscribe();
    this.adminService.getInstituciones().subscribe();
  }

  totalProgramasDe(fac: FacultadItem): number | undefined {
    return fac.totalProgramas;
  }

  totalEstudiantesDe(fac: FacultadItem): number | undefined {
    return fac.totalEstudiantes;
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
    // Sin valores por defecto: la institución y el decano los elige el usuario.
    this.formFacultad = {
      nombre: '',
      idInstitucion: '',
      idDecano: '',
      estado: 'ACTIVO',
    };
    this.errorGuardado.set(null);
    this.intentoGuardar.set(false);
    this.vista.set('FORM');
  }

  editarFacultad(fac: FacultadItem): void {
    this.facultadEnEdicion = fac;
    this.formFacultad = {
      nombre: fac.nombre,
      idInstitucion: fac.idInstitucion || '',
      idDecano: fac.decanoId || '',
      estado: fac.estado,
    };
    this.errorGuardado.set(null);
    this.intentoGuardar.set(false);
    this.vista.set('FORM');
  }

  guardar(): void {
    const nombre = this.formFacultad.nombre.trim();
    const idDecano = this.formFacultad.idDecano;
    this.intentoGuardar.set(true);
    if (this.guardando()) return;
    if (!idDecano) {
      this.errorGuardado.set(mensajeUi('UI_ADMIN_FACULTADES_009'));
      return;
    }
    if (!nombre || nombre.length < 3 || this.nombreDuplicado() || getSafeTextError(nombre, 'Nombre de la Facultad')) return;

    this.errorGuardado.set(null);
    this.guardando.set(true);

    if (this.facultadEnEdicion) {
      this.adminService.actualizarFacultad(this.facultadEnEdicion.id, { nombre, idDecano }).subscribe({
        next: (res) => {
          this.guardando.set(false);
          if (res.exitoso) {
            this.toast.success(mensajeUi('UI_ADMIN_FACULTADES_001'));
            this.vista.set('LISTA');
          } else {
            this.fallaGuardado(res.mensajeUsuario || 'No fue posible actualizar la facultad.');
          }
        },
        error: (err) => {
          this.guardando.set(false);
          this.fallaGuardado(getBackendUserMessage(err, 'No fue posible actualizar la facultad.'));
        },
      });
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
              this.toast.success(mensajeUi('UI_ADMIN_FACULTADES_002'));
              this.vista.set('LISTA');
            } else {
              this.fallaGuardado(res.mensajeUsuario || 'No fue posible registrar la facultad.');
            }
          },
          error: (err) => {
            this.guardando.set(false);
            this.fallaGuardado(getBackendUserMessage(err, 'No fue posible registrar la facultad.'));
          },
        });
    }
  }

  /** Acciones secundarias de la fila; la primaria visible es "Ver Programas y Planes". */
  accionesFacultad(fac: FacultadItem): ActionMenuItem[] {
    return [
      { id: 'editar', label: 'Editar', testid: 'facultad-editar' },
      { id: 'decano', label: 'Cambiar decano(a)', testid: 'facultad-cambiar-decano' },
      {
        id: 'estado',
        label: fac.estado === 'ACTIVO' ? 'Desactivar facultad' : 'Activar facultad',
        testid: 'facultad-estado',
        disabled: this.facultadCambiandoEstado() === fac.id,
        danger: fac.estado === 'ACTIVO',
      },
    ];
  }

  alElegirAccionFacultad(fac: FacultadItem, id: string): void {
    if (id === 'editar') this.editarFacultad(fac);
    else if (id === 'decano') this.abrirModalVincularDecano(fac);
    else if (id === 'estado') this.toggleEstadoFacultad(fac);
  }

  toggleEstadoFacultad(fac: FacultadItem): void {
    if (this.facultadCambiandoEstado() !== null) return;
    const activar = fac.estado !== 'ACTIVO';
    this.facultadCambiandoEstado.set(fac.id);
    this.adminService.cambiarEstadoFacultad(fac.id, activar).subscribe({
      next: (res) => {
        this.facultadCambiandoEstado.set(null);
        if (res.exitoso) {
          this.toast.success(mensajeUi(activar ? 'UI_ADMIN_FACULTADES_006' : 'UI_ADMIN_FACULTADES_007'));
        } else {
          this.toast.error(res.mensajeUsuario || mensajeUi('UI_ADMIN_FACULTADES_003'));
        }
      },
      error: (err) => {
        this.facultadCambiandoEstado.set(null);
        this.toast.error(getBackendUserMessage(err, mensajeUi('UI_ADMIN_FACULTADES_003')));
      },
    });
  }

  /** Programas de la facultad desde `/admin/programas` (las rutas de decano y coordinador no admiten al administrador). */
  verProgramasFacultad(fac: FacultadItem): void {
    this.facultadSeleccionada.set(fac);
    this.programasFacultad.set([]);
    this.errorProgramas.set(null);
    this.cargandoProgramas.set(true);
    this.adminService.getProgramasInstitucion({ idFacultad: fac.id, pagina: 1, tamano: 100 }).subscribe({
      next: (res) => {
        this.programasFacultad.set(res?.elementos ?? []);
        this.cargandoProgramas.set(false);
      },
      error: (err: unknown) => {
        this.cargandoProgramas.set(false);
        this.errorProgramas.set(getBackendUserMessage(err, 'No fue posible cargar los programas de la facultad.'));
      },
    });
  }

  cerrarProgramas(): void {
    this.facultadSeleccionada.set(null);
  }

  // ================= DECANATO: VINCULACIÓN / CAMBIO =================
  abrirModalVincularDecano(fac: FacultadItem): void {
    this.facultadParaDecano.set(fac);
    this.decanoSeleccionadoId.set(fac.decanoId || '');
  }

  cerrarModalDecano(): void {
    this.facultadParaDecano.set(null);
    this.decanoSeleccionadoId.set('');
  }

  confirmarAsignacionDecano(): void {
    const fac = this.facultadParaDecano();
    const decano = this.decanoSeleccionadoObjeto();
    if (!fac || !decano || this.guardandoDecano()) return;

    const decanoNombre = `${decano.nombres} ${decano.apellidos}`;

    this.guardandoDecano.set(true);
    this.adminService.actualizarFacultad(fac.id, { idDecano: decano.id }).subscribe({
      next: (res) => {
        this.guardandoDecano.set(false);
        if (res.exitoso) {
          this.toast.success(mensajeUi('UI_ADMIN_FACULTADES_008', { decano: decanoNombre, facultad: fac.nombre }));
          this.cerrarModalDecano();
        } else {
          this.toast.error(res.mensajeUsuario || mensajeUi('UI_ADMIN_FACULTADES_004'));
        }
      },
      error: (err) => {
        this.guardandoDecano.set(false);
        this.toast.error(getBackendUserMessage(err, mensajeUi('UI_ADMIN_FACULTADES_005')));
      },
    });
  }

  /** El texto proviene del backend; se muestra en el formulario y en un aviso, sin interpretarlo ni traducirlo. */
  private fallaGuardado(mensaje: string): void {
    this.errorGuardado.set(mensaje);
    this.toast.error(mensaje);
  }
}

import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FechaHoraCortaPipe } from '../../../shared/pipes/fecha-hora.pipes';
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import {
  ParametroAdminDto,
  CierrePeriodoReporte,
} from '../../../core/models/role-management.model';
import { AdminAuditoriaComponent } from './admin-auditoria.component';
import { ParametroEdicionModalComponent } from './parametro-edicion-modal.component';

type TabAdminSystem = 'PARAMETROS' | 'AUDITORIA' | 'CIERRE_MASIVO';

@Component({
  selector: 'app-admin-system',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EmptyStateComponent,
    FechaHoraCortaPipe,
    CommonModule,
    FormsModule,
    RouterLink,
    AdminAuditoriaComponent,
    ConfirmDialogComponent,
    PaginationComponent,
    ParametroEdicionModalComponent,
  ],
  template: `
    <div class="space-y-6">
     @if (modo === 'completo') {
      <!-- ================= HEADER & BREADCRUMB ================= -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">
            <span>Gobierno de TI & Auditoría</span>
            <span>/</span>
            <span class="text-primary-700">Parámetros, Trazabilidad y Cierre Semestral</span>
          </div>
          <h1 class="text-2xl font-serif font-bold text-warm-900">Sistema, Auditoría y Consolidación</h1>
          <p class="text-sm text-warm-600">
            Ajuste de reglas de inasistencia, logs de auditoría y cierre masivo de asistencia por período.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <a
            routerLink="/app/admin/configuracion/correo"
            class="min-h-[44px] px-4 py-2 bg-warm-100 text-warm-800 border border-warm-300 rounded-xl text-xs font-bold hover:bg-warm-200 shadow-sm transition-all flex items-center gap-2"
            title="Gestión de plantillas, cola outbox y canal SMTP"
          >
            <svg aria-hidden="true" class="w-4 h-4 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            <span>Gestión de Correos (SMTP)</span>
          </a>
          <button
            type="button"
            (click)="tabActiva.set('CIERRE_MASIVO')"
            class="min-h-[44px] px-4 py-2 bg-primary-700 text-white rounded-xl text-xs font-bold hover:bg-primary-800 shadow-sm transition-all flex items-center gap-2"
          >
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            <span>Cierre Masivo de Asistencia</span>
          </button>
        </div>
      </div>

      <!-- ================= TABS SELECTOR ================= -->
      <div class="flex border-b border-warm-200 gap-2 overflow-x-auto" role="tablist" aria-label="Secciones del sistema">
        <button
          type="button"
          role="tab"
          id="tab-parametros"
          aria-controls="panel-parametros"
          [attr.aria-selected]="tabActiva() === 'PARAMETROS'"
          [attr.tabindex]="tabActiva() === 'PARAMETROS' ? 0 : -1"
          (keydown)="onTabKeydown($event)"
          (click)="tabActiva.set('PARAMETROS')"
          [class]="tabActiva() === 'PARAMETROS' ? 'border-primary-700 text-primary-800 font-bold border-b-2' : 'text-warm-500 hover:text-warm-700'"
          class="min-h-[44px] px-4 py-3 text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
        >
          <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>Parámetros Globales ({{ parametros().length }})</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-auditoria"
          aria-controls="panel-auditoria"
          [attr.aria-selected]="tabActiva() === 'AUDITORIA'"
          [attr.tabindex]="tabActiva() === 'AUDITORIA' ? 0 : -1"
          (keydown)="onTabKeydown($event)"
          (click)="tabActiva.set('AUDITORIA')"
          [class]="tabActiva() === 'AUDITORIA' ? 'border-primary-700 text-primary-800 font-bold border-b-2' : 'text-warm-500 hover:text-warm-700'"
          class="min-h-[44px] px-4 py-3 text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
        >
          <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
          <span>Trazabilidad y Auditoría</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-cierre"
          aria-controls="panel-cierre"
          [attr.aria-selected]="tabActiva() === 'CIERRE_MASIVO'"
          [attr.tabindex]="tabActiva() === 'CIERRE_MASIVO' ? 0 : -1"
          (keydown)="onTabKeydown($event)"
          (click)="tabActiva.set('CIERRE_MASIVO')"
          [class]="tabActiva() === 'CIERRE_MASIVO' ? 'border-primary-700 text-primary-800 font-bold border-b-2' : 'text-warm-500 hover:text-warm-700'"
          class="min-h-[44px] px-4 py-3 text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
        >
          <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Cierre Masivo de Asistencia</span>
        </button>
      </div>
     }

      <!-- ================= TAB 1: PARÁMETROS DEL SISTEMA (HU168) ================= -->
      @if (tabActiva() === 'PARAMETROS') {
        <div role="tabpanel" id="panel-parametros" aria-labelledby="tab-parametros" class="space-y-6">
          <!-- Filtros de búsqueda y switch de parámetros técnicos -->
          <div class="bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <!-- Buscador por texto -->
              <div class="relative flex-1">
                <input
                  type="search"
                  aria-label="Buscar parámetros por clave, etiqueta o descripción"
                  placeholder="Buscar parámetro..."
                  [ngModel]="textoFiltro()"
                  (ngModelChange)="onFiltroTextoChange($event)"
                  class="w-full min-h-[44px] pl-9 pr-3 py-2 bg-white border border-warm-200 rounded-xl text-xs font-semibold text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
                <svg aria-hidden="true" class="w-4 h-4 text-warm-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <!-- Filtro de Grupo -->
              <select
                aria-label="Filtrar por grupo institucional"
                [ngModel]="grupoFiltro()"
                (ngModelChange)="onFiltroGrupoChange($event)"
                class="min-h-[44px] px-3 py-2 bg-white border border-warm-200 rounded-xl text-xs font-semibold text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="">Todos los grupos</option>
                @for (grp of gruposDisponibles(); track grp) {
                  <option [value]="grp">{{ grp }}</option>
                }
              </select>
            </div>

            <!-- Switch: Mostrar parámetros técnicos (solo lectura) -->
            <label class="inline-flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-warm-700 select-none shrink-0 min-h-[44px]">
              <input
                type="checkbox"
                role="switch"
                aria-label="Mostrar parámetros técnicos (solo lectura)"
                [checked]="mostrarTecnicos()"
                (change)="toggleMostrarTecnicos($any($event.target).checked)"
                class="w-4 h-4 text-primary-700 rounded border-warm-300 focus:ring-primary-600"
              />
              <span>Mostrar parámetros técnicos (solo lectura)</span>
            </label>
          </div>

          <!-- Listado Agrupado por Categoría Visual -->
          @if (cargandoParametros()) {
            <p role="status" class="text-center py-10 text-sm text-warm-500">Cargando parámetros del sistema…</p>
          } @else if (parametrosPorCategoria().length === 0) {
            <div class="bg-white rounded-2xl p-8 border border-warm-200 text-center">
              <p class="text-sm font-semibold text-warm-700">No se encontraron parámetros con los filtros aplicados.</p>
              <p class="text-xs text-warm-500 mt-1">Pruebe ajustando el texto de búsqueda o activando la visualización de parámetros técnicos.</p>
            </div>
          } @else {
            <div class="space-y-6">
              @for (grupoCat of parametrosPorCategoria(); track grupoCat.categoria) {
                <div class="space-y-3">
                  <div class="flex items-center gap-2 border-b border-warm-200 pb-2">
                    <h3 class="text-base font-serif font-bold text-warm-900">{{ grupoCat.categoria }}</h3>
                    <span class="text-[11px] font-bold text-warm-500 bg-warm-100 px-2 py-0.5 rounded-full">
                      {{ grupoCat.items.length }}
                    </span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    @for (p of grupoCat.items; track p.id) {
                      <div class="bg-white border border-warm-200 rounded-2xl p-5 shadow-warm-sm flex flex-col justify-between hover:shadow-warm-md transition-shadow">
                        <div>
                          <!-- Header fila -->
                          <div class="flex items-center justify-between gap-3 mb-2">
                            <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-700">
                              {{ p.clave }}
                            </span>
                            <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-800 border border-primary-100">
                              {{ p.grupo }}
                            </span>
                          </div>

                          <!-- Etiqueta y Descripción -->
                          <h4 class="font-bold text-warm-900 text-sm mb-1">
                            {{ p.etiqueta || p.clave }}
                          </h4>
                          <p class="text-xs text-warm-600 mb-3 leading-relaxed">
                            {{ p.descripcion || 'Parámetro de configuración del sistema.' }}
                          </p>

                          <!-- Valor Configurado -->
                          <div class="bg-warm-50 p-3 rounded-xl border border-warm-100 mb-3 flex items-center justify-between gap-3">
                            <div>
                              <span class="block text-[10px] font-bold text-warm-500 uppercase">Valor Actual</span>
                              <span class="text-sm font-bold text-warm-900">
                                {{ p.valor }}
                                @if (p.unidad) {
                                  <span class="text-xs font-normal text-warm-600 ml-1">{{ p.unidad }}</span>
                                }
                              </span>
                            </div>

                            @if (p.valorMinimo != null && p.valorMaximo != null) {
                              <span class="text-[10px] text-warm-500 font-mono">
                                Rango: [{{ p.valorMinimo }}..{{ p.valorMaximo }}]
                              </span>
                            } @else if (p.valoresPermitidos) {
                              <span class="text-[10px] text-warm-500 font-mono truncate max-w-[140px]" title="{{ p.valoresPermitidos }}">
                                Permitidos: {{ p.valoresPermitidos }}
                              </span>
                            }
                          </div>
                        </div>

                        <!-- Footer con Meta y Botón de Edición -->
                        <div class="pt-3 border-t border-warm-100 flex flex-wrap items-center justify-between gap-2">
                          <div class="text-[10px] text-warm-500">
                            @if (p.nombreUltimoActor || p.fechaUltimoCambioUtc) {
                              <span>Último cambio por <strong>{{ p.nombreUltimoActor || 'Admin TI' }}</strong></span>
                              @if (p.fechaUltimoCambioUtc) {
                                <span class="block text-warm-400 font-mono" [attr.title]="p.fechaUltimoCambioUtc">{{ p.fechaUltimoCambioUtc | fechaHoraCorta }}</span>
                              }
                            } @else {
                              <span>Tipo: {{ p.tipoDato }}</span>
                            }
                          </div>

                          @if (p.esEditable === true) {
                            <button
                              type="button"
                              [attr.data-testid]="'btn-editar-' + p.id"
                              (click)="abrirModalEdicion(p)"
                              class="min-h-[44px] px-3.5 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                              [attr.aria-label]="'Editar parámetro ' + (p.etiqueta || p.clave)"
                            >
                              <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <span>Editar</span>
                            </button>
                          } @else {
                            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-warm-100 text-warm-600">
                              Solo lectura
                            </span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Paginación -->
            <app-pagination
              [totalItems]="totalElementos()"
              [pageSize]="tamanoPagina()"
              [currentPage]="paginaActual()"
              (pageChange)="cambiarPagina($event)"
              (pageSizeChange)="cambiarTamano($event)"
            />
          }

          <!-- Modal de Edición de Parámetro (HU168) -->
          <app-parametro-edicion-modal
            [isOpen]="modalEdicionAbierto()"
            [parametro]="parametroSeleccionadoEdicion()"
            (guardado)="onParametroGuardado()"
            (recargarRequerido)="cargarParametros()"
            (cerrar)="modalEdicionAbierto.set(false)"
          />
        </div>
      }

      <!-- ================= TAB 2: AUDITORÍA Y TRAZABILIDAD (HU172) ================= -->
      @if (tabActiva() === 'AUDITORIA') {
        <div role="tabpanel" id="panel-auditoria" aria-labelledby="tab-auditoria">
          <app-admin-auditoria />
        </div>
      }

      <!-- ================= TAB 3: CIERRE MASIVO DE ASISTENCIA ================= -->
      @if (tabActiva() === 'CIERRE_MASIVO') {
        <div class="space-y-6" role="tabpanel" id="panel-cierre" aria-labelledby="tab-cierre">
          <div class="bg-gradient-to-r from-primary-900 to-primary-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="space-y-2">
              <span class="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-primary-800 text-primary-200 inline-block">
                Consolidación Semestral Definitiva
              </span>
              <h2 class="text-xl font-serif font-bold text-white">Cierre Masivo de Asistencia</h2>
              <p class="text-xs text-warm-200 max-w-xl">
                Acción real e irreversible: al ejecutar el cierre, el sistema congela todas las sesiones del período seleccionado, computa el porcentaje final de inasistencias de cada estudiante matriculado y emite las actas oficiales de aprobación y reprobación por fallas.
              </p>
            </div>

            <div class="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-xl flex flex-col items-center gap-3 shrink-0">
              <label for="cierre-periodo" class="text-xs font-bold text-white uppercase">Período para Cierre</label>
              @if (periodos().length === 0) {
                <p class="text-xs text-warm-300">No hay períodos académicos registrados para realizar el cierre.</p>
              } @else {
                <select
                  id="cierre-periodo"
                  [(ngModel)]="periodoSeleccionadoCierre"
                  class="px-4 py-2 rounded-lg bg-white text-warm-900 text-xs font-bold focus:outline-none"
                >
                  @for (p of periodos(); track p.id) {
                    <option [value]="p.id">{{ p.nombre }} ({{ p.codigo }})</option>
                  }
                </select>
              }

              <button
                type="button"
                (click)="iniciarCierreSemestral()"
                [disabled]="isProcesandoCierre() || periodos().length === 0 || !periodoSeleccionadoCierre"
                class="w-full min-h-[44px] px-5 py-2.5 bg-accent-500 hover:bg-accent-600 disabled:bg-warm-400 text-warm-900 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                @if (isProcesandoCierre()) {
                  <svg aria-hidden="true" class="animate-spin h-4 w-4 text-warm-900" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Procesando...</span>
                } @else {
                  <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span>Ejecutar cierre definitivo</span>
                }
              </button>
            </div>
          </div>

          <!-- Historial de Reportes de Cierre -->
          <div>
            <h3 class="text-base font-bold text-warm-900 mb-3">Historial de Cierres Masivos Realizados</h3>
            
            <div class="bg-white border border-warm-200 rounded-2xl overflow-x-auto shadow-warm-sm">
              <table class="w-full text-left text-sm">
                <thead class="bg-warm-50 border-b border-warm-200 text-xs font-bold text-warm-600 uppercase tracking-wider">
                  <tr>
                    <th scope="col" class="px-5 py-3.5">ID Reporte</th>
                    <th scope="col" class="px-5 py-3.5">Período</th>
                    <th scope="col" class="px-5 py-3.5">Fecha y Hora Ejecución</th>
                    <th scope="col" class="px-5 py-3.5 text-center">Estudiantes Procesados</th>
                    <th scope="col" class="px-5 py-3.5 text-center">Materias Consolidadas</th>
                    <th scope="col" class="px-5 py-3.5 text-center">Aprobados Asistencia</th>
                    <th scope="col" class="px-5 py-3.5 text-center">Reprobados por Fallas</th>
                    <th scope="col" class="px-5 py-3.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-warm-100">
                  @for (rep of reportesCierre(); track rep.id) {
                    <tr class="hover:bg-warm-50/70 transition-colors">
                      <td class="px-5 py-4 font-mono text-xs font-bold text-primary-800">{{ rep.id }}</td>
                      <td class="px-5 py-4 font-bold text-warm-900">{{ rep.periodoCodigo }}</td>
                      <td class="px-5 py-4 text-xs text-warm-600">{{ rep.fechaEjecucion }}</td>
                      <td class="px-5 py-4 text-center font-bold text-warm-900">{{ rep.totalEstudiantesProcesados }}</td>
                      <td class="px-5 py-4 text-center text-warm-700">{{ rep.totalMateriasAfectadas }}</td>
                      <td class="px-5 py-4 text-center font-bold text-success-700">
                        {{ rep.totalAprobadosAsistencia }} ({{ porcentaje(rep.totalAprobadosAsistencia, rep.totalEstudiantesProcesados) }})
                      </td>
                      <td class="px-5 py-4 text-center font-bold text-danger-600">
                        {{ rep.totalReprobadosFallas }} ({{ porcentaje(rep.totalReprobadosFallas, rep.totalEstudiantesProcesados) }})
                      </td>
                      <td class="px-5 py-4 text-center">
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-success-100 text-success-800">
                          {{ rep.estado }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="px-5 py-4">
                        <app-empty-state
                          title="Aún no hay cierres masivos"
                          description="El historial de cierres no está disponible en esta pantalla. Tras ejecutar un cierre, consulte su resultado en Trazabilidad y Auditoría."
                          causa="Se llena cuando se ejecuta el primer cierre masivo de un período."
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <app-confirm-dialog
        [isOpen]="cierrePendiente()"
        title="Cierre masivo definitivo"
        [message]="'¿Confirma ejecutar el cierre masivo definitivo de asistencia para el período ' + periodoSeleccionadoCierre + '? Esta acción es irreversible y consolidará los registros de inasistencia de todos los estudiantes.'"
        confirmLabel="Ejecutar cierre"
        [destructive]="true"
        (confirmed)="confirmarCierre()"
        (cancelled)="cierrePendiente.set(false)"
      />
    </div>
  `,
})
export class AdminSystemComponent implements OnInit {
  private adminService = inject(AdminManagementService);
  private coordService = inject(CoordinatorManagementService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  /**
   * La ruta de Configuración declara `data.modo = 'parametros'`: se ocultan el encabezado y las pestañas de operaciones y
   * solo se muestran los parámetros. En `admin/sistema` (sin ese dato) la pantalla es completa.
   */
  readonly modo: 'completo' | 'parametros' =
    inject(ActivatedRoute, { optional: true })?.snapshot.data['modo'] === 'parametros' ? 'parametros' : 'completo';
  tabActiva = signal<TabAdminSystem>('PARAMETROS');
  periodoSeleccionadoCierre = '';
  isProcesandoCierre = signal<boolean>(false);
  cierrePendiente = signal<boolean>(false);

  // Parámetros y Filtros
  textoFiltro = signal<string>('');
  grupoFiltro = signal<string>('');
  mostrarTecnicos = signal<boolean>(false);
  paginaActual = signal<number>(1);
  tamanoPagina = signal<number>(20);
  totalElementos = signal<number>(0);
  totalPaginas = signal<number>(1);
  cargandoParametros = signal<boolean>(false);

  parametroSeleccionadoEdicion = signal<ParametroAdminDto | null>(null);
  modalEdicionAbierto = signal<boolean>(false);

  parametros = this.adminService.parametros;
  reportesCierre = this.adminService.reportesCierre;
  periodos = this.coordService.periodos;

  private readonly sincronizarPeriodo = effect(() => {
    this.actualizarPeriodoSeleccionado();
  });

  parametrosPorCategoria = computed(() => {
    const list = this.parametros();
    const map = new Map<string, ParametroAdminDto[]>();
    for (const p of list) {
      const cat = p.categoriaVisual || 'General';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(p);
    }
    for (const items of map.values()) {
      items.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    }
    return Array.from(map.entries()).map(([categoria, items]) => ({
      categoria,
      items,
    }));
  });

  gruposDisponibles = computed(() => {
    const set = new Set<string>();
    for (const p of this.parametros()) {
      if (p.grupo) set.add(p.grupo);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  });

  ngOnInit(): void {
    this.coordService.cargarPeriodosAcademicosBase();
    this.actualizarPeriodoSeleccionado();
    this.cargarParametros();
  }


  cargarParametros(): void {
    this.cargandoParametros.set(true);
    this.adminService
      .cargarParametros({
        grupo: this.grupoFiltro() || undefined,
        texto: this.textoFiltro().trim() || undefined,
        soloEditables: !this.mostrarTecnicos(),
        pagina: this.paginaActual(),
        tamano: this.tamanoPagina(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.cargandoParametros.set(false);
          this.totalElementos.set(res?.totalElementos ?? this.parametros().length);
          this.totalPaginas.set(res?.totalPaginas ?? 1);
        },
        error: (err) => {
          this.cargandoParametros.set(false);
          this.toast.error(getApiErrorMessage(err));
        },
      });
  }

  toggleMostrarTecnicos(mostrar: boolean): void {
    this.mostrarTecnicos.set(mostrar);
    this.paginaActual.set(1);
    this.cargarParametros();
  }

  onFiltroTextoChange(texto: string): void {
    this.textoFiltro.set(texto);
    this.paginaActual.set(1);
    this.cargarParametros();
  }

  onFiltroGrupoChange(grupo: string): void {
    this.grupoFiltro.set(grupo);
    this.paginaActual.set(1);
    this.cargarParametros();
  }

  cambiarPagina(nuevaPagina: number): void {
    this.paginaActual.set(nuevaPagina);
    this.cargarParametros();
  }

  cambiarTamano(nuevoTamano: number): void {
    this.tamanoPagina.set(nuevoTamano);
    this.paginaActual.set(1);
    this.cargarParametros();
  }

  abrirModalEdicion(p: ParametroAdminDto): void {
    this.parametroSeleccionadoEdicion.set(p);
    this.modalEdicionAbierto.set(true);
  }

  onParametroGuardado(): void {
    this.cargarParametros();
  }

  private actualizarPeriodoSeleccionado(): void {
    const lista = this.periodos();
    if (lista.length > 0) {
      const vigente = lista.find((p: any) => p.esVigente === true);
      this.periodoSeleccionadoCierre = vigente ? vigente.id : lista[0].id;
    } else {
      this.periodoSeleccionadoCierre = '';
    }
  }

  porcentaje(parte: number, total: number): string {
    return total > 0 ? `${((parte / total) * 100).toFixed(1)}%` : '—';
  }

  onTabKeydown(event: KeyboardEvent): void {
    const orden: TabAdminSystem[] = ['PARAMETROS', 'AUDITORIA', 'CIERRE_MASIVO'];
    const actual = orden.indexOf(this.tabActiva());
    let destino = actual;
    if (event.key === 'ArrowRight') destino = (actual + 1) % orden.length;
    else if (event.key === 'ArrowLeft') destino = (actual - 1 + orden.length) % orden.length;
    else if (event.key === 'Home') destino = 0;
    else if (event.key === 'End') destino = orden.length - 1;
    else return;
    event.preventDefault();
    this.tabActiva.set(orden[destino]);
    const ids = ['tab-parametros', 'tab-auditoria', 'tab-cierre'];
    queueMicrotask(() => document.getElementById(ids[destino])?.focus());
  }

  iniciarCierreSemestral(): void {
    this.cierrePendiente.set(true);
  }

  confirmarCierre(): void {
    this.cierrePendiente.set(false);

    const periodoObj = this.periodos().find((p) => p.id === this.periodoSeleccionadoCierre || p.codigo === this.periodoSeleccionadoCierre);
    const idPeriodo = periodoObj ? periodoObj.id : this.periodoSeleccionadoCierre;
    const codigoPeriodo = periodoObj ? periodoObj.codigo : this.periodoSeleccionadoCierre;

    if (!idPeriodo) {
      this.toast.error('Debe seleccionar un período válido para ejecutar el cierre.');
      return;
    }

    this.isProcesandoCierre.set(true);
    this.adminService
      .ejecutarCierreMasivo(idPeriodo, codigoPeriodo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isProcesandoCierre.set(false);
          const mensajeExito = res?.mensajeUsuario || `Cierre masivo del período ${codigoPeriodo} solicitado correctamente.`;
          this.toast.success(mensajeExito);
        },
        error: (err: unknown) => {
          this.isProcesandoCierre.set(false);
          this.toast.error(getApiErrorMessage(err));
        },
      });
  }
}

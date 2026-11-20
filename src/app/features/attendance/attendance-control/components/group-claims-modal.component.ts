import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { type EstadoCargaReclamos, ResultadoAprobacionReclamo, SolicitudRevisionItem } from '../../../../core/models/role-management.model';
import { Course } from '../../../../core/models/course.model';
import { etiquetaEstadoReclamo, etiquetaResultadoAprobacion } from '../../../../core/utils/reclamo-estado.util';
import { TablaDatosComponent } from '../../../../shared/components/tabla-datos/tabla-datos.component';

@Component({
    selector: 'app-group-claims-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ModalComponent, ButtonComponent, BadgeComponent, TablaDatosComponent],
    template: `
    <app-modal
      [isOpen]="isOpen()"
      title="Justificaciones del Grupo"
      (closed)="closed.emit()"
    >
      <div class="space-y-4">
        <!-- Subtítulo e Indicadores -->
        <div class="flex items-center justify-between pb-2 border-b border-warm-100">
          <div>
            <span class="text-xs font-bold text-warm-700 uppercase tracking-wider block">
              {{ course()?.name }}{{ course()?.code ? ' (' + course()?.code + ')' : '' }}
            </span>
            <span class="text-[11px] text-warm-500">
              Solicitudes de inasistencia radicadas por los estudiantes de este curso.
            </span>
          </div>
          <span data-testid="group-claims-count" class="px-2.5 py-1 rounded-full text-xs font-bold bg-warning-100 text-warning-900 border border-warning-200">
            @if (estadoCarga() === 'LOADED') {
              {{ totalReclamos() ?? reclamos().length }} Registros
            } @else if (estadoCarga() === 'LOADING') {
              Cargando…
            } @else {
              —
            }
          </span>
        </div>

        @if (estadoCarga() === 'LOADED' && reclamos().length === 0) {
          <div class="py-10 text-center text-warm-400 bg-warm-50/50 rounded-2xl border border-dashed border-warm-200">
            <svg class="w-8 h-8 mx-auto mb-2 text-warm-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-xs font-medium text-warm-600">No hay justificaciones para este grupo ni solicitudes pendientes.</p>
            <p class="text-[11px] text-warm-400 mt-0.5">Todas las asistencias están al día y sin novedades.</p>
          </div>
        } @else if (estadoCarga() === 'LOADING' || estadoCarga() === 'LOADED') {
          @if (estadoCarga() === 'LOADING') {
            <p role="status" class="text-xs text-warm-600">Cargando justificaciones del grupo…</p>
          }
          <app-tabla-datos
            etiqueta="Justificaciones del grupo"
            [columnas]="5"
            anchoMinimo="52rem"
            alturaMaxima="18rem"
            [filasEsqueleto]="3"
            [cargando]="estadoCarga() === 'LOADING'"
            [paginada]="true"
            [totalItems]="totalReclamos() ?? reclamos().length"
            [pagina]="pagina()"
            [tamanoPagina]="tamano()"
            [mostrarSelectorTamano]="false"
            (paginaChange)="paginaChange.emit($event)"
          >
            <thead>
              <tr>
                <th scope="col">Estudiante</th>
                <th scope="col">Radicado</th>
                <th scope="col">Justificación</th>
                <th scope="col">Estado</th>
                <th scope="col" class="text-right"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @if (estadoCarga() === 'LOADED') {
                @for (rec of reclamos(); track rec.id) {
                  <tr data-testid="grupo-reclamo-fila">
                    <td class="text-xs">
                      <p class="font-bold text-warm-900">{{ rec.estudianteNombre }}</p>
                      @if (rec.numeroToma !== null && rec.numeroToma !== undefined) {
                        <p class="text-[11px] font-semibold text-warm-800" data-testid="grupo-reclamo-toma">Justificación de la toma {{ rec.numeroToma }}</p>
                      }
                    </td>
                    <td class="whitespace-nowrap text-[11px] text-warm-500">
                      <span class="font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-800">{{ rec.folio }}</span>
                      <p class="mt-1">{{ rec.fechaSolicitud }}</p>
                    </td>
                    <td class="min-w-[16rem] text-xs">
                      <p class="text-[11px] text-warm-500">Motivo: <strong class="text-warm-700">{{ rec.categoria || 'Médico / Salud' }}</strong></p>
                      <p class="text-warm-700 italic">"{{ rec.justificacionSolicitud }}"</p>
                      @if (rec.estadoSolicitud !== 'PENDIENTE' && rec.justificacionRespuesta) {
                        <p class="mt-1 text-[11px] text-warm-600 bg-warm-100/70 p-2 rounded-lg">
                          @if (textoResultado(rec); as resultado) {
                            <strong>{{ resultado }}.</strong>
                          }
                          <strong>Respuesta:</strong> {{ rec.justificacionRespuesta }}
                        </p>
                      }
                    </td>
                    <td class="whitespace-nowrap">
                      <app-badge [variant]="getBadgeVariant(rec.estadoSolicitud)">
                        {{ etiquetaEstado(rec.estadoSolicitud) }}
                      </app-badge>
                    </td>
                    <td class="text-right">
                      <!-- Acción Resolver si está PENDIENTE -->
                      @if (rec.estadoSolicitud === 'PENDIENTE') {
                        <div class="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            (click)="resolver.emit({ id: rec.id, accion: 'RECHAZADA' })"
                            class="whitespace-nowrap text-[11px] font-bold text-danger-700 hover:text-danger-900 bg-danger-50 hover:bg-danger-100 border border-danger-200 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Rechazar
                          </button>
                          @if (rec.idToma) {
                            <button
                              type="button"
                              data-testid="aprobar-presente"
                              (click)="resolver.emit({ id: rec.id, accion: 'APROBADA', resultado: 'PRESENTE' })"
                              class="whitespace-nowrap text-[11px] font-bold text-primary-800 hover:text-primary-950 bg-primary-50 hover:bg-primary-100 border border-primary-300 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                            >
                              Estuvo presente
                            </button>
                          }
                          <button
                            type="button"
                            data-testid="aprobar-justificada"
                            (click)="resolver.emit({ id: rec.id, accion: 'APROBADA', resultado: 'JUSTIFICADA' })"
                            class="whitespace-nowrap text-[11px] font-bold text-primary-800 hover:text-primary-950 bg-primary-50 hover:bg-primary-100 border border-primary-300 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                          >
                            Ausencia justificada
                          </button>
                        </div>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </app-tabla-datos>
        } @else if (estadoCarga() === 'FORBIDDEN' || estadoCarga() === 'UNAVAILABLE' || estadoCarga() === 'NETWORK_ERROR' || estadoCarga() === 'SERVER_ERROR') {
          <div role="alert" class="py-8 px-4 text-center space-y-3">
            @if (estadoCarga() === 'FORBIDDEN') {
              <p class="text-xs text-danger-700">No tienes autorización para consultar las justificaciones de este grupo.</p>
            } @else if (estadoCarga() === 'UNAVAILABLE') {
              <p class="text-xs text-warning-800">El servicio de justificaciones no está disponible (HTTP 501).</p>
            } @else if (estadoCarga() === 'NETWORK_ERROR') {
              <p class="text-xs text-danger-700">No fue posible conectar con el servicio de justificaciones.</p>
            } @else {
              <p class="text-xs text-danger-700">No fue posible cargar las justificaciones del grupo.</p>
            }
            <button type="button" data-accion="reintentar" (click)="reintentar.emit()" class="text-xs font-semibold text-primary-800 hover:text-primary-950 underline underline-offset-2">
              Reintentar consulta
            </button>
          </div>
        } @else {
          <p class="py-8 text-center text-xs text-warm-500">Selecciona un grupo para consultar sus justificaciones.</p>
        }

        <!-- Footer -->
        <div modal-footer class="flex items-center justify-between w-full pt-2">
          <button
            type="button"
            (click)="irABandejaGeneral.emit()"
            class="text-xs font-semibold text-primary-800 hover:text-primary-950 underline underline-offset-2"
          >
            Abrir Bandeja Completa de Justificaciones →
          </button>
          <app-button variant="primary" size="sm" (clicked)="closed.emit()">
            Cerrar
          </app-button>
        </div>
      </div>
    </app-modal>
  `
})
export class GroupClaimsModalComponent {
  isOpen = input<boolean>(false);
  course = input<Course | null | undefined>(null);
  reclamos = input<SolicitudRevisionItem[]>([]);
  /** Total del grupo según el servidor (la lista es solo la página vigente); sin él se usa la longitud de la lista. */
  totalReclamos = input<number | null>(null);
  pagina = input<number>(1);
  tamano = input<number>(15);
  estadoCarga = input<EstadoCargaReclamos>('IDLE');

  closed = output<void>();
  paginaChange = output<number>();
  resolver = output<{ id: string; accion: 'APROBADA' | 'RECHAZADA'; resultado?: ResultadoAprobacionReclamo }>();
  irABandejaGeneral = output<void>();
  reintentar = output<void>();

  readonly etiquetaEstado = etiquetaEstadoReclamo;

  textoResultado(rec: SolicitudRevisionItem): string | null {
    return rec.estadoSolicitud === 'APROBADA' ? etiquetaResultadoAprobacion(rec.resultadoAprobacion) : null;
  }

  getBadgeVariant(estado?: string): BadgeVariant {
    if (estado === 'APROBADA') return 'success';
    if (estado === 'RECHAZADA') return 'danger';
    if (estado === 'RETIRADA') return 'neutral';
    return 'warning';
  }
}

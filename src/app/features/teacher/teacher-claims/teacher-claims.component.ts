import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { Component, OnDestroy, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { isUuid } from '../../../core/utils/uuid.util';
import { Subject, Subscription, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import {
  DetalleReclamoDocenteItem,
  SolicitudRevisionItem,
  EstadoSolicitudRevision,
  EstadoTomaEstudiante,
  ResultadoAprobacionReclamo,
  SoporteAdjuntoItem,
} from '../../../core/models/role-management.model';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  TAMANOS_PAGINA_TABLA,
} from '../../../shared/components/tabla-datos/tabla-datos.component';
import { BadgeComponent, BadgeVariant } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { getApiErrorCode, getApiErrorMessage, getApiErrorResponse } from '../../../core/api/errors/api-error.util';
import { etiquetaEstadoReclamo, etiquetaResultadoAprobacion, varianteEstadoReclamo } from '../../../core/utils/reclamo-estado.util';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { CLAIM_RESPONSE_MAX, getClaimResponseError } from '../../../core/validation/form-fields.util';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

const ETIQUETA_ESTADO_TOMA_RECLAMO: Readonly<Record<EstadoTomaEstudiante, string>> = {
  PRESENTE: 'Presente',
  AUSENTE: 'Ausente',
  JUSTIFICADA: 'Justificada',
  SIN_REGISTRO: 'Sin registro',
};

type VistaDocenteReclamos = 'BANDEJA' | 'RESOLUCION';
type EstadoFiltroReclamos = 'TODOS' | 'P' | 'A' | 'R';
type ReclamosListState = 'LOADING' | 'LOADED' | 'FORBIDDEN' | 'NETWORK_ERROR' | 'SERVER_ERROR';

/** Espera tras la última tecla antes de pedir la búsqueda al servidor (no es sondeo: se dispara por la entrada del usuario). */
const BUSQUEDA_ESPERA_MS = 300;

@Component({
    selector: 'app-teacher-claims',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageHeaderComponent, 
    EmptyStateComponent,
    FormsModule,
    TablaDatosComponent,
    BadgeComponent,
    ButtonComponent,
    FormFieldComponent,
    AvatarComponent
],
    template: `
    <div class="space-y-4 animate-fade-in">
      <!-- 1. VISTA: BANDEJA GENERAL DE RECLAMOS -->
      @if (vistaActual() === 'BANDEJA') {
        <!-- Header Bento -->
        <app-page-header
          [enTarjeta]="true"
          etiqueta="Gestión Docente"
          contexto="Bandeja de Novedades"
          titulo="Justificaciones de Asistencia"
          descripcion="Selecciona una solicitud para abrir su vista completa de revisión, examinar el caso del estudiante y decidir la justificación."
        >
          <!-- Indicador de Pendientes -->
          <div cabecera-acciones class="flex items-center gap-3">
            <span class="px-3.5 py-1.5 rounded-xl bg-warning-50 text-warning-900 text-xs font-bold border border-warning-200">
              {{ totalPendientes() ?? '—' }} Pendientes por Resolver
            </span>
          </div>
        </app-page-header>

        @if (grupoFiltro()) {
          <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-xs text-primary-900" data-testid="filtro-grupo-activo">
            <span>Mostrando solo las justificaciones del grupo seleccionado.</span>
            <button type="button" class="min-h-[44px] font-bold underline" (click)="quitarFiltroGrupo()">Ver todas</button>
          </div>
        }

        <!-- Filtros y Búsqueda -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="sm:col-span-2">
            <div class="relative">
              <input
                type="text"
                aria-label="Buscar justificaciones por estudiante, materia o motivo"
                [value]="searchQuery()"
                (input)="onBuscar($event)"
                placeholder="Buscar por estudiante, materia o motivo..."
                class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm transition-all"
              />
              <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div>
            <select
              aria-label="Filtrar justificaciones por estado"
              [value]="estadoFiltro()"
              (change)="onEstadoChange($event)"
              class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm"
            >
              <option value="TODOS">Todas las justificaciones</option>
              <option value="P">Solo Pendientes</option>
              <option value="A">Solo Aprobados</option>
              <option value="R">Solo Rechazados</option>
            </select>
          </div>
        </div>

        <!-- Listado de Justificaciones -->
        @if (!isLoading() && listState() !== 'LOADED') {
          <div class="bg-danger-50 border border-danger-200 rounded-2xl p-4 text-center text-sm text-danger-900 space-y-3" role="alert">
            <p>{{ listStateMessage() }}</p>
            @if (listState() === 'NETWORK_ERROR' || listState() === 'SERVER_ERROR') {
              <app-button variant="secondary" size="sm" (clicked)="cargarReclamos()">Reintentar</app-button>
            }
          </div>
        } @else if (!isLoading() && reclamos().length === 0) {
          <div class="superficie p-4 text-center">
            <app-empty-state
              title="No hay justificaciones en esta categoría"
              description="Todas las solicitudes de asistencia se encuentran al día."
              causa="Cambia el filtro de estado para revisar las justificaciones en otros estados."
            />
          </div>
        } @else {
          <app-tabla-datos
            etiqueta="Justificaciones de asistencia"
            [columnas]="6"
            anchoMinimo="64rem"
            [filasEsqueleto]="6"
            [cargando]="isLoading()"
            [paginada]="true"
            [totalItems]="total()"
            [pagina]="pagina()"
            [tamanoPagina]="tamano()"
            [tamanosPagina]="tamanosPagina"
            (paginaChange)="cambiarPagina($event)"
            (tamanoPaginaChange)="cambiarTamano($event)"
          >
            <thead>
              <tr>
                <th scope="col">Estudiante</th>
                <th scope="col">Asignatura y sesión</th>
                <th scope="col">Justificación</th>
                <th scope="col">Radicado</th>
                <th scope="col">Estado</th>
                <th scope="col" class="text-right"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @if (!isLoading()) {
                @for (reclamo of reclamos(); track reclamo.id) {
                  <tr data-testid="justificacion-fila">
                    <td>
                      <div class="flex items-center gap-2.5">
                        <app-avatar [name]="reclamo.estudianteNombre" size="sm"></app-avatar>
                        <div class="min-w-0">
                          <p class="font-semibold text-warm-900">{{ reclamo.estudianteNombre }}</p>
                          <p class="text-xs text-warm-500">{{ reclamo.estudianteCorreo }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="text-xs">
                      <p class="font-semibold text-warm-900">{{ reclamo.materiaNombre }}</p>
                      <p class="text-warm-600">{{ reclamo.grupo }} · Sesión #{{ reclamo.sesionNumero }} ({{ reclamo.fechaSesion }})</p>
                      @if (textoTomaTarjeta(reclamo); as toma) {
                        <p class="font-semibold text-warm-900" data-testid="tarjeta-toma">{{ toma }}</p>
                      }
                    </td>
                    <td class="min-w-[16rem]">
                      @if (reclamo.categoria || reclamo.soporteAdjunto) {
                        <div class="flex flex-wrap items-center gap-1.5 mb-1">
                          @if (reclamo.categoria) {
                            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-warning-50 text-warning-900 border border-warning-200">
                              {{ categoriaTexto(reclamo.categoria) }}
                            </span>
                          }
                          @if (reclamo.soporteAdjunto) {
                            <span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary-50 text-primary-800 border border-primary-200" title="Tiene soporte documental anexo">
                              <svg class="w-3 h-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              Soporte
                            </span>
                          }
                        </div>
                      }
                      <p class="text-xs text-warm-700 line-clamp-2 italic">"{{ reclamo.justificacionSolicitud }}"</p>
                    </td>
                    <td class="whitespace-nowrap text-xs">
                      <span class="font-mono font-bold px-2 py-0.5 rounded-md bg-warm-100 text-warm-700">{{ reclamo.folio }}</span>
                      <p class="mt-1 text-warm-500">{{ reclamo.fechaSolicitud }}</p>
                    </td>
                    <td class="whitespace-nowrap">
                      <app-badge [variant]="getReclamoBadgeVariant(reclamo.estadoSolicitud)">
                        {{ etiquetaEstado(reclamo.estadoSolicitud) }}
                      </app-badge>
                      <p class="mt-1 text-xs text-warm-400">
                        {{ reclamo.estadoSolicitud === 'PENDIENTE' ? 'Pendiente de evaluación' : (reclamo.estadoSolicitud === 'RETIRADA' ? 'Retirada por el estudiante' : 'Evaluado') }}
                      </p>
                    </td>
                    <td class="text-right whitespace-nowrap">
                      <app-button
                        variant="secondary"
                        size="sm"
                        (clicked)="abrirVistaResolucion(reclamo)"
                      >
                        <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Revisar en Detalle
                      </app-button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </app-tabla-datos>
        }
      }

      <!-- 2. VISTA COMPLETA: EVALUACIÓN Y RESOLUCIÓN DEL RECLAMO -->
      @if (vistaActual() === 'RESOLUCION' && selectedReclamo()) {
        <!-- Barra Superior de Retorno -->
        <div class="superficie flex items-center justify-between p-4">
          <button
            type="button"
            (click)="volverABandeja()"
            class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a la Bandeja de Justificaciones
          </button>

          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
            Expediente: {{ selectedReclamo()?.folio }}
          </span>
        </div>

        <div class="superficie p-4 sm:p-8 max-w-4xl mx-auto space-y-4">
          <!-- Encabezado con estado -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-warm-100">
            <div>
              <h2 class="font-serif font-bold text-2xl text-warm-900">
                Evaluación de Solicitud de Asistencia
              </h2>
              <p class="text-xs text-warm-500 mt-0.5">
                Radicado el {{ selectedReclamo()?.fechaSolicitud }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              @if (selectedReclamo()?.categoria) {
                <span class="px-3 py-1 rounded-xl text-xs font-semibold bg-warning-50 text-warning-900 border border-warning-200">
                  {{ categoriaTexto($safeNavigationMigration(selectedReclamo()?.categoria)) }}
                </span>
              }
              <app-badge [variant]="getReclamoBadgeVariant(selectedReclamo()!.estadoSolicitud)" size="md">
                Estado: {{ etiquetaEstado($safeNavigationMigration(selectedReclamo()?.estadoSolicitud)) }}
              </app-badge>
            </div>
          </div>

          <!-- Ficha del Estudiante y Contexto de la Clase -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Estudiante -->
            <div class="p-4 rounded-xl bg-warm-50 border border-warm-200/80 flex items-center gap-3.5">
              <app-avatar [name]="selectedReclamo()?.estudianteNombre || 'Estudiante'" size="lg"></app-avatar>
              <div>
                <span class="text-[11px] font-bold text-warm-400 uppercase tracking-wider block">Estudiante Solicitante</span>
                <h4 class="font-serif font-bold text-base text-warm-900">{{ selectedReclamo()?.estudianteNombre }}</h4>
                <p class="text-xs text-warm-500">{{ selectedReclamo()?.estudianteCorreo }}</p>
              </div>
            </div>

            <!-- Materia y Sesión -->
            <div class="p-4 rounded-xl bg-warm-50 border border-warm-200/80 space-y-1">
              <span class="text-[11px] font-bold text-warm-400 uppercase tracking-wider block">Asignatura y Sesión</span>
              <h4 class="font-serif font-bold text-sm text-warm-900">
                {{ selectedReclamo()?.materiaNombre }} ({{ selectedReclamo()?.materiaCodigo }})
              </h4>
              <p class="text-xs text-warm-600">
                {{ selectedReclamo()?.grupo }} • Sesión #{{ selectedReclamo()?.sesionNumero }} ({{ selectedReclamo()?.fechaSesion }})
              </p>
              @if (textoTomaReclamada(selectedReclamo()); as toma) {
                <p class="text-xs font-bold text-warm-900" data-testid="detalle-toma">{{ toma }}</p>
              }
              @if (textoMinutosSesion(selectedReclamo()); as minutos) {
                <p class="text-xs text-warm-600" data-testid="detalle-minutos">{{ minutos }}</p>
              }
              @if (selectedReclamo()?.causalInasistencia; as causal) {
                <p class="text-xs font-bold text-danger-700">
                  Registro original: {{ causal.nombre }}
                  @if (causal.asistio !== null) {
                    ({{ causal.asistio ? 'Asistió' : 'No asistió' }})
                  }
                </p>
              } @else {
                <p class="text-xs font-bold text-warm-600">Sin registro de asistencia</p>
              }
            </div>
          </div>

          <!-- Justificación Completa del Estudiante -->
          <div class="space-y-2">
            <span class="text-xs font-bold uppercase tracking-wider text-warm-500 block">
              Motivo y justificación expuesta por el estudiante:
            </span>
            <div class="p-4 rounded-xl bg-warm-50 border border-warm-200 text-sm text-warm-800 leading-relaxed italic">
              "{{ selectedReclamo()?.justificacionSolicitud }}"
            </div>
          </div>

          <!-- Soporte Documental Anexo (múltiples soportes) -->
          @if (soportesReclamo(selectedReclamo()); as listaSoportes) {
            @if (listaSoportes.length > 0) {
              <div class="space-y-3">
                <span class="text-xs font-bold uppercase tracking-wider text-warm-500 block">
                  Soportes Documentales Anexos ({{ listaSoportes.length }}):
                </span>
                <div class="space-y-2">
                  @for (adjunto of listaSoportes; track (adjunto.fileId || adjunto.nombre); let idx = $index) {
                    <div class="p-4 bg-warm-50 border border-warm-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p class="text-sm font-bold text-warm-900">{{ adjunto.nombre }}</p>
                          <p class="text-xs text-warm-500">{{ adjunto.tamanioKb }} KB • Formato {{ adjunto.tipo }} @if (adjunto.fechaSubida) { • Subido el {{ adjunto.fechaSubida }} }</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        [attr.data-testid]="'btn-descargar-soporte-' + (adjunto.fileId || idx)"
                        (click)="descargarSoporte(adjunto)"
                        class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition-colors shadow-xs"
                      >
                        <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar Soporte
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          }

          <!-- Panel de Decisión Docente -->
          @if (selectedReclamo()?.estadoSolicitud === 'PENDIENTE') {
            <div class="space-y-4 pt-4 border-t border-warm-200">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-700 block">
                Resolución del Docente
              </span>

              <app-form-field
                label="Observaciones o retroalimentación para el estudiante (obligatoria al rechazar)"
                [errorMessage]="errorComentario()"
              >
                <textarea
                  [(ngModel)]="comentarioDocente"
                  [attr.maxlength]="maxComentario"
                  rows="4"
                  placeholder="Escribe un comentario explicativo sobre la aceptación o rechazo de la justificación..."
                  class="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                ></textarea>
                <p class="mt-1 text-xs text-warm-500">{{ comentarioDocente.trim().length }} / {{ maxComentario }}</p>
              </app-form-field>

              <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <app-button
                  variant="danger"
                  size="md"
                  data-testid="rechazar-justificacion"
                  [disabled]="resolviendo() || rechazoSinRespuestaValida()"
                  (clicked)="confirmarResolucion('RECHAZADA')"
                >
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Rechazar Justificación
                </app-button>

                @if (selectedReclamo()?.idToma) {
                  <app-button
                    variant="primary"
                    size="md"
                    data-testid="aprobar-presente"
                    [disabled]="resolviendo()"
                    (clicked)="confirmarResolucion('APROBADA', 'PRESENTE')"
                  >
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Estuvo presente
                  </app-button>
                }

                <app-button
                  [variant]="selectedReclamo()?.idToma ? 'secondary' : 'primary'"
                  size="md"
                  data-testid="aprobar-justificada"
                  [disabled]="resolviendo()"
                  (clicked)="confirmarResolucion('APROBADA', 'JUSTIFICADA')"
                >
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Ausencia justificada
                </app-button>
              </div>
            </div>
          } @else {
            <div class="p-4 rounded-xl bg-primary-50/60 border border-primary-200 space-y-1 text-xs">
              <span class="font-bold text-primary-900 block">Resolución registrada@if (selectedReclamo()?.fechaRespuesta) { el {{ selectedReclamo()?.fechaRespuesta }}}:</span>
              @if (textoResultado(selectedReclamo()); as resultado) {
                <p class="font-bold text-success-800" data-testid="detalle-resultado">{{ resultado }}</p>
              }
              <p class="text-primary-800 italic">"{{ selectedReclamo()?.justificacionRespuesta }}"</p>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class TeacherClaimsComponent implements OnInit, OnDestroy {
  private readonly claimService = inject(AttendanceClaimService);
  private readonly toast = inject(ToastService);
  private readonly zona = inject(SessionTimeZoneService);
  private readonly route = inject(ActivatedRoute, { optional: true });

  vistaActual = signal<VistaDocenteReclamos>('BANDEJA');
  reclamos = signal<SolicitudRevisionItem[]>([]);
  isLoading = signal<boolean>(true);
  /** Mensaje institucional del backend para el último fallo de la bandeja. */
  private readonly listaError = signal<string>('');
  listState = signal<ReclamosListState>('LOADING');
  searchQuery = signal<string>('');
  estadoFiltro = signal<EstadoFiltroReclamos>('TODOS');
  /** Grupo al que se acotó la bandeja desde un acceso rápido (`?grupo=`); `null` = todos los grupos. */
  grupoFiltro = signal<string | null>(null);
  pagina = signal<number>(1);
  /** Bloque E: 15 por página por defecto (15/30/50); el servidor acepta hasta 100 por página. */
  tamano = signal<number>(TAMANO_PAGINA_TABLA);
  readonly tamanosPagina = [...TAMANOS_PAGINA_TABLA];
  /** Total del servidor para el filtro vigente (no la longitud de la página cargada). */
  total = signal<number>(0);
  /** Total del servidor de solicitudes pendientes (`estado=P`); `null` mientras no se conoce. */
  totalPendientes = signal<number | null>(null);

  selectedReclamo = signal<DetalleReclamoDocenteItem | null>(null);
  abriendoDetalle = signal<boolean>(false);
  /** SES-04: una decisión en curso bloquea otra (doble clic o decisión contradictoria) hasta la respuesta real. */
  resolviendo = signal<boolean>(false);
  comentarioDocente = '';
  readonly maxComentario = CLAIM_RESPONSE_MAX;
  /** DEC-073: el aviso de respuesta obligatoria aparece tras intentar rechazar. */
  readonly intentoRechazo = signal(false);

  /** DEC-073: error de la respuesta (máximo 500; al rechazar, obligatoria de 10 a 500); vacío si es válida. */
  errorComentario(): string {
    const accion = this.intentoRechazo() ? 'RECHAZADA' : 'APROBADA';
    return getClaimResponseError(accion, this.comentarioDocente) ?? '';
  }

  /** Validación de forma: no se puede rechazar hasta que la respuesta obligatoria (10 a 500) sea válida. */
  rechazoSinRespuestaValida(): boolean {
    return getClaimResponseError('RECHAZADA', this.comentarioDocente) !== null;
  }

  private listaSub?: Subscription;
  private pendientesSub?: Subscription;
  private detalleSub?: Subscription;

  /** CIERRE-W1A: el texto de búsqueda viaja al servidor (con espera corta); la lista no se filtra en memoria. */
  private readonly busqueda$ = new Subject<string>();
  private busquedaSub?: Subscription;

  ngOnInit(): void {
    this.busquedaSub = this.busqueda$.pipe(debounceTime(BUSQUEDA_ESPERA_MS), distinctUntilChanged()).subscribe(() => {
      this.pagina.set(1);
      this.cargarReclamos();
    });
    this.aplicarEnlace();
    this.cargarReclamos();
  }

  /** Los accesos rápidos abren la bandeja ya acotada: `?estado=P|A|R` y `?grupo=<idGrupo>`; un valor desconocido se ignora. */
  private aplicarEnlace(): void {
    const params = this.route?.snapshot?.queryParamMap;
    const estado = params?.get('estado');
    if (estado === 'P' || estado === 'A' || estado === 'R') this.estadoFiltro.set(estado);
    const grupo = params?.get('grupo');
    if (isUuid(grupo)) this.grupoFiltro.set(grupo);
  }

  quitarFiltroGrupo(): void {
    this.grupoFiltro.set(null);
    this.pagina.set(1);
    this.cargarReclamos();
  }

  ngOnDestroy(): void {
    this.busquedaSub?.unsubscribe();
    this.listaSub?.unsubscribe();
    this.pendientesSub?.unsubscribe();
    this.detalleSub?.unsubscribe();
  }

  onBuscar(event: Event): void {
    const texto = (event.target as HTMLInputElement).value;
    this.searchQuery.set(texto);
    this.busqueda$.next(texto.trim());
  }

  onEstadoChange(event: Event): void {
    this.cambiarEstado((event.target as HTMLSelectElement).value as EstadoFiltroReclamos);
  }

  cambiarEstado(estado: EstadoFiltroReclamos): void {
    this.estadoFiltro.set(estado);
    this.pagina.set(1);
    this.cargarReclamos();
  }

  cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarReclamos();
  }

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
    this.cargarReclamos();
  }

  cargarReclamos(): void {
    this.listaSub?.unsubscribe();
    this.isLoading.set(true);
    this.listaError.set('');
    this.listState.set('LOADING');
    const estado = this.estadoFiltro();
    this.listaSub = this.claimService
      .getReclamosDocente({
        estado: estado === 'TODOS' ? undefined : estado,
        pagina: this.pagina(),
        tamano: this.tamano(),
        busqueda: this.searchQuery().trim() || undefined,
        grupoId: this.grupoFiltro() ?? undefined,
      })
      .subscribe({
        next: (res) => {
          const total = res.total ?? res.datos.length;
          const ultimaPagina = Math.max(1, Math.ceil(total / this.tamano()));
          if (res.datos.length === 0 && total > 0 && this.pagina() > ultimaPagina) {
            this.pagina.set(ultimaPagina);
            this.cargarReclamos();
            return;
          }
          this.reclamos.set(res.datos);
          this.total.set(total);
          this.listState.set('LOADED');
          this.isLoading.set(false);
          this.actualizarPendientes(estado, total);
        },
        error: (error: unknown) => {
          const status = (error as { status?: number })?.status;
          const errorRed = status === 0 ? 'NETWORK_ERROR' : 'SERVER_ERROR';
          this.listState.set(status === 403 ? 'FORBIDDEN' : errorRed);
          this.listaError.set(getApiErrorMessage(error));
          this.isLoading.set(false);
          this.toast.error(this.listaError());
        },
      });
  }

  /**
   * El contador de pendientes es siempre el total del servidor para `estado=P`: con el filtro Pendientes se reutiliza
   * el total de la propia lista; con otro filtro se consulta una sola fila de `estado=P` solo para leer su total.
   */
  private actualizarPendientes(estado: EstadoFiltroReclamos, totalLista: number): void {
    this.pendientesSub?.unsubscribe();
    if (estado === 'P' && !this.searchQuery().trim()) {
      this.totalPendientes.set(totalLista);
      return;
    }
    this.pendientesSub = this.claimService.getReclamosDocente({ estado: 'P', pagina: 1, tamano: 1 }).subscribe({
      next: (res) => this.totalPendientes.set(res.total ?? res.datos.length),
      error: () => this.totalPendientes.set(null),
    });
  }

  /** Abre la vista de resolución con el detalle real del backend (causal incluida); sin detalle no se abre. */
  abrirVistaResolucion(reclamo: SolicitudRevisionItem): void {
    if (this.abriendoDetalle()) return;
    this.abriendoDetalle.set(true);
    this.detalleSub?.unsubscribe();
    this.detalleSub = this.claimService
      .getDetalleReclamoDocente(reclamo.id)
      .pipe(finalize(() => this.abriendoDetalle.set(false)))
      .subscribe({
        next: (res) => {
          this.selectedReclamo.set(res.datos);
          this.comentarioDocente = res.datos.justificacionRespuesta || '';
          this.vistaActual.set('RESOLUCION');
        },
        error: (error: unknown) => this.toast.error(this.mensajeBackend(error)),
      });
  }

  volverABandeja(): void {
    this.vistaActual.set('BANDEJA');
    this.selectedReclamo.set(null);
  }

  /** "Toma N · HH:mm · estado actual" cuando el reclamo es de una toma; `null` si es de la sesión. */
  textoTomaReclamada(reclamo: DetalleReclamoDocenteItem | null): string | null {
    if (reclamo?.numeroToma == null) return null;
    const estado = reclamo.estadoToma ? ETIQUETA_ESTADO_TOMA_RECLAMO[reclamo.estadoToma] : null;
    return [this.textoTomaTarjeta(reclamo), estado].filter((parte) => !!parte).join(' · ');
  }

  /** Toma N · HH:mm (hora local, igual que el detalle) en la tarjeta de la bandeja; 
ull si el reclamo es de la sesión completa. */
  textoTomaTarjeta(reclamo: Pick<SolicitudRevisionItem, 'numeroToma' | 'fechaPuntoControlUtc'> | null): string | null {
    if (reclamo?.numeroToma == null) return null;
    const hora = reclamo.fechaPuntoControlUtc ? this.zona.formatTemporal(reclamo.fechaPuntoControlUtc, 'time') : null;
    return ['Toma ' + reclamo.numeroToma, hora].filter((parte) => !!parte).join(' · ');
  }

  /** "Asistencia de la sesión: X de Y min" (cálculo del backend). */
  textoMinutosSesion(reclamo: DetalleReclamoDocenteItem | null): string | null {
    if (reclamo?.minutosAsistidos == null || reclamo.minutosSesion == null) return null;
    return `Asistencia de la sesión: ${reclamo.minutosAsistidos} de ${reclamo.minutosSesion} min`;
  }

  textoResultado(reclamo: DetalleReclamoDocenteItem | null): string | null {
    return reclamo?.estadoSolicitud === 'APROBADA' ? etiquetaResultadoAprobacion(reclamo.resultadoAprobacion) : null;
  }

  /** `resultado` solo aplica al aprobar: "PRESENTE" (reclamo con toma) o "JUSTIFICADA". */
  confirmarResolucion(accion: 'APROBADA' | 'RECHAZADA', resultado?: ResultadoAprobacionReclamo): void {
    const reclamo = this.selectedReclamo();
    if (!reclamo || this.resolviendo()) return;
    if (resultado === 'PRESENTE' && !reclamo.idToma) return;

    // DEC-073: al rechazar la respuesta la escribe el docente (10 a 500); al aprobar es opcional y se usa un texto por defecto.
    this.intentoRechazo.set(accion === 'RECHAZADA');
    const errorRespuesta = getClaimResponseError(accion, this.comentarioDocente);
    if (errorRespuesta) {
      this.toast.warning(errorRespuesta);
      return;
    }
    const aprobacion = resultado === 'PRESENTE' ? 'Se confirmó que el estudiante estuvo presente en la toma.' : 'Justificación válida y aceptada.';
    const feedback = this.comentarioDocente.trim() || aprobacion;

    this.resolviendo.set(true);
    this.claimService
      .resolverReclamo(reclamo.id, accion, feedback, accion === 'APROBADA' ? resultado ?? 'JUSTIFICADA' : undefined)
      .pipe(finalize(() => this.resolviendo.set(false)))
      .subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.toast.success(res.mensajeUsuario || mensajeUi('UI_TEACHER_CLAIMS_001'));
            this.cargarReclamos();
            this.volverABandeja();
          }
        },
        error: (err) => {
          this.toast.error(this.mensajeBackend(err));
          // SES-04: si otra decisión ya resolvió el reclamo (o dejó de existir), la bandeja muestra el estado real.
          if (['ERR_RECLAMO_YA_RESUELTO', 'ERR_RECLAMO_NO_EXISTE'].includes(getApiErrorCode(err))) {
            this.cargarReclamos();
          }
        },
      });
  }

  /** Muestra el `message` institucional del backend; sin envelope usa la resolución por código existente. */
  private mensajeBackend(error: unknown): string {
    return getApiErrorResponse(error)?.message.trim() || getApiErrorMessage(error);
  }

  /** El texto lo entrega el backend (catálogo institucional); aquí no se muestran códigos HTTP ni nombres de contratos. */
  listStateMessage(): string {
    return this.listaError() || mensajeUi('API_ERROR_DEFAULT');
  }

  descargandoSoporte = signal<boolean>(false);

  /**
   * Descarga autenticada: el interceptor agrega el Bearer a la peticion HttpClient; nunca se abre una URL del storage
   * ni se envia el token en la URL. El backend responde 404 si el docente ya no es titular.
   */
  descargarSoporte(adjunto: SoporteAdjuntoItem): void {
    if (!adjunto.fileId) {
      this.toast.warning(mensajeUi('UI_TEACHER_CLAIMS_002'));
      return;
    }
    if (this.descargandoSoporte()) return;
    this.descargandoSoporte.set(true);
    this.claimService
      .descargarSoporte(adjunto.fileId)
      .pipe(finalize(() => this.descargandoSoporte.set(false)))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = adjunto.nombre.replace(/[\\/:*?"<>|\r\n]/g, '_');
          anchor.click();
          URL.revokeObjectURL(url);
          this.toast.success(mensajeUi('UI_SOPORTE_DESCARGADO', { nombre: adjunto.nombre }));
        },
        error: (error) => this.toast.error(this.mensajeErrorDescarga(error)),
      });
  }

  private mensajeErrorDescarga(error: unknown): string {
    switch ((error as { status?: number })?.status) {
      case 401:
        return 'Tu sesión expiró. Inicia sesión nuevamente para descargar el soporte.';
      case 404:
        return 'El soporte ya no está disponible o ya no tienes autorización para descargarlo.';
      case 0:
        return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
      default:
        return getApiErrorMessage(error);
    }
  }

  categoriaTexto(cat: unknown): string {
    if (!cat) return '';
    if (typeof cat === 'object') {
      const obj = cat as { nombre?: string; codigo?: string };
      return obj.nombre || obj.codigo || '';
    }
    return String(cat);
  }

  soportesReclamo(reclamo: SolicitudRevisionItem | null): SoporteAdjuntoItem[] {
    if (!reclamo) return [];
    if (reclamo.soportes && reclamo.soportes.length > 0) return reclamo.soportes;
    if (reclamo.soporteAdjunto) return [reclamo.soporteAdjunto];
    return [];
  }

  readonly etiquetaEstado = etiquetaEstadoReclamo;

  getReclamoBadgeVariant(estado: EstadoSolicitudRevision): BadgeVariant {
    return varianteEstadoReclamo(estado);
  }
}

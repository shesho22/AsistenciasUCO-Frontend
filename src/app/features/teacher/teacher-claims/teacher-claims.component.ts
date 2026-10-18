import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import {
  SolicitudRevisionItem,
  EstadoSolicitudRevision,
  SoporteAdjuntoItem,
} from '../../../core/models/role-management.model';
import { CardComponent } from '../../../shared/components/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

type VistaDocenteReclamos = 'BANDEJA' | 'RESOLUCION';
type ReclamosListState = 'LOADING' | 'LOADED' | 'UNAVAILABLE' | 'FORBIDDEN' | 'NETWORK_ERROR' | 'SERVER_ERROR';

@Component({
  selector: 'app-teacher-claims',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    FormFieldComponent,
    AvatarComponent,
  ],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- 1. VISTA: BANDEJA GENERAL DE RECLAMOS -->
      @if (vistaActual() === 'BANDEJA') {
        <!-- Header Bento -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-800 border border-primary-200">
                Gestión Docente
              </span>
              <span class="text-xs text-warm-400">•</span>
              <span class="text-xs font-medium text-warm-500">Bandeja de Novedades</span>
            </div>
            <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
              Reclamos y Justificaciones de Asistencia
            </h1>
            <p class="text-sm text-warm-600 mt-1">
              Selecciona una solicitud para abrir su vista completa de revisión, examinar el caso del estudiante y decidir la justificación.
            </p>
          </div>

          <!-- Indicador de Pendientes -->
          <div class="flex items-center gap-3">
            <span class="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200">
              {{ totalPendientes() }} Pendientes por Resolver
            </span>
          </div>
        </div>

        @if (listUnavailable()) {
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
            El listado de reclamos docentes está pendiente del contrato backend y responde <strong>501 Not Implemented</strong>.
            La resolución individual permanece disponible cuando se conoce el identificador del reclamo.
          </div>
        }

        <!-- Filtros y Búsqueda -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="sm:col-span-2">
            <div class="relative">
              <input
                type="text"
                [(ngModel)]="searchQuery"
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
              [(ngModel)]="selectedEstado"
              class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm"
            >
              <option value="TODOS">Todos los reclamos</option>
              <option value="PENDIENTE">Solo Pendientes</option>
              <option value="APROBADA">Solo Aprobados</option>
              <option value="RECHAZADA">Solo Rechazados</option>
            </select>
          </div>
        </div>

        <!-- Listado de Reclamos -->
        @if (isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            @for (n of [1, 2, 3, 4]; track n) {
              <div class="h-56 bg-warm-100 rounded-2xl animate-pulse"></div>
            }
          </div>
        } @else if (listState() !== 'LOADED') {
          <div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-sm text-red-900">
            {{ listStateMessage() }}
          </div>
        } @else if (filteredReclamos().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
            <div class="w-12 h-12 rounded-full bg-warm-100 text-warm-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-warm-900">No hay reclamos en esta categoría</h3>
            <p class="text-xs text-warm-500 mt-1">Todas las solicitudes de asistencia se encuentran al día.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            @for (reclamo of filteredReclamos(); track reclamo.id) {
              <app-card [hoverable]="true" padding="md">
                <div class="flex flex-col h-full justify-between gap-4">
                  <div>
                    <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-warm-100 text-warm-700">
                          REC-#{{ reclamo.id.slice(0, 8).toUpperCase() }}
                        </span>
                        @if (reclamo.categoria) {
                          <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                            {{ reclamo.categoria }}
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
                        <app-badge [variant]="getReclamoBadgeVariant(reclamo.estadoSolicitud)">
                          {{ reclamo.estadoSolicitud }}
                        </app-badge>
                      </div>

                      <span class="text-[11px] text-warm-400">
                        {{ reclamo.fechaSolicitud }}
                      </span>
                    </div>

                    <!-- Datos Estudiante -->
                    <div class="flex items-center gap-3 my-2">
                      <app-avatar [name]="reclamo.estudianteNombre" size="md"></app-avatar>

                      <div class="min-w-0">
                        <h3 class="font-serif font-bold text-base text-warm-900 truncate">
                          {{ reclamo.estudianteNombre }}
                        </h3>
                        <p class="text-xs text-warm-500 truncate">{{ reclamo.estudianteCorreo }}</p>
                      </div>
                    </div>

                    <!-- Resumen del Curso -->
                    <div class="p-2.5 rounded-xl bg-warm-50 border border-warm-100 text-xs space-y-1 my-2">
                      <div class="flex items-center justify-between">
                        <span class="font-semibold text-warm-900">{{ reclamo.materiaNombre }}</span>
                        <span class="font-bold text-warm-600">Grupo {{ reclamo.grupo }}</span>
                      </div>
                      <div class="flex items-center justify-between text-warm-600">
                        <span>Sesión #{{ reclamo.sesionNumero }} ({{ reclamo.fechaSesion }})</span>
                        <span class="font-bold text-red-700">Falla: {{ reclamo.estadoOriginal }}</span>
                      </div>
                    </div>

                    <p class="text-xs text-warm-700 line-clamp-2 italic mt-2">
                      "{{ reclamo.justificacionSolicitud }}"
                    </p>
                  </div>

                  <div class="flex items-center justify-between pt-3 border-t border-warm-100">
                    <span class="text-xs text-warm-400">
                      {{ reclamo.estadoSolicitud === 'PENDIENTE' ? 'Pendiente de evaluación' : 'Evaluado' }}
                    </span>
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
                  </div>
                </div>
              </app-card>
            }
          </div>
        }
      }

      <!-- 2. VISTA COMPLETA: EVALUACIÓN Y RESOLUCIÓN DEL RECLAMO -->
      @if (vistaActual() === 'RESOLUCION' && selectedReclamo()) {
        <!-- Barra Superior de Retorno -->
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <button
            type="button"
            (click)="volverABandeja()"
            class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a la Bandeja de Reclamos
          </button>

          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
            Expediente: REC-#{{ selectedReclamo()?.id?.slice(0, 8)?.toUpperCase() }}
          </span>
        </div>

        <div class="bg-white p-6 sm:p-8 rounded-2xl border border-warm-200 shadow-warm-sm max-w-4xl mx-auto space-y-6">
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
                <span class="px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                  {{ selectedReclamo()?.categoria }}
                </span>
              }
              <app-badge [variant]="getReclamoBadgeVariant(selectedReclamo()!.estadoSolicitud)" size="md">
                Estado: {{ selectedReclamo()?.estadoSolicitud }}
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
                Grupo: {{ selectedReclamo()?.grupo }} • Sesión #{{ selectedReclamo()?.sesionNumero }} ({{ selectedReclamo()?.fechaSesion }})
              </p>
              <p class="text-xs font-bold text-red-700">Registro original: {{ selectedReclamo()?.estadoOriginal }}</p>
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

          <!-- Soporte Documental Anexo -->
          @if (selectedReclamo()?.soporteAdjunto; as adjunto) {
            <div class="space-y-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-500 block">
                Soporte Documental Anexo:
              </span>
              <div class="p-4 bg-warm-50 border border-warm-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-bold text-warm-900">{{ adjunto.nombre }}</p>
                    <p class="text-xs text-warm-500">{{ adjunto.tamanioKb }} KB • Formato {{ adjunto.tipo }} • Subido el {{ adjunto.fechaSubida }}</p>
                  </div>
                </div>

                <button
                  type="button"
                  (click)="descargarSoporte(adjunto)"
                  class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition-colors shadow-xs"
                >
                  <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar Soporte
                </button>
              </div>
            </div>
          }

          <!-- Panel de Decisión Docente -->
          @if (selectedReclamo()?.estadoSolicitud === 'PENDIENTE') {
            <div class="space-y-4 pt-4 border-t border-warm-200">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-700 block">
                Resolución del Docente
              </span>

              <app-form-field label="Observaciones o retroalimentación para el estudiante">
                <textarea
                  [(ngModel)]="comentarioDocente"
                  rows="4"
                  placeholder="Escribe un comentario explicativo sobre la aceptación o rechazo de la justificación..."
                  class="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                ></textarea>
              </app-form-field>

              <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <app-button
                  variant="danger"
                  size="md"
                  (clicked)="confirmarResolucion('RECHAZADA')"
                >
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Rechazar Reclamo
                </app-button>

                <app-button
                  variant="primary"
                  size="md"
                  (clicked)="confirmarResolucion('APROBADA')"
                >
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Aceptar y Justificar Asistencia
                </app-button>
              </div>
            </div>
          } @else {
            <div class="p-4 rounded-xl bg-primary-50/60 border border-primary-200 space-y-1 text-xs">
              <span class="font-bold text-primary-900 block">Resolución registrada el {{ selectedReclamo()?.fechaRespuesta }}:</span>
              <p class="text-primary-800 italic">"{{ selectedReclamo()?.justificacionRespuesta }}"</p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TeacherClaimsComponent implements OnInit {
  private claimService = inject(AttendanceClaimService);
  private toast = inject(ToastService);

  vistaActual = signal<VistaDocenteReclamos>('BANDEJA');
  reclamos = signal<SolicitudRevisionItem[]>([]);
  isLoading = signal<boolean>(true);
  listUnavailable = signal<boolean>(false);
  listState = signal<ReclamosListState>('LOADING');
  searchQuery = '';
  selectedEstado: string = 'TODOS';

  selectedReclamo = signal<SolicitudRevisionItem | null>(null);
  comentarioDocente = '';

  totalPendientes = computed(() => {
    return this.reclamos().filter((r) => r.estadoSolicitud === 'PENDIENTE').length;
  });

  filteredReclamos = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    const estado = this.selectedEstado;

    return this.reclamos().filter((item) => {
      const matchQuery =
        !query ||
        item.estudianteNombre.toLowerCase().includes(query) ||
        item.materiaNombre.toLowerCase().includes(query) ||
        item.materiaCodigo.toLowerCase().includes(query) ||
        item.justificacionSolicitud.toLowerCase().includes(query);

      const matchEstado = estado === 'TODOS' || item.estadoSolicitud === estado;

      return matchQuery && matchEstado;
    });
  });

  ngOnInit(): void {
    this.cargarReclamos();
  }

  cargarReclamos(): void {
    this.isLoading.set(true);
    this.listUnavailable.set(false);
    this.listState.set('LOADING');
    this.claimService.getReclamosDocente().subscribe({
      next: (res) => {
        this.reclamos.set(res.datos || []);
        this.listState.set('LOADED');
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        const status = (error as { status?: number })?.status;
        this.listState.set(status === 501
          ? 'UNAVAILABLE'
          : status === 403
            ? 'FORBIDDEN'
            : status === 0
              ? 'NETWORK_ERROR'
              : 'SERVER_ERROR');
        this.listUnavailable.set(status === 501);
        this.isLoading.set(false);
        if (status !== 501) this.toast.error(getApiErrorMessage(error));
      },
    });
  }

  abrirVistaResolucion(reclamo: SolicitudRevisionItem): void {
    this.selectedReclamo.set(reclamo);
    this.comentarioDocente = reclamo.justificacionRespuesta || '';
    this.vistaActual.set('RESOLUCION');
  }

  volverABandeja(): void {
    this.vistaActual.set('BANDEJA');
    this.selectedReclamo.set(null);
  }

  confirmarResolucion(accion: 'APROBADA' | 'RECHAZADA'): void {
    const reclamo = this.selectedReclamo();
    if (!reclamo) return;

    const feedback = this.comentarioDocente.trim() || (accion === 'APROBADA' ? 'Justificación válida y aceptada.' : 'No cumple con los soportes requeridos.');

    this.claimService.resolverReclamo(reclamo.id, accion, feedback).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || 'Reclamo procesado.');
          this.cargarReclamos();
          this.volverABandeja();
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  listStateMessage(): string {
    switch (this.listState()) {
      case 'FORBIDDEN': return 'No tienes autorización para consultar los reclamos de este alcance institucional (403).';
      case 'NETWORK_ERROR': return 'No se pudo conectar con el backend. La lista no se reemplazó por datos simulados.';
      case 'SERVER_ERROR': return 'El backend no pudo cargar los reclamos. Intenta nuevamente más tarde.';
      case 'UNAVAILABLE': return 'El listado de reclamos todavía no está implementado en el backend (501).';
      default: return 'No fue posible cargar los reclamos.';
    }
  }

  descargarSoporte(adjunto: SoporteAdjuntoItem): void {
    if (!adjunto.fileId) {
      this.toast.warning('Este soporte no contiene un fileId descargable en el contrato actual.');
      return;
    }
    this.claimService.descargarSoporte(adjunto.fileId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = adjunto.nombre;
        anchor.click();
        URL.revokeObjectURL(url);
        this.toast.success(`Soporte "${adjunto.nombre}" descargado.`);
      },
      error: (error) => this.toast.error(getApiErrorMessage(error)),
    });
  }

  getReclamoBadgeVariant(estado: EstadoSolicitudRevision): BadgeVariant {
    switch (estado) {
      case 'APROBADA':
        return 'success';
      case 'RECHAZADA':
        return 'danger';
      case 'PENDIENTE':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}

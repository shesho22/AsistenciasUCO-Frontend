import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import {
  MateriaEstudianteItem,
  SesionMateriaDetalle,
  EstadoAsistenciaSesionEstudiante,
} from '../../../../core/models/role-management.model';
import { LoadErrorState } from '../../../../core/api/errors/load-error.util';

@Component({
  selector: 'app-student-course-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BadgeComponent, ButtonComponent],
  template: `
    @if (materia()) {
      <div class="space-y-6">
        <!-- Barra Superior de Navegación "Atrás" -->
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <button
            type="button"
            (click)="back.emit()"
            class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Mis Materias
          </button>

          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
            @if (materia()?.codigo) {
              <span>{{ materia()?.codigo }} • </span>
            }
            <span>{{ materia()?.grupo }}</span>
          </span>
        </div>

        <!-- Ficha Resumen de la Asignatura -->
        <div class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="md:col-span-3 space-y-2">
            <div class="flex items-center gap-2">
              @if (materia()?.creditos) {
                <span class="text-xs font-semibold px-2 py-0.5 rounded bg-primary-50 text-primary-800 border border-primary-200">
                  {{ materia()?.creditos }} Créditos
                </span>
              }
              @if (materia()?.estado) {
                <app-badge [variant]="getBadgeVariant(materia()!.estado)">
                  {{ materia()?.estado }}
                </app-badge>
              }
            </div>
            <h2 class="font-serif font-bold text-2xl text-warm-900">
              {{ materia()?.nombre }}
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-warm-600 pt-2 border-t border-warm-100">
              <div>
                <span class="text-warm-400 block text-[11px]">Docente</span>
                <strong class="text-warm-800">{{ materia()?.docente ?? 'No informado' }}</strong>
              </div>
              <div>
                <span class="text-warm-400 block text-[11px]">Horario Asignado</span>
                <strong class="text-warm-800">{{ materia()?.horario ?? 'No informado' }}</strong>
              </div>
              <div>
                <span class="text-warm-400 block text-[11px]">Aula de Clase</span>
                <strong class="text-warm-800">{{ materia()?.aula ?? 'No informada' }}</strong>
              </div>
            </div>
          </div>

          <!-- Métricas de Asistencia (solo con fuente autoritativa) -->
          <div class="p-4 rounded-xl bg-warm-50 border border-warm-100 flex flex-col justify-between text-center">
            @if (materia()?.indicadores; as ind) {
              <div>
                <span class="text-xs text-warm-500 font-medium">Asistencia Acumulada</span>
                <p class="text-3xl font-serif font-bold text-primary-800 my-1">{{ ind.porcentajeAsistencia }}%</p>
              </div>
              <div class="text-[11px] text-warm-500 space-y-0.5 border-t border-warm-200/80 pt-2">
                <p>{{ ind.asistencias }} asistencias de {{ ind.totalClases }} clases</p>
                <p class="text-red-700 font-semibold">{{ ind.inasistencias }} fallas registradas</p>
              </div>
            } @else {
              <div data-testid="detalle-asistencia-no-disponible">
                <span class="text-xs text-warm-500 font-medium">Asistencia Acumulada</span>
                <p class="text-base font-serif font-bold text-warm-500 my-2">No disponible</p>
                <p class="text-[11px] text-warm-400">El sistema aún no expone tu asistencia consolidada.</p>
              </div>
            }
          </div>
        </div>

        <!-- Tabla Completa de Sesiones de Clase -->
        <div class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm overflow-hidden">
          <div class="p-5 border-b border-warm-100 flex items-center justify-between">
            <div>
              <h3 class="font-serif font-bold text-lg text-warm-900">Historial Detallado de Sesiones</h3>
              <p class="text-xs text-warm-500">Listado cronológico de clases, estados y novedades de asistencia.</p>
            </div>
            @if (!loading() && !error()) {
              <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-warm-100 text-warm-700" data-testid="conteo-sesiones">
                {{ sesiones().length }} {{ sesiones().length === 1 ? 'sesión' : 'sesiones' }}
              </span>
            }
          </div>

          @if (loading()) {
            <div class="p-6 space-y-3">
              @for (n of [1, 2, 3, 4]; track n) {
                <div class="h-16 bg-warm-100 rounded-xl animate-pulse"></div>
              }
            </div>
          } @else if (error()) {
            <div class="p-10 text-center space-y-3" role="alert" data-testid="sesiones-error">
              <p class="text-sm font-bold text-red-800">{{ error()!.titulo }}</p>
              <p class="text-xs text-warm-600">{{ error()!.mensaje }}</p>
              @if (error()!.kind !== 'IDENTIFICADOR') {
                <app-button variant="secondary" size="sm" (clicked)="retry.emit()">Reintentar</app-button>
              }
            </div>
          } @else if (sesiones().length === 0) {
            <div class="p-12 text-center text-warm-400" data-testid="sesiones-vacio">
              <p class="text-sm">No hay sesiones registradas para este grupo.</p>
            </div>
          } @else {
            <div class="divide-y divide-warm-100">
              @for (sesion of sesiones(); track sesion.id) {
                <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-warm-50/50 transition-colors">
                  <div class="space-y-1.5 flex-1 min-w-0">
                    <div class="flex items-center gap-3">
                      <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
                        Sesión #{{ sesion.numeroSesion }}
                      </span>
                      <span class="text-xs font-medium text-warm-500">{{ sesion.fecha }}</span>
                      <span class="text-warm-300">•</span>
                      <span
                        class="text-xs text-warm-600"
                        [attr.title]="sesion.temporalidad === 'SIN_ZONA' ? 'El servidor entregó la hora sin zona horaria; se muestra sin convertir.' : null"
                      >{{ sesion.horario }}{{ sesion.temporalidad === 'SIN_ZONA' ? ' (sin zona)' : '' }}</span>
                    </div>

                    <h4 class="font-bold text-sm text-warm-900 leading-snug">
                      {{ sesion.tema }}
                    </h4>

                    @if (sesion.justificacionEstudiante) {
                      <div class="p-3 rounded-xl bg-warm-50 border border-warm-200 text-xs text-warm-700 mt-1 space-y-1">
                        <div class="flex items-center gap-2">
                          @if (sesion.categoriaReclamo) {
                            <span class="px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 font-semibold text-[11px]">
                              {{ sesion.categoriaReclamo }}
                            </span>
                          }
                          @if (sesion.soporteAdjuntoNombre) {
                            <span class="inline-flex items-center gap-1 text-primary-700 font-medium text-[11px] bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200/60">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              {{ sesion.soporteAdjuntoNombre }}
                            </span>
                          }
                        </div>
                        <p class="italic text-warm-800">
                          <strong class="font-semibold text-warm-900">Justificación enviada:</strong> "{{ sesion.justificacionEstudiante }}"
                        </p>
                      </div>
                    }

                    @if (sesion.respuestaDocente) {
                      <div class="p-2.5 rounded-xl bg-primary-50 border border-primary-200 text-xs text-primary-900 mt-1">
                        <strong class="text-primary-800">Respuesta del docente:</strong> "{{ sesion.respuestaDocente }}"
                      </div>
                    }
                  </div>

                  <!-- Estado y Botón de Reclamación / Retiro -->
                  <div class="flex flex-wrap items-center gap-2 shrink-0 sm:self-center">
                    @if (sesion.estadoAsistencia !== 'NO_DISPONIBLE') {
                      <app-badge [variant]="getAsistenciaBadgeVariant(sesion.estadoAsistencia)" size="md">
                        {{ sesion.estadoAsistencia }}
                      </app-badge>
                    } @else {
                      <span
                        class="text-xs font-medium px-2.5 py-1 rounded-lg border border-warm-200 bg-warm-50 text-warm-500"
                        data-testid="estado-no-disponible"
                        title="Aún no hay un registro de asistencia confirmado para esta sesión; no se puede radicar revisión."
                      >Estado no disponible</span>
                    }

                    @if (sesion.estadoReclamo) {
                      <span
                        [class]="getReclamoStatusClasses(sesion.estadoReclamo)"
                        class="text-xs font-bold px-2.5 py-1 rounded-lg border"
                      >
                        Reclamo {{ sesion.estadoReclamo }}
                      </span>

                      @if (sesion.estadoReclamo === 'PENDIENTE') {
                        <button
                          type="button"
                          (click)="withdrawClaim.emit(sesion)"
                          class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                          title="Retirar solicitud de revisión pendiente"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Retirar
                        </button>
                      }
                    } @else if (sesion.solicitudRevision) {
                      <span
                        class="text-xs font-bold px-2.5 py-1 rounded-lg border border-warm-200 bg-warm-50 text-warm-700"
                        data-testid="solicitud-existente"
                      >Solicitud de revisión: {{ etiquetaSolicitud(sesion.solicitudRevision) }}</span>
                    } @else if (sesion.reclamable) {
                      <app-button
                        variant="primary"
                        size="sm"
                        (clicked)="startClaim.emit(sesion)"
                      >
                        <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Radicar Reclamo
                      </app-button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class StudentCourseDetailComponent {
  materia = input<MateriaEstudianteItem | null>(null);
  sesiones = input<SesionMateriaDetalle[]>([]);
  loading = input<boolean>(false);
  error = input<LoadErrorState | null>(null);

  retry = output<void>();
  back = output<void>();
  startClaim = output<SesionMateriaDetalle>();
  withdrawClaim = output<SesionMateriaDetalle>();

  getBadgeVariant(estado: MateriaEstudianteItem['estado'] | undefined): BadgeVariant {
    switch (estado) {
      case 'Al día':
        return 'success';
      case 'Riesgo':
        return 'warning';
      case 'Crítico':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  etiquetaSolicitud(estado: NonNullable<SesionMateriaDetalle['solicitudRevision']>): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'pendiente';
      case 'APROBADA':
        return 'aprobada';
      case 'RECHAZADA':
        return 'rechazada';
      default:
        return 'en trámite';
    }
  }

  getAsistenciaBadgeVariant(estado: EstadoAsistenciaSesionEstudiante): BadgeVariant {
    switch (estado) {
      case 'PRESENTE':
        return 'success';
      case 'RETARDO':
        return 'warning';
      case 'AUSENTE':
        return 'danger';
      case 'JUSTIFICADA':
        return 'info';
      default:
        return 'neutral';
    }
  }

  getReclamoStatusClasses(estado: string): string {
    switch (estado) {
      case 'APROBADA':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'RECHAZADA':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  }
}

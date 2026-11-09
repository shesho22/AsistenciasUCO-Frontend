import { Component, ChangeDetectionStrategy, computed, input, output, signal, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AttendanceStatusBadgeComponent } from '../../../../shared/components/attendance-status-badge/attendance-status-badge.component';
import { SesionEstadoBadgeComponent } from '../../../../shared/components/sesion-estado-badge/sesion-estado-badge.component';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import {
  MateriaEstudianteItem,
  SesionMateriaDetalle,
  EstadoAsistenciaSesionEstudiante,
} from '../../../../core/models/role-management.model';
import { LoadErrorState } from '../../../../core/api/errors/load-error.util';
import { CategoriaJustificacionItem } from '../../../../core/models/consultas-transversales.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { ordenarSesionesCronologicamente } from '../../../../core/utils/sesiones-orden.util';
import { MotivosJustificacionComponent } from './motivos-justificacion.component';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { onRealtimeReconnect } from '../../../../core/realtime/realtime-reconnect-trigger';
import { REALTIME_EVENT_TYPE } from '../../../../core/realtime/model/realtime-event.model';
import { ToastService } from '../../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-student-course-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BadgeComponent, ButtonComponent, MotivosJustificacionComponent, SesionEstadoBadgeComponent, AttendanceStatusBadgeComponent, PaginationComponent],
  template: `
    @if (materia()) {
      <div class="space-y-6">
        <!-- Barra Superior de Navegación "Atrás" -->
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <button
            type="button"
            (click)="back.emit()"
            class="inline-flex items-center gap-2 min-h-[44px] text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
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
              @if (materia()?.caracter) {
                <span data-testid="detalle-caracter" class="text-xs font-semibold px-2 py-0.5 rounded bg-warm-100 text-warm-800">{{ materia()?.caracter }}</span>
              }
              @if (materia()?.estadoMatricula === 'CI') {
                <span
                  data-testid="badge-estado-matricula"
                  class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger-50 text-danger-800 border border-danger-200"
                >
                  Cancelado por inasistencia
                </span>
              } @else if (materia()?.estado) {
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
                <span class="text-warm-400 block text-xs">Docente</span>
                <strong class="text-warm-800">{{ materia()?.docente ?? 'No informado' }}</strong>
              </div>
              <div>
                <span class="text-warm-400 block text-xs">Horario Asignado</span>
                <strong class="text-warm-800">{{ materia()?.horario ?? 'No informado' }}</strong>
              </div>
            </div>
          </div>

          <!-- Métricas de Asistencia (solo con fuente autoritativa) -->
          <div class="p-4 rounded-xl bg-warm-50 border border-warm-100 flex flex-col justify-between text-center">
            @if (materia()?.indicadores; as ind) {
              <div>
                <span class="text-xs text-warm-500 font-medium">Inasistencia (por horas)</span>
                <p class="text-3xl font-serif font-bold text-primary-800 my-1" data-testid="detalle-porcentaje-inasistencia">{{ ind.porcentajeInasistencia }}%</p>
                <app-attendance-status-badge [codigoPermanencia]="ind.codigoPermanencia" />
              </div>
              <div class="text-xs text-warm-500 space-y-0.5 border-t border-warm-200/80 pt-2">
                <p data-testid="detalle-horas">{{ ind.horasFalta }} h de falta de {{ ind.horasDictadas }} h dictadas</p>
                <p>{{ ind.horasExcusa }} h con excusa</p>
                <p>Advertencia desde {{ ind.umbralAdvertencia }}% · pérdida desde {{ ind.umbralPerdida }}%</p>
              </div>
            } @else {
              <div data-testid="detalle-asistencia-no-disponible">
                <span class="text-xs text-warm-500 font-medium">Asistencia Acumulada</span>
                <p class="text-base font-serif font-bold text-warm-500 my-2">No disponible</p>
                <p class="text-xs text-warm-400">El sistema aún no expone tu asistencia consolidada.</p>
              </div>
            }
          </div>
        </div>

        <!-- HU016: motivos posibles para justificar una inasistencia o llegada tarde -->
        <app-motivos-justificacion [categorias]="categorias()" />

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
              <p class="text-sm font-bold text-danger-800">{{ error()!.titulo }}</p>
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
              @for (sesion of sesionesPagina(); track sesion.id) {
                <div
                  class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-warm-50/50 transition-colors"
                  [attr.data-testid]="'sesion-' + sesion.id"
                >
                  <div class="space-y-1.5 flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
                        Sesión #{{ sesion.numeroSesion }}
                      </span>
                      <span class="text-xs font-medium text-warm-500">{{ sesion.fecha }}</span>
                      @if (sesion.horasSesion !== undefined) {
                        <span class="text-xs text-warm-500" data-testid="sesion-horas">{{ sesion.horasSesion }} h</span>
                      }
                      <span class="text-warm-300">•</span>
                      <span
                        class="text-xs text-warm-600"
                        [attr.title]="sesion.temporalidad === 'SIN_ZONA' ? 'El servidor entregó la hora sin zona horaria; se muestra sin convertir.' : null"
                      >{{ sesion.horario }}{{ sesion.temporalidad === 'SIN_ZONA' ? ' (sin zona)' : '' }}</span>
                    </div>

                    <h4 class="font-bold text-sm text-warm-900 leading-snug">
                      {{ sesion.tema }}
                    </h4>

                    @if (sesion.estado !== 'CANCELADA' && textoPlazo(sesion); as plazo) {
                      <p
                        class="text-xs font-medium"
                        [class.text-warm-600]="sesion.plazoJustificacionVigente !== false"
                        [class.text-danger-700]="sesion.plazoJustificacionVigente === false"
                        [id]="'plazo-' + sesion.id"
                        data-testid="sesion-plazo"
                      >{{ plazo }}</p>
                    }

                    @if (sesion.justificacionEstudiante) {
                      <div class="p-3 rounded-xl bg-warm-50 border border-warm-200 text-xs text-warm-700 mt-1 space-y-1">
                        <div class="flex items-center gap-2">
                          @if (sesion.categoriaReclamo) {
                            <span class="px-2 py-0.5 rounded-md bg-warning-100/80 text-warning-900 font-semibold text-xs">
                              {{ sesion.categoriaReclamo }}
                            </span>
                          }
                          @if (sesion.soporteAdjuntoNombre) {
                            <span class="inline-flex items-center gap-1 text-primary-700 font-medium text-xs bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200/60">
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
                    @if (sesion.estado === 'CANCELADA') {
                      <app-sesion-estado-badge [estado]="sesion.estado" [cancelacion]="sesion.cancelacion" />
                    } @else if (sesion.estadoAsistencia !== 'NO_DISPONIBLE') {
                      <app-badge [variant]="getAsistenciaBadgeVariant(sesion.estadoAsistencia)" size="md">
                        {{ sesion.estadoAsistencia }}
                      </app-badge>
                    } @else {
                      <span
                        class="text-xs font-medium px-2.5 py-1 rounded-lg border border-warm-200 bg-warm-50 text-warm-500"
                        data-testid="estado-no-disponible"
                        title="Aún no hay un registro de asistencia confirmado para esta sesión; no se puede radicar revisión."
                      >Sin registro</span>
                    }

                    @if (sesion.estadoReclamo) {
                      <span
                        [class]="getReclamoStatusClasses(sesion.estadoReclamo)"
                        class="text-xs font-bold px-2.5 py-1 rounded-lg border"
                      >
                        {{ sesion.estadoReclamo === 'RETIRADA' ? 'Retirada' : 'Reclamo ' + sesion.estadoReclamo }}
                      </span>

                      @if (sesion.estadoReclamo === 'PENDIENTE') {
                        <button
                          type="button"
                          (click)="withdrawClaim.emit(sesion)"
                          class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-danger-700 bg-danger-50 hover:bg-danger-100 border border-danger-200 rounded-lg transition-colors"
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
                    } @else if (sesion.reclamable && sesion.estado !== 'CANCELADA' && sesion.plazoJustificacionVigente === false) {
                      <button
                        type="button"
                        aria-disabled="true"
                        title="El plazo para justificar esta inasistencia ya no está vigente."
                        [attr.aria-describedby]="'plazo-' + sesion.id"
                        class="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-xl border border-warm-200 bg-warm-100 text-warm-500 cursor-not-allowed"
                        data-testid="radicar-bloqueado"
                      >Radicar Reclamo</button>
                    } @else if (sesion.reclamable && sesion.estado !== 'CANCELADA' && materia()?.estadoMatricula !== 'CI') {
                      <app-button
                        variant="primary"
                        size="sm"
                        data-testid="btn-iniciar-reclamo"
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
            <app-pagination
              [totalItems]="sesionesOrdenadas().length"
              [pageSize]="tamano()"
              [currentPage]="paginaEfectiva()"
              [showPageSizeSelector]="true"
              [pageSizeOptions]="[10, 20, 50]"
              (pageChange)="pagina.set($event)"
              (pageSizeChange)="cambiarTamano($event)"
            />
          }
        </div>
      </div>
    }
  `,
})
export class StudentCourseDetailComponent implements OnDestroy {
  private readonly realtime = inject(RealtimeService, { optional: true });
  private readonly toast = inject(ToastService, { optional: true });
  private subRealtime?: Subscription;

  materia = input<MateriaEstudianteItem | null>(null);
  sesiones = input<SesionMateriaDetalle[]>([]);
  /** HU016: catálogo de motivos de justificación (solo consulta). */
  categorias = input<CategoriaJustificacionItem[]>([]);
  loading = input<boolean>(false);
  error = input<LoadErrorState | null>(null);

  constructor() {
    effect(() => {
      const mat = this.materia();
      const grupoId = mat?.idGrupo;
      const estadoMatricula = mat?.estadoMatricula;

      if (!this.realtime || !grupoId) {
        return;
      }

      if (estadoMatricula === 'CI') {
        return;
      }

      this.iniciarRealtime(grupoId);
    });
  }

  private iniciarRealtime(grupoId: string): void {
    if (!this.realtime) return;
    this.subRealtime?.unsubscribe();
    this.realtime.startForGroup(grupoId);

    const sub = new Subscription();

    sub.add(
      onRealtimeReconnect(this.realtime.connectionState$).subscribe(() => {
        this.retry.emit();
      })
    );

    const events$ = this.realtime.events ? this.realtime.events() : this.realtime.listenType?.(REALTIME_EVENT_TYPE.ASISTENCIAS_SESION_ACTUALIZADAS);
    if (events$) {
      sub.add(
        events$.subscribe((evt) => {
          if (!evt) return;
          if (
            evt.type === REALTIME_EVENT_TYPE.ASISTENCIAS_SESION_ACTUALIZADAS ||
            evt.type === REALTIME_EVENT_TYPE.REVISION_CANCELACION_RESOLUCION ||
            evt.type === REALTIME_EVENT_TYPE.REVISION_CANCELACION_RESUELTA
          ) {
            this.retry.emit();
          } else if (evt.type === REALTIME_EVENT_TYPE.ALERTA_INASISTENCIA) {
            if (this.toast) {
              const msg =
                (evt.payload as any)?.mensaje ||
                'Se ha generado una alerta sobre tu porcentaje de inasistencia.';
              this.toast.warning(msg);
            }
            this.retry.emit();
          }
        })
      );
    }

    this.subRealtime = sub;
  }

  ngOnDestroy(): void {
    this.subRealtime?.unsubscribe();
    if (this.realtime) {
      this.realtime.stop();
    }
  }

  /** Cronologico (F-EST-S17): el orden de llegada del backend no esta garantizado. */
  readonly sesionesOrdenadas = computed(() => ordenarSesionesCronologicamente(this.sesiones()));
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly paginaEfectiva = computed(() =>
    Math.min(this.pagina(), Math.max(1, Math.ceil(this.sesionesOrdenadas().length / this.tamano())))
  );
  readonly sesionesPagina = computed(() => {
    const inicio = (this.paginaEfectiva() - 1) * this.tamano();
    return this.sesionesOrdenadas().slice(inicio, inicio + this.tamano());
  });

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
  }

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

  /** CULM-001 D.1: texto del plazo de justificacion; `null` si el backend no lo informo (despliegue anterior). */
  textoPlazo(sesion: SesionMateriaDetalle): string | null {
    const fecha = sesion.fechaLimiteJustificacionLocal;
    if (sesion.plazoJustificacionVigente === false) {
      return fecha ? `Plazo vencido · venció el ${fecha}` : 'Sin plazo';
    }
    return fecha ? `Justificable hasta ${fecha}` : null;
  }

  etiquetaSolicitud(estado: NonNullable<SesionMateriaDetalle['solicitudRevision']>): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'pendiente';
      case 'APROBADA':
        return 'aprobada';
      case 'RECHAZADA':
        return 'rechazada';
      case 'RETIRADA':
        return 'retirada';
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
      case 'PARCIAL':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  getReclamoStatusClasses(estado: string): string {
    switch (estado) {
      case 'APROBADA':
        return 'bg-success-50 text-success-800 border-success-200';
      case 'RECHAZADA':
        return 'bg-danger-50 text-danger-800 border-danger-200';
      case 'RETIRADA':
        return 'bg-warm-100 text-warm-700 border-warm-200';
      default:
        return 'bg-warning-50 text-warning-800 border-warning-200';
    }
  }
}

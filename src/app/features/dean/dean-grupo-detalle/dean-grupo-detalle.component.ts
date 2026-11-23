import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { Component, OnInit, OnDestroy, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { DeanFacultadService, GrupoDetalleDecanoApiDto } from '../../../core/services/dean-facultad.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { resolveSessionInstant } from '../../../core/time/session-timezone.util';
import { Course } from '../../../core/models/course.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { rotuloSesionNoCancelada } from '../../../core/models/sesion-estado.model';
import { SesionEstadoBadgeComponent } from '../../../shared/components/sesion-estado-badge/sesion-estado-badge.component';
import { SesionFacultadItem } from '../../../core/models/facultad-decano.model';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { onRealtimeReconnect } from '../../../core/realtime/realtime-reconnect-trigger';
import { REALTIME_EVENT_TYPE, RealtimeEvent } from '../../../core/realtime/model/realtime-event.model';

function adaptarGrupoACurso(dto: GrupoDetalleDecanoApiDto): Course {
  return {
    id: dto.id ?? '',
    code: dto.codigo ?? dto.code ?? '',
    name: dto.nombreAsignatura ?? dto.nombreMateria ?? dto.name ?? dto.nombre ?? '',
    section: dto.nombre ?? dto.seccion ?? dto.section ?? '',
    schedule: dto.horario ?? dto.schedule ?? '',
    room: dto.aula ?? dto.room ?? '',
    enrolledStudentsCount: dto.estudiantesActivos ?? dto.totalEstudiantes ?? dto.enrolledStudentsCount ?? 0,
    cupoMaximo: dto.capacidadMaximaPermitida ?? dto.cupoMaximo,
    colorCategory: 'blue',
  };
}

@Component({
    selector: 'app-dean-grupo-detalle',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [EmptyStateComponent, SesionEstadoBadgeComponent, PaginationComponent, BadgeComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      <!-- Barra de Retorno -->
      <div class="superficie flex items-center justify-between p-4">
        <button
          type="button"
          (click)="volverAGrupos()"
          class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Grupos de la Facultad
        </button>

        @if (selectedCourse(); as curso) {
          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
            {{ curso.code }} • {{ curso.section }}
          </span>
        }
      </div>

      @if (errorGrupo() !== null) {
        <div class="bg-white p-6 rounded-2xl border border-danger-200 text-center" role="alert">
          <p class="text-sm font-semibold text-danger-700">No fue posible cargar los datos del grupo.</p>
          <p class="text-xs text-danger-700 mt-1">{{ errorGrupo() }}</p>
        </div>
      }

      @if (errorGrupo() === null ? selectedCourse() : null; as curso) {
        <!-- Ficha Resumen del Grupo -->
        <div class="superficie p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="md:col-span-3 space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-800 border border-primary-200">
                {{ curso.code }}
              </span>
              <span class="text-xs font-bold text-warm-600">{{ curso.section }}</span>
            </div>
            <h1 class="font-serif font-bold text-2xl text-warm-900">{{ curso.name }}</h1>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-warm-600 pt-2 border-t border-warm-100">
              <div>
                <span class="text-warm-400 block text-[11px]">Horario Regular</span>
                <strong class="text-warm-800">{{ curso.schedule }}</strong>
              </div>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-warm-50 border border-warm-100 flex flex-col justify-between text-center">
            <div>
              <span class="text-xs text-warm-500 font-medium">Aforo Ocupado</span>
              <p class="text-3xl font-serif font-bold text-primary-800 my-1">
                @if (curso.cupoMaximo) { {{ curso.enrolledStudentsCount }} / {{ curso.cupoMaximo }} } @else { {{ curso.enrolledStudentsCount ?? 0 }} }
              </p>
            </div>
            <div class="text-[11px] text-warm-500 pt-2 border-t border-warm-200/80">
              <span>{{ curso.cupoMaximo ? 'Cupo Ofertado Facultad' : 'Sin cupo definido' }}</span>
            </div>
          </div>
        </div>
      }

      <!-- Cronograma de Sesiones del Grupo -->
      <div class="superficie overflow-hidden">
        <div class="p-5 border-b border-warm-100 flex items-center justify-between">
          <div>
            <h2 class="font-serif font-bold text-lg text-warm-900">Sesiones de Clase Registradas</h2>
            <p class="text-xs text-warm-500">Cronograma de clases del grupo y asistencias consolidadas.</p>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-warm-100 text-warm-700">
            {{ sessions().length }} sesiones
          </span>
        </div>

        @if (cargandoSesiones()) {
          <div class="p-10 text-center text-sm text-warm-500" role="status">Cargando sesiones…</div>
        } @else if (errorSesiones() !== null) {
          <div class="p-10 text-center text-sm text-danger-700" role="alert">
            <p class="font-semibold">No fue posible cargar las sesiones del grupo.</p>
            <p class="text-xs mt-1">{{ errorSesiones() }}</p>
            <button type="button" (click)="cargarSesiones()" class="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg border border-danger-200 hover:bg-danger-50">
              Reintentar
            </button>
          </div>
        } @else if (sessions().length === 0) {
          <app-empty-state
            title="No hay sesiones registradas para este grupo."
            causa="El docente titular aún no ha programado sesiones en este período."
          />
        } @else {
          <!-- MEJORAS-SERGIO 6: tabla densa (una línea por sesión) y paginada, en lugar de una tarjeta alta por sesión -->
          <div class="tabla-scroll">
            <table class="w-full text-xs text-warm-800" data-testid="tabla-sesiones-grupo">
              <thead class="bg-warm-50 border-b border-warm-200 text-[11px] font-bold text-warm-600 uppercase tracking-wider">
                <tr>
                  <th scope="col" class="px-4 py-2 text-left w-16">Sem.</th>
                  <th scope="col" class="px-4 py-2 text-left">Fecha</th>
                  <th scope="col" class="px-4 py-2 text-left">Horario</th>
                  <th scope="col" class="px-4 py-2 text-left">Sesión</th>
                  <th scope="col" class="px-4 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-warm-100">
                @for (s of sesionesPagina(); track s.id) {
                  <tr class="hover:bg-warm-50/50 transition-colors" [attr.data-testid]="'sesion-fila-' + s.id">
                    <td class="px-4 py-2 font-mono font-bold text-warm-700">{{ s.numeroSemana ?? '—' }}</td>
                    @if (inicio(s) && fin(s)) {
                      <td class="px-4 py-2 whitespace-nowrap text-warm-700">{{ timeZone.formatTemporal(inicio(s), 'date') }}</td>
                      <td class="px-4 py-2 whitespace-nowrap font-mono text-warm-800">
                        {{ timeZone.formatTemporal(inicio(s), 'time') }} - {{ timeZone.formatTemporal(fin(s), 'time') }}
                      </td>
                    } @else {
                      <td class="px-4 py-2 font-semibold text-warning-800" colspan="2">Horario no confirmado</td>
                    }
                    <td class="px-4 py-2 font-semibold text-warm-900 max-w-xs truncate" [title]="s.nombre">{{ s.nombre }}</td>
                    <td class="px-4 py-2" data-testid="sesion-estado">
                      @if (s.estado === 'CANCELADA') {
                        <app-sesion-estado-badge [estado]="s.estado" [cancelacion]="s.cancelacion" />
                      } @else {
                        <app-badge size="sm" [variant]="rotuloEstado(s) === 'Dictada' ? 'success' : 'neutral'">{{ rotuloEstado(s) }}</app-badge>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (sesionesIncompletas()) {
            <p class="px-4 py-2 text-xs text-warning-800 bg-warning-50 border-t border-warning-200" role="status" data-testid="aviso-sesiones-incompletas">
              Se muestran {{ sessions().length }} de {{ totalSesionesServidor() }} sesiones: el servidor no entregó el resto. Recarga la página para intentarlo de nuevo.
            </p>
          }
          <!-- El paginador se ve siempre que haya más sesiones que el tamaño de página más pequeño, para poder volver de «50» a «10». -->
          @if (sessions().length > tamanosSesiones[0]) {
            <div class="p-3 border-t border-warm-100" data-testid="paginador-sesiones">
              <app-pagination
                [totalItems]="sessions().length"
                [pageSize]="tamanoSesiones()"
                [pageSizeOptions]="tamanosSesiones"
                [currentPage]="paginaSesiones()"
                (pageChange)="paginaSesiones.set($event)"
                (pageSizeChange)="cambiarTamanoSesiones($event)"
              />
            </div>
          }
        }
      </div>
    </div>
  `
})
export class DeanGrupoDetalleComponent implements OnInit, OnDestroy {
  private readonly deanService = inject(DeanFacultadService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly timeZone = inject(SessionTimeZoneService);
  private readonly realtime = inject(RealtimeService, { optional: true });
  private subRealtime?: Subscription;

  grupoId = input<string>();

  selectedCourse = signal<Course | null>(null);
  sessions = signal<SesionFacultadItem[]>([]);
  cargandoSesiones = signal(false);
  /** Mensaje del último error al cargar sesiones; `null` si la última carga terminó bien (aunque sea vacía). */
  errorSesiones = signal<string | null>(null);
  /**
   * MEJORAS-SERGIO 6: paginación local de la tabla de sesiones. Se traen TODAS las sesiones del grupo (recorriendo las
   * páginas del servidor de 100 en 100) y la tabla las pagina en el cliente.
   */
  readonly tamanosSesiones = [10, 20, 50];
  paginaSesiones = signal(1);
  tamanoSesiones = signal(20);
  /** `totalElementos` del servidor; si lo recibido no lo alcanza se avisa en lugar de truncar en silencio. */
  totalSesionesServidor = signal(0);
  sesionesIncompletas = computed(() => this.totalSesionesServidor() > this.sessions().length);
  private subSesiones?: Subscription;
  sesionesPagina = computed(() => {
    const inicio = (this.paginaSesiones() - 1) * this.tamanoSesiones();
    return this.sessions().slice(inicio, inicio + this.tamanoSesiones());
  });

  cambiarTamanoSesiones(tamano: number): void {
    this.tamanoSesiones.set(tamano);
    this.paginaSesiones.set(1);
  }
  /** Mensaje del backend si falla la carga de la ficha del grupo (403/500). */
  errorGrupo = signal<string | null>(null);

  effectiveGrupoId = computed(() => {
    return this.grupoId() || this.route.snapshot.paramMap.get('grupoId') || '';
  });

  ngOnInit(): void {
    const id = this.effectiveGrupoId();
    if (id) {
      this.deanService.getGrupoDetalle(id).subscribe({
        next: (res) => this.selectedCourse.set(res.datos ? adaptarGrupoACurso(res.datos) : null),
        error: (error: unknown) => this.errorGrupo.set(getApiErrorMessage(error)),
      });
      this.cargarSesiones(id);
      this.iniciarRealtime(id);
    }
  }

  private iniciarRealtime(grupoId: string): void {
    if (!this.realtime) return;
    this.subRealtime?.unsubscribe();
    this.realtime.startForGroup(grupoId);

    const sub = new Subscription();
    sub.add(
      onRealtimeReconnect(this.realtime.connectionState$).subscribe(() => {
        this.cargarSesiones();
      })
    );

    // Compatibilidad con dobles de prueba que solo exponen `events$`.
    const events$: Observable<RealtimeEvent & { tipo?: string }> | undefined = this.realtime.events
      ? this.realtime.events()
      : (this.realtime as unknown as { events$?: Observable<RealtimeEvent> }).events$;
    if (events$) {
      sub.add(
        events$.subscribe((evt) => {
          if (!evt) return;
          const tipo = evt.type || evt.tipo;
          if (
            tipo === REALTIME_EVENT_TYPE.ALERTA_INASISTENCIA ||
            tipo === REALTIME_EVENT_TYPE.REVISION_CANCELACION_CREADA ||
            tipo === REALTIME_EVENT_TYPE.REVISION_CANCELACION_PROPUESTA ||
            tipo === REALTIME_EVENT_TYPE.REVISION_CANCELACION_DECIDIDA ||
            tipo === REALTIME_EVENT_TYPE.REVISION_CANCELACION_RESOLUCION ||
            tipo === REALTIME_EVENT_TYPE.REVISION_CANCELACION_RESUELTA ||
            tipo === REALTIME_EVENT_TYPE.ASISTENCIAS_SESION_ACTUALIZADAS ||
            tipo === 'REVISION_CANCELACION_PROPUESTA' ||
            tipo === 'REVISION_CANCELACION_RESOLUCION'
          ) {
            this.cargarSesiones();
          }
        })
      );
    }

    this.subRealtime = sub;
  }

  ngOnDestroy(): void {
    this.subRealtime?.unsubscribe();
    this.subSesiones?.unsubscribe();
    if (this.realtime) {
      this.realtime.stop();
    }
  }

  /** Inicio de la sesión: instante UTC si está confirmado; si no, el valor v1 sin zona (se muestra literal). */
  /** Estado visible de una sesión no cancelada (la cancelada la rotula `app-sesion-estado-badge`). */
  rotuloEstado(s: SesionFacultadItem): 'Programada' | 'Dictada' {
    return rotuloSesionNoCancelada(this.fin(s));
  }

  inicio(s: SesionFacultadItem): string | null {
    return resolveSessionInstant(s.fechaHoraInicio, s.fechaHoraInicioUtc, s.estadoTemporal);
  }

  fin(s: SesionFacultadItem): string | null {
    return resolveSessionInstant(s.fechaHoraFin, s.fechaHoraFinUtc, s.estadoTemporal);
  }

  /**
   * Las sesiones del grupo salen del cronograma de la facultad (GET /decano/sesiones?idGrupo={id}, ámbito forzado en backend):
   * GET /sesiones/grupo/{id} es del docente titular y le responde 403 al decano.
   */
  cargarSesiones(idGrupo?: string): void {
    const id = idGrupo || this.effectiveGrupoId();
    if (!id) {
      return;
    }
    this.cargandoSesiones.set(true);
    this.errorSesiones.set(null);
    // Una recarga (reconexión o evento en tiempo real) reemplaza a la anterior: su respuesta tardía no pisa la nueva.
    this.subSesiones?.unsubscribe();
    this.subSesiones = this.deanService.getTodasLasSesionesGrupo(id).subscribe({
      next: (res) => {
        this.sessions.set(res.elementos ?? []);
        this.totalSesionesServidor.set(res.total ?? 0);
        this.paginaSesiones.set(1);
        this.cargandoSesiones.set(false);
      },
      error: (error: unknown) => {
        const mensaje = getApiErrorMessage(error);
        this.sessions.set([]);
        this.totalSesionesServidor.set(0);
        this.errorSesiones.set(mensaje);
        this.cargandoSesiones.set(false);
        this.toast.error(mensaje);
      },
    });
  }

  volverAGrupos(): void {
    void this.router.navigate(['/app/decano/directorio/grupos']);
  }
}

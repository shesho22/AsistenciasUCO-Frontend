import { Component, OnInit, OnDestroy, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DeanFacultadService } from '../../../core/services/dean-facultad.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { Course } from '../../../core/models/course.model';
import { SesionEstadoBadgeComponent } from '../../../shared/components/sesion-estado-badge/sesion-estado-badge.component';
import { SesionFacultadItem } from '../../../core/models/facultad-decano.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { onRealtimeReconnect } from '../../../core/realtime/realtime-reconnect-trigger';
import { REALTIME_EVENT_TYPE } from '../../../core/realtime/model/realtime-event.model';

function adaptarGrupoACurso(dto: any): Course {
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
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, SesionEstadoBadgeComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Barra de Retorno -->
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
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
        <div class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm grid grid-cols-1 md:grid-cols-4 gap-6">
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
      <div class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm overflow-hidden">
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
          <div class="p-10 text-center text-sm text-warm-500">
            No hay sesiones registradas para este grupo.
          </div>
        } @else {
          <div class="divide-y divide-warm-100">
            @for (s of sessions(); track s.id) {
              <div
                class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-warm-50/50 transition-colors"
                [attr.data-testid]="'sesion-fila-' + s.id"
              >
                <div class="space-y-1 flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    @if (s.numeroSemana !== null) {
                      <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-warm-100 text-warm-800">Semana {{ s.numeroSemana }}</span>
                    }
                    @if (s.fechaHoraInicio && s.fechaHoraFin) {
                      <span class="text-xs font-medium text-warm-600">{{ fecha(s.fechaHoraInicio).date }}</span>
                      <span class="text-warm-300">•</span>
                      <span class="text-xs font-mono font-bold text-warm-800">
                        {{ fecha(s.fechaHoraInicio).time }} - {{ fecha(s.fechaHoraFin).time }}
                      </span>
                    } @else {
                      <span class="text-xs font-semibold text-warning-800">Horario no confirmado</span>
                    }
                  </div>
                  <h3 class="font-bold text-sm text-warm-900">{{ s.nombre }}</h3>
                  <app-sesion-estado-badge [estado]="s.estado" [cancelacion]="s.cancelacion" />
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class DeanGrupoDetalleComponent implements OnInit, OnDestroy {
  private deanService = inject(DeanFacultadService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly timeZone = inject(SessionTimeZoneService);
  private readonly realtime = inject(RealtimeService, { optional: true });
  private subRealtime?: Subscription;

  grupoId = input<string>();

  selectedCourse = signal<Course | null>(null);
  sessions = signal<SesionFacultadItem[]>([]);
  cargandoSesiones = signal(false);
  /** Mensaje del último error al cargar sesiones; `null` si la última carga terminó bien (aunque sea vacía). */
  errorSesiones = signal<string | null>(null);
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

    const events$ = this.realtime.events ? this.realtime.events() : (this.realtime as any).events$;
    if (events$) {
      sub.add(
        events$.subscribe((evt: any) => {
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
    if (this.realtime) {
      this.realtime.stop();
    }
  }

  fecha(instante: string): { date: string; time: string } {
    return this.timeZone.displayInstant(instante);
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
    this.deanService.getSesiones({ idGrupo: id, pagina: 1, tamano: 50 }).subscribe({
      next: (res) => {
        this.sessions.set(res.elementos ?? []);
        this.cargandoSesiones.set(false);
      },
      error: (error: unknown) => {
        const mensaje = getApiErrorMessage(error);
        this.sessions.set([]);
        this.errorSesiones.set(mensaje);
        this.cargandoSesiones.set(false);
        this.toast.error(mensaje);
      },
    });
  }

  volverAGrupos(): void {
    void this.router.navigate(['/app/decano/grupos']);
  }
}

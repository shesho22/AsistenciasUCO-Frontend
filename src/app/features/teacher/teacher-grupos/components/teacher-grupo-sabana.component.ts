import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  input,
  inject,
  computed,
  effect,
  signal,
  untracked,
  OnDestroy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { EstudianteGrupoItem, idEstudianteDe } from '../../../../core/models/estudiante-grupo-item.model';
import { ClassSession } from '../../../../core/models/attendance.model';
import { estaCancelada } from '../../../../core/models/sesion-estado.model';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';
import { TeacherAttendanceSummaryService } from '../../../../core/services/teacher-attendance-summary.service';
import { ResumenAsistenciaEstudiante } from '../../../../core/models/indicadores-asistencia.model';
import { AttendanceStatusBadgeComponent } from '../../../../shared/components/attendance-status-badge/attendance-status-badge.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { SemaforoAsistenciaComponent } from '../../../../shared/components/semaforo-asistencia/semaforo-asistencia.component';
import { InasistenciaMarcaBadgeComponent } from '../../../../shared/components/inasistencia-marca-badge/inasistencia-marca-badge.component';
import { RevisionDecisionModalComponent } from '../../revision-cancelacion/revision-decision-modal.component';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { onRealtimeReconnect } from '../../../../core/realtime/realtime-reconnect-trigger';
import { REALTIME_EVENT_TYPE } from '../../../../core/realtime/model/realtime-event.model';

@Component({
  selector: 'app-teacher-grupo-sabana',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    AttendanceStatusBadgeComponent,
    PaginationComponent,
    InasistenciaMarcaBadgeComponent,
    SemaforoAsistenciaComponent,
    RevisionDecisionModalComponent,
  ],
  template: `
    <div class="bg-white rounded-b-2xl border-x border-b border-warm-200 shadow-warm-sm p-6 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warm-100">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-900 border border-primary-200">
              Sábana Académica Institucional
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-semibold text-warm-600">Inasistencia calculada por horas</span>
          </div>
          <h3 class="font-serif font-bold text-xl text-warm-900">Matriz General de Asistencia Semestral</h3>
          <p class="text-xs text-warm-500">
            Visualización consolidada de todos los estudiantes contra todas las sesiones del curso en una sola sábana.
          </p>
        </div>

        <!-- Leyenda Aurora & Semáforo UCO -->
        <div class="flex flex-wrap items-center gap-3 text-xs bg-warm-50 p-2.5 rounded-xl border border-warm-200">
          <span class="flex items-center gap-1.5 font-semibold text-success-800">
            <span class="w-3 h-3 rounded-full bg-success-500 inline-block"></span>
            Presente (AN)
          </span>
          <span class="flex items-center gap-1.5 font-semibold text-warning-800">
            <span class="w-3 h-3 rounded-full bg-warning-400 inline-block"></span>
            Excusa (EX)
          </span>
          <span class="flex items-center gap-1.5 font-semibold text-danger-800">
            <span class="w-3 h-3 rounded-full bg-danger-500 inline-block"></span>
            Falta Injustificada (SJC)
          </span>
        </div>
      </div>

      @if (cargando()) {
        <div class="p-8 space-y-3">
          <div class="h-8 bg-warm-100 rounded-lg animate-pulse"></div>
          <div class="h-16 bg-warm-100 rounded-xl animate-pulse"></div>
          <div class="h-16 bg-warm-100 rounded-xl animate-pulse"></div>
        </div>
      } @else if (estudiantes().length === 0) {
        <div class="p-12 text-center text-warm-400 bg-warm-50/50 rounded-2xl border border-dashed border-warm-200">
          <p class="text-sm font-medium">No hay estudiantes matriculados en este grupo para generar la sábana.</p>
        </div>
      } @else if (sessions().length === 0) {
        <div class="p-12 text-center text-warm-400 bg-warm-50/50 rounded-2xl border border-dashed border-warm-200">
          <p class="text-sm font-medium">No se han programado sesiones lectivas para este grupo todavía.</p>
        </div>
      } @else {
        @if (errorResumen()) {
          <p class="rounded-xl bg-danger-100 text-danger-900 px-4 py-2 text-sm font-medium" role="alert" data-testid="sabana-resumen-error">
            {{ errorResumen() }}
          </p>
        }
        <!-- Tabla Matriz con Scroll Horizontal Fluido -->
        <div class="overflow-x-auto border border-warm-200 rounded-2xl shadow-xs">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-warm-100/80 border-b border-warm-200 text-warm-800 uppercase tracking-wider text-xs">
                <th scope="col" class="p-3.5 sticky left-0 z-20 bg-warm-100/95 font-bold min-w-[200px] border-r border-warm-200 shadow-xs">
                  Estudiante (Documento)
                </th>
                @for (ses of sessions(); track ses.id) {
                  <th
                    scope="col"
                    class="p-2.5 text-center min-w-[70px] border-r border-warm-200"
                    [class.opacity-60]="esCancelada(ses)"
                    [attr.data-testid]="'sabana-col-' + ses.id"
                    [title]="ses.title + ' - ' + displayDate(ses)"
                  >
                    <div class="font-mono font-bold text-primary-900">#{{ ses.sessionNumber }}</div>
                    @if (ses.estadoTemporal === 'INDETERMINADA') {
                      <div class="text-xs text-warning-700 font-semibold truncate">Sin fecha</div>
                    } @else {
                      <div class="text-xs text-warm-500 font-normal truncate">{{ displayDate(ses) | slice:5 }}</div>
                    }
                    @if (esCancelada(ses)) {
                      <div class="text-xs font-semibold text-warning-800">Cancelada</div>
                    }
                    <span
                      class="inline-block w-1.5 h-1.5 rounded-full mt-0.5 bg-success-500"
                      [title]="ses.estadoTemporal === 'INDETERMINADA' ? 'Horario no confirmado' : displayDate(ses)"
                    ></span>
                  </th>
                }
                <th scope="col" class="p-3 text-center bg-warm-200/60 font-bold min-w-[110px] border-r border-warm-200">
                  Horas de falta
                </th>
                <th scope="col" class="p-3 text-center bg-warm-200/60 font-bold min-w-[90px] border-r border-warm-200">
                  % Inasistencia
                </th>
                <th scope="col" class="p-3 text-center bg-warm-200/60 font-bold min-w-[110px] border-r border-warm-200">
                  Estado Académico
                </th>
                <th scope="col" data-testid="col-seguimiento" class="p-3 text-center bg-warm-200/60 font-bold min-w-[120px]">
                  Seguimiento
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-warm-100 bg-white">
              @for (est of estudiantesPagina(); track idDe(est)) {
                <tr class="hover:bg-warm-50/60 transition-colors" [attr.data-testid]="'sabana-resumen-' + idDe(est)">
                  <!-- Nombre Estudiante Sticky -->
                  <td class="p-3.5 sticky left-0 z-10 bg-white group-hover:bg-warm-50/60 border-r border-warm-200 font-medium text-warm-900 shadow-xs">
                    <div class="font-bold text-xs">{{ est.studentName || est.nombreCompleto || (est.nombres + ' ' + est.apellidos) }}</div>
                    <div class="font-mono text-xs text-warm-500">ID: {{ est.studentCode || est.documento || est.numeroIdentificacion || 'N/A' }}</div>
                  </td>

                  <!-- Columnas de Cada Sesión -->
                  @for (ses of sessions(); track ses.id) {
                    <td
                      class="p-2 text-center border-r border-warm-100"
                      [class.opacity-60]="esCancelada(ses)"
                      [attr.data-testid]="'sabana-celda-' + idDe(est) + '-' + ses.id"
                    >
                      @let estado = esCancelada(ses) ? '—' : getAsistenciaEstudianteEnSesion(idDe(est), ses);
                      @if (estado === 'AN') {
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success-100 text-success-800 font-bold text-xs" title="Asistencia Normal (Presente)">
                          AN
                        </span>
                      } @else if (estado === 'EX') {
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-warning-100 text-warning-900 font-bold text-xs" title="Excusa Justificada">
                          EX
                        </span>
                      } @else if (estado === 'SJC') {
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-danger-100 text-danger-800 font-bold text-xs" title="Falta Injustificada">
                          SJC
                        </span>
                      } @else {
                        <span class="text-warm-300 font-mono text-xs" title="Sin registro o pendiente">
                          —
                        </span>
                      }
                    </td>
                  }

                  <!-- Resumen por horas: lo calcula el backend; aquí solo se pinta -->
                  @let r = resumenDe(idDe(est));
                  <td class="p-3 text-center font-mono font-bold text-xs text-warm-800 bg-warm-50/40 border-r border-warm-100">
                    {{ r ? r.horasFalta + ' / ' + r.horasDictadas + ' h' : '—' }}
                  </td>
                  <td class="p-3 text-center font-mono font-bold text-xs border-r border-warm-100 bg-warm-50/40">
                    {{ r ? r.porcentajeInasistencia + '%' : '—' }}
                    @if (r) {
                      <app-semaforo-asistencia [porcentaje]="r.porcentajeInasistencia" [umbralAdvertencia]="r.umbralAdvertencia" [umbralPerdida]="r.umbralPerdida" [compacto]="true" />
                    }
                  </td>
                  <td class="p-3 text-center bg-warm-50/40 border-r border-warm-100">
                    @if (r) {
                      <app-attendance-status-badge [codigoPermanencia]="r.codigoPermanencia" />
                    } @else {
                      <span class="text-warm-300 font-mono text-xs">—</span>
                    }
                  </td>
                  <td class="p-3 text-center bg-warm-50/40">
                    <div class="flex flex-col items-center gap-1">
                      <app-inasistencia-marca-badge
                        data-testid="marca-inasistencia"
                        [marca]="r?.marca ?? null"
                        [estadoMatricula]="est.codigoEstado || est.codigoEstadoEstudiante || null"
                      />
                      @if (r?.marca?.revision?.accionesPermitidas && r!.marca!.revision!.accionesPermitidas!.length > 0) {
                        <button
                          type="button"
                          [attr.data-testid]="'btn-decidir-' + idDe(est)"
                          (click)="abrirModalDecision(est, r?.marca)"
                          class="min-h-[36px] px-2.5 py-1 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                        >
                          Decidir
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-pagination
          [totalItems]="totalFilas()"
          [pageSize]="tamano"
          [currentPage]="pagina()"
          [showPageSizeSelector]="false"
          (pageChange)="cambiarPagina($event)"
        />
      }

      <app-revision-decision-modal
        [(isOpen)]="modalDecisionAbierto"
        [revision]="revisionSeleccionada()"
        [estudianteNombre]="estudianteNombreModal()"
        (decisionRegistrada)="onDecisionRegistrada()"
      />
    </div>
  `,
})
export class TeacherGrupoSabanaComponent implements OnDestroy {
  readonly timeZone = inject(SessionTimeZoneService);
  private readonly resumenService = inject(TeacherAttendanceSummaryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(RealtimeService, { optional: true });
  private subRealtime?: Subscription;

  grupoId = input<string>('');
  estudiantes = input<EstudianteGrupoItem[]>([]);
  sessions = input<ClassSession[]>([]);
  cargando = input<boolean>(false);
  protected esCancelada = estaCancelada;

  protected readonly tamano = 50;
  protected readonly pagina = signal(1);
  protected readonly totalResumen = signal(0);
  protected readonly errorResumen = signal<string | null>(null);
  private readonly resumenes = signal<ReadonlyMap<string, ResumenAsistenciaEstudiante>>(new Map());
  protected readonly totalFilas = computed(() => Math.max(this.totalResumen(), this.estudiantes().length));
  /** F-DOC-007: la matriz pinta solo la pagina vigente (la misma que se pide al backend para el resumen). */
  protected readonly estudiantesPagina = computed(() => {
    const inicio = (this.pagina() - 1) * this.tamano;
    return this.estudiantes().slice(inicio, inicio + this.tamano);
  });
  protected idDe(est: EstudianteGrupoItem): string {
    return idEstudianteDe(est);
  }
  protected readonly hayResumen = computed(() => this.resumenes().size > 0);

  modalDecisionAbierto = signal<boolean>(false);
  revisionSeleccionada = signal<any>(null);
  estudianteNombreModal = signal<string>('');

  constructor() {
    effect(() => {
      const grupo = this.grupoId();
      untracked(() => {
        this.pagina.set(1);
        if (grupo) {
          this.cargarResumen(grupo);
          this.iniciarRealtime(grupo);
        }
      });
    });
  }

  private iniciarRealtime(grupo: string): void {
    if (!this.realtime) return;
    this.subRealtime?.unsubscribe();
    this.realtime.startForGroup(grupo);

    const sub = new Subscription();

    sub.add(
      onRealtimeReconnect(this.realtime.connectionState$).subscribe(() => {
        this.cargarResumen(this.grupoId());
      })
    );

    const events$ = this.realtime.events
      ? this.realtime.events()
      : this.realtime.listenType?.(REALTIME_EVENT_TYPE.ASISTENCIAS_SESION_ACTUALIZADAS);

    if (events$) {
      sub.add(
        events$.subscribe((evt) => {
          if (!evt) return;
          if (
            evt.type === REALTIME_EVENT_TYPE.ALERTA_INASISTENCIA ||
            evt.type === REALTIME_EVENT_TYPE.REVISION_CANCELACION_CREADA ||
            evt.type === REALTIME_EVENT_TYPE.REVISION_CANCELACION_PROPUESTA ||
            evt.type === REALTIME_EVENT_TYPE.REVISION_CANCELACION_DECIDIDA ||
            evt.type === REALTIME_EVENT_TYPE.REVISION_CANCELACION_RESOLUCION ||
            evt.type === REALTIME_EVENT_TYPE.REVISION_CANCELACION_RESUELTA ||
            evt.type === REALTIME_EVENT_TYPE.ASISTENCIAS_SESION_ACTUALIZADAS
          ) {
            this.cargarResumen(this.grupoId());
          }
        })
      );
    }

    this.subRealtime = sub;
  }

  abrirModalDecision(est: EstudianteGrupoItem, marca: any): void {
    this.estudianteNombreModal.set(est.studentName || est.nombreCompleto || 'Estudiante');
    this.revisionSeleccionada.set(marca?.revision || marca);
    this.modalDecisionAbierto.set(true);
  }

  onDecisionRegistrada(): void {
    const grupo = this.grupoId();
    if (grupo) {
      this.cargarResumen(grupo);
    }
  }

  ngOnDestroy(): void {
    this.subRealtime?.unsubscribe();
    if (this.realtime) {
      this.realtime.stop();
    }
  }

  /** El resumen (horas, % de inasistencia y semaforo) lo calcula el backend; el cliente no recalcula nada. */
  protected resumenDe(estudianteId: string): ResumenAsistenciaEstudiante | undefined {
    return this.resumenes().get(estudianteId);
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarResumen(this.grupoId());
  }

  private cargarResumen(grupo: string): void {
    this.errorResumen.set(null);
    this.resumenService
      .consultarResumen(grupo, this.pagina(), this.tamano)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.resumenes.set(new Map(respuesta.elementos.map((r) => [r.estudianteId, r])));
          this.totalResumen.set(respuesta.totalElementos);
        },
        error: (err: unknown) => this.errorResumen.set(getApiErrorMessage(err)),
      });
  }

  displayDate(session: ClassSession): string {
    return session.estadoTemporal === 'INDETERMINADA'
      ? 'Horario no confirmado'
      : this.timeZone.displaySessionDate(session);
  }

  getAsistenciaEstudianteEnSesion(estudianteId: string, sesion: ClassSession): string {
    if (!sesion.records || sesion.records.length === 0) {
      return '—';
    }
    const rec = sesion.records.find((r) => r.studentId === estudianteId);
    return rec?.status ?? '—';
  }
}

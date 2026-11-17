import {
  Component,
  ChangeDetectionStrategy,
  input,
  inject,
  computed,
  effect,
  signal,
  untracked,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ClassSession } from '../../../../core/models/attendance.model';
import { estaCancelada, estaPendienteAprobacion, estaRechazada } from '../../../../core/models/sesion-estado.model';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';
import { TeacherAttendanceSummaryService } from '../../../../core/services/teacher-attendance-summary.service';
import { TeacherMatrizAsistenciaService } from '../../../../core/services/teacher-matriz-asistencia.service';
import { ResumenAsistenciaEstudiante } from '../../../../core/models/indicadores-asistencia.model';
import { CeldaMatriz, FilaMatriz } from '../../../../core/models/matriz-asistencia.model';
import { AttendanceStatusBadgeComponent } from '../../../../shared/components/attendance-status-badge/attendance-status-badge.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { SemaforoAsistenciaComponent } from '../../../../shared/components/semaforo-asistencia/semaforo-asistencia.component';
import { InasistenciaMarcaBadgeComponent } from '../../../../shared/components/inasistencia-marca-badge/inasistencia-marca-badge.component';
import { RevisionDecisionEntrada, RevisionDecisionModalComponent } from '../../revision-cancelacion/revision-decision-modal.component';
import { MarcaRevisionDocente } from '../../../../core/models/revision-cancelacion.model';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { onRealtimeReconnect } from '../../../../core/realtime/realtime-reconnect-trigger';
import { REALTIME_EVENT_TYPE } from '../../../../core/realtime/model/realtime-event.model';

/** Una fila de la matriz con sus celdas indexadas por sesion (solo para ubicar la celda de cada columna). */
interface FilaPlanilla {
  fila: FilaMatriz;
  celdas: ReadonlyMap<string, CeldaMatriz>;
}

@Component({
    selector: 'app-teacher-grupo-sabana',
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
          <span class="flex items-center gap-1.5 font-semibold text-primary-800">
            <span class="w-3 h-3 rounded-full bg-primary-300 inline-block"></span>
            Parcial (minutos asistidos)
          </span>
        </div>
      </div>

      <input
        type="search"
        data-testid="sabana-busqueda"
        aria-label="Buscar estudiante por nombre o documento"
        placeholder="Buscar por nombre o documento..."
        [value]="busqueda()"
        (input)="onBuscar($event)"
        class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
      />

      @if (cargando() || cargandoMatriz()) {
        <div class="p-8 space-y-3">
          <div class="h-8 bg-warm-100 rounded-lg animate-pulse"></div>
          <div class="h-16 bg-warm-100 rounded-xl animate-pulse"></div>
          <div class="h-16 bg-warm-100 rounded-xl animate-pulse"></div>
        </div>
      } @else if (errorMatriz()) {
        <p class="rounded-xl bg-danger-100 text-danger-900 px-4 py-2 text-sm font-medium" role="alert" data-testid="sabana-matriz-error">
          {{ errorMatriz() }}
        </p>
      } @else if (filasPlanilla().length === 0) {
        <div class="p-12 text-center text-warm-400 bg-warm-50/50 rounded-2xl border border-dashed border-warm-200">
          <p class="text-sm font-medium">
            @if (busqueda().trim()) {
              Ningún estudiante del grupo coincide con la búsqueda.
            } @else {
              No hay estudiantes matriculados en este grupo para generar la sábana.
            }
          </p>
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
                    @if (esRechazada(ses)) {
                      <div class="text-xs font-semibold text-danger-800" data-testid="sabana-rechazada">Rechazada</div>
                    } @else if (esCancelada(ses)) {
                      <div class="text-xs font-semibold text-warning-800">Cancelada</div>
                    } @else if (esPendiente(ses)) {
                      <div class="text-xs font-semibold text-warning-800" data-testid="sabana-pendiente">Pendiente de aprobación</div>
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
              @for (item of filasPlanilla(); track item.fila.idEstudiante) {
                @let est = item.fila;
                <tr class="hover:bg-warm-50/60 transition-colors" [attr.data-testid]="'sabana-resumen-' + est.idEstudiante">
                  <!-- Nombre Estudiante Sticky -->
                  <td class="p-3.5 sticky left-0 z-10 bg-white group-hover:bg-warm-50/60 border-r border-warm-200 font-medium text-warm-900 shadow-xs">
                    <div class="font-bold text-xs">{{ est.nombreCompleto }}</div>
                    <div class="font-mono text-xs text-warm-500">ID: {{ est.documento || 'N/A' }}</div>
                  </td>

                  <!-- Columnas de Cada Sesión: la celda la entrega el backend (estado de la base por tramos entre tomas) -->
                  @for (ses of sessions(); track ses.id) {
                    <td
                      class="p-2 text-center border-r border-warm-100"
                      [class.opacity-60]="esCancelada(ses)"
                      [attr.data-testid]="'sabana-celda-' + est.idEstudiante + '-' + ses.id"
                    >
                      @let celda = item.celdas.get(ses.id);
                      @switch (celda?.codigoEstado) {
                        @case ('PRESENTE') {
                          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success-100 text-success-800 font-bold text-xs" title="Asistencia Normal (Presente)">
                            AN
                          </span>
                        }
                        @case ('JUSTIFICADA') {
                          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-warning-100 text-warning-900 font-bold text-xs" title="Excusa Justificada">
                            EX
                          </span>
                        }
                        @case ('AUSENTE') {
                          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-danger-100 text-danger-800 font-bold text-xs" title="Falta Injustificada">
                            SJC
                          </span>
                        }
                        @case ('PARCIAL') {
                          <span
                            class="inline-flex items-center justify-center px-1.5 h-6 rounded-full bg-primary-100 text-primary-900 font-bold text-[10px] whitespace-nowrap"
                            [title]="'Asistencia parcial: ' + celda!.minutosAsistidos + ' de ' + celda!.minutosSesion + ' minutos'"
                          >
                            {{ celda!.minutosAsistidos }}/{{ celda!.minutosSesion }}
                          </span>
                        }
                        @default {
                          <span class="text-warm-300 font-mono text-xs" title="Sin registro o pendiente">
                            —
                          </span>
                        }
                      }
                    </td>
                  }

                  <!-- Resumen por horas: lo calcula el backend; aquí solo se pinta -->
                  @let r = resumenDe(est.idEstudiante);
                  <td class="p-3 text-center font-mono font-bold text-xs text-warm-800 bg-warm-50/40 border-r border-warm-100">
                    {{ r ? r.horasFalta + ' / ' + r.horasDictadas + ' h' : '—' }}
                  </td>
                  <td class="p-3 text-center font-mono font-bold text-xs border-r border-warm-100 bg-warm-50/40">
                    {{ r ? r.porcentajeInasistencia + '%' : '—' }}
                    @if (r) {
                      <app-semaforo-asistencia [codigoPermanencia]="r.codigoPermanencia" [porcentaje]="r.porcentajeInasistencia" [compacto]="true" />
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
                        [estadoMatricula]="est.codigoEstadoEstudiante || null"
                      />
                      @if (r?.marca?.revision?.accionesPermitidas && r!.marca!.revision!.accionesPermitidas!.length > 0) {
                        <button
                          type="button"
                          [attr.data-testid]="'btn-decidir-' + est.idEstudiante"
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
  `
})
export class TeacherGrupoSabanaComponent implements OnDestroy {
  readonly timeZone = inject(SessionTimeZoneService);
  private readonly resumenService = inject(TeacherAttendanceSummaryService);
  private readonly matrizService = inject(TeacherMatrizAsistenciaService);
  private readonly realtime = inject(RealtimeService, { optional: true });
  private subRealtime?: Subscription;
  private subCarga?: Subscription;
  private subResumen?: Subscription;

  grupoId = input<string>('');
  /** Sesiones del grupo: solo dan el encabezado (titulo, fecha, estado de cancelacion); la asistencia llega en la matriz. */
  sessions = input<ClassSession[]>([]);
  cargando = input<boolean>(false);
  /** Contador que cambia cuando otra vista (tarjeta de decisiones) pide recargar el resumen. */
  refresco = input<number>(0);
  protected esCancelada = estaCancelada;
  protected esPendiente = estaPendienteAprobacion;
  protected esRechazada = estaRechazada;

  protected readonly tamano = 50;
  protected readonly pagina = signal(1);
  protected readonly busqueda = signal('');
  protected readonly totalFilas = signal(0);
  protected readonly cargandoMatriz = signal(false);
  protected readonly errorMatriz = signal<string | null>(null);
  protected readonly errorResumen = signal<string | null>(null);
  private readonly filas = signal<readonly FilaMatriz[]>([]);
  private readonly resumenes = signal<ReadonlyMap<string, ResumenAsistenciaEstudiante>>(new Map());
  /** La pagina que entrego el servidor, con las celdas de cada fila indexadas por sesion para ubicarlas en su columna. */
  protected readonly filasPlanilla = computed<FilaPlanilla[]>(() =>
    this.filas().map((fila) => ({ fila, celdas: new Map(fila.celdas.map((c) => [c.idSesion, c])) }))
  );

  modalDecisionAbierto = signal<boolean>(false);
  revisionSeleccionada = signal<RevisionDecisionEntrada | MarcaRevisionDocente | null>(null);
  estudianteNombreModal = signal<string>('');

  private readonly busqueda$ = new Subject<string>();
  private readonly busquedaSub: Subscription = this.busqueda$
    .pipe(debounceTime(300), distinctUntilChanged())
    .subscribe((texto) => {
      this.busqueda.set(texto);
      this.pagina.set(1);
      this.cargar(this.grupoId());
    });

  constructor() {
    effect(() => {
      const grupo = this.grupoId();
      untracked(() => {
        this.pagina.set(1);
        this.busqueda.set('');
        if (grupo) {
          this.cargar(grupo);
          this.iniciarRealtime(grupo);
        }
      });
    });
  }

  private readonly recargarPorRefresco = effect(() => {
    const version = this.refresco();
    untracked(() => {
      const grupo = this.grupoId();
      if (version > 0 && grupo) this.cargar(grupo);
    });
  });

  /** Texto de busqueda ya estabilizado (espera corta tras la ultima tecla): el servidor filtra y reordena la pagina. */
  protected onBuscar(event: Event): void {
    this.busqueda$.next((event.target as HTMLInputElement).value.trim());
  }

  private iniciarRealtime(grupo: string): void {
    if (!this.realtime) return;
    this.subRealtime?.unsubscribe();
    this.realtime.startForGroup(grupo);

    const sub = new Subscription();

    sub.add(
      onRealtimeReconnect(this.realtime.connectionState$).subscribe(() => {
        this.cargar(this.grupoId());
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
            // Al llegar un evento se vuelve a pedir la pagina visible; no se recalcula nada en el cliente.
            this.cargar(this.grupoId());
          }
        })
      );
    }

    this.subRealtime = sub;
  }

  abrirModalDecision(est: FilaMatriz, marca: MarcaRevisionDocente | null | undefined): void {
    this.estudianteNombreModal.set(est.nombreCompleto || 'Estudiante');
    this.revisionSeleccionada.set(marca?.revision || marca || null);
    this.modalDecisionAbierto.set(true);
  }

  onDecisionRegistrada(): void {
    const grupo = this.grupoId();
    if (grupo) {
      this.cargar(grupo);
    }
  }

  ngOnDestroy(): void {
    // El canal del grupo lo cierra la tarjeta de decisiones del hub: esta planilla solo comparte la conexión.
    this.subRealtime?.unsubscribe();
    this.subCarga?.unsubscribe();
    this.subResumen?.unsubscribe();
    this.busquedaSub.unsubscribe();
  }

  /** El resumen (horas, % de inasistencia y semaforo) lo calcula el backend; el cliente no recalcula nada. */
  protected resumenDe(estudianteId: string): ResumenAsistenciaEstudiante | undefined {
    return this.resumenes().get(estudianteId);
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar(this.grupoId());
  }

  /** Pide al servidor la pagina vigente de la matriz y del resumen por horas con la misma pagina, tamano y busqueda. */
  private cargar(grupo: string): void {
    this.errorMatriz.set(null);
    this.errorResumen.set(null);
    this.cargandoMatriz.set(true);
    this.subCarga?.unsubscribe();
    this.subResumen?.unsubscribe();
    const pagina = this.pagina();
    const busqueda = this.busqueda();
    this.subCarga = this.matrizService.consultarMatriz(grupo, pagina, this.tamano, busqueda).subscribe({
      next: (respuesta) => {
        this.filas.set(respuesta.elementos);
        this.totalFilas.set(respuesta.totalElementos);
        this.cargandoMatriz.set(false);
      },
      error: (err: unknown) => {
        this.filas.set([]);
        this.totalFilas.set(0);
        this.cargandoMatriz.set(false);
        this.errorMatriz.set(getApiErrorMessage(err));
      },
    });
    this.subResumen = this.resumenService.consultarResumen(grupo, pagina, this.tamano, busqueda).subscribe({
      next: (respuesta) => this.resumenes.set(new Map(respuesta.elementos.map((r) => [r.estudianteId, r]))),
      error: (err: unknown) => {
        this.resumenes.set(new Map());
        this.errorResumen.set(getApiErrorMessage(err));
      },
    });
  }

  displayDate(session: ClassSession): string {
    return session.estadoTemporal === 'INDETERMINADA'
      ? 'Horario no confirmado'
      : this.timeZone.displaySessionDate(session);
  }
}

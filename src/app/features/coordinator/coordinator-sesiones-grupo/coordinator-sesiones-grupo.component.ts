import { Component, OnInit, OnDestroy, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { AsistenciaSesionItem, SesionGrupoItem } from '../../../core/models/asistencia-programa.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage, getApiSuccessMessage } from '../../../core/api/errors/api-error.util';
import { SesionEstadoBadgeComponent } from '../../../shared/components/sesion-estado-badge/sesion-estado-badge.component';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { resolveSessionInstant } from '../../../core/time/session-timezone.util';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { onRealtimeReconnect } from '../../../core/realtime/realtime-reconnect-trigger';
import {
  REALTIME_EVENT_TYPE,
  RealtimeEvent,
  SesionCanceladaRealtimePayload,
  SesionManualCreadaRealtimePayload,
  SesionSolicitudCreadaRealtimePayload,
} from '../../../core/realtime/model/realtime-event.model';
import { CoordinadorSesionesService } from '../../../core/services/coordinador-sesiones.service';
import { MotivoCancelacionCoordinador } from '../../../core/models/coordinador-sesion-cancelacion.model';
import { estaCancelada, estaPendienteAprobacion } from '../../../core/models/sesion-estado.model';
import { mensajeSesionManualCreada, mensajeSolicitudNueva } from '../../../core/models/sesion-manual.util';
import { CoordinatorCancelarSesionModalComponent } from './coordinator-cancelar-sesion-modal.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';

type FiltroAsistio = 'TODOS' | 'ASISTIO' | 'NO_ASISTIO';

/** Grupo cuyas sesiones se consultan: basta con lo que el consolidado ya conoce de la fila. */
export interface GrupoSesionesRef {
  id: string;
  nombre: string;
  nombreAsignatura: string;
}

/**
 * HU060 (sesiones con registro de asistencia por grupo) y HU061 (detalle de la asistencia de cada estudiante), más la
 * cancelación de sesiones manuales (DEC-064). Es el contenido de la fila expandida del consolidado de asistencia del
 * coordinador (CULM-001); el listado de grupos (HU064) lo da el consolidado. El backend limita los datos al programa.
 */
@Component({
  selector: 'app-coordinator-sesiones-grupo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent, SesionEstadoBadgeComponent, ErrorCargaComponent, CoordinatorCancelarSesionModalComponent],
  template: `
    <div class="space-y-4">
      <!-- HU060: sesiones del grupo con registro de asistencia -->
      @if (grupoSeleccionado(); as grupoActual) {
        <section class="bg-white p-4 rounded-xl border border-warm-200 space-y-3" [attr.aria-label]="'Sesiones de ' + grupoActual.nombre">
          <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <h2 class="font-serif font-bold text-base text-warm-900">Sesiones de {{ grupoActual.nombre }} · {{ grupoActual.nombreAsignatura }}</h2>
            <div class="flex flex-wrap items-end gap-2 text-xs">
              <label class="flex flex-col text-warm-500">Desde
                <input type="date" aria-label="Desde" [ngModel]="desde()" (ngModelChange)="desde.set($event)" class="px-2 py-1.5 border border-warm-200 rounded-lg text-warm-900" />
              </label>
              <label class="flex flex-col text-warm-500">Hasta
                <input type="date" aria-label="Hasta" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)" class="px-2 py-1.5 border border-warm-200 rounded-lg text-warm-900" />
              </label>
              <button type="button" class="px-3 py-1.5 rounded-lg bg-primary-600 text-white font-semibold" (click)="filtrarSesiones()">Filtrar</button>
            </div>
          </div>
          @if (errorSesiones() && !cargandoSesiones()) {
            <app-error-carga [error]="errorSesiones()!" (reintentar)="cargarSesiones()" />
          } @else if (sesiones().length === 0 && !cargandoSesiones()) {
            <p class="text-sm text-warm-500 text-center py-6">El grupo no tiene sesiones en el rango seleccionado.</p>
          } @else {
            <p class="text-xs text-warm-500" data-testid="zona-horaria-sesiones">
              @if (sesionesSinZona()) {
                Algunas horas están registradas sin zona horaria confirmada y se muestran tal como las informa el servidor.
              } @else {
                Horas en {{ timeZone.zoneLabel() }}.
              }
            </p>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                    <th scope="col" class="py-2 pr-3">Sesión</th>
                    <th scope="col" class="py-2 pr-3">Semana</th>
                    <th scope="col" class="py-2 pr-3">Fecha y hora</th>
                    <th scope="col" class="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of sesiones(); track s.id) {
                    <tr class="border-b border-warm-50" [class.bg-primary-50]="sesionSeleccionada()?.id === s.id" [attr.data-testid]="'sesion-fila-' + s.id">
                      <td class="py-2 pr-3 font-semibold text-warm-900">
                        {{ s.nombre }} <span class="text-warm-400 font-mono">{{ s.codigo }}</span>
                        <app-sesion-estado-badge
                          class="block font-normal"
                          [estado]="s.estado"
                          [cancelacion]="s.cancelacion"
                          [estadoSolicitud]="s.estadoSolicitud"
                          [pendienteAprobacion]="s.pendienteAprobacion"
                        />
                      </td>
                      <td class="py-2 pr-3 text-warm-700">{{ s.numeroSemana ?? '—' }}</td>
                      <td class="py-2 pr-3 text-warm-600 text-xs">{{ horario(s) }}</td>
                      <td class="py-2 text-right space-x-3">
                        <button type="button" class="text-xs font-semibold text-primary-700 hover:underline" (click)="seleccionarSesion(s)">
                          Ver asistencia
                        </button>
                        @if (!esCancelada(s) && !esPendiente(s)) {
                          <button
                            type="button"
                            data-testid="cancelar-sesion"
                            class="text-xs font-semibold text-danger-700 hover:underline"
                            (click)="abrirCancelar(s)"
                          >
                            Cancelar sesión
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <app-pagination
            [totalItems]="totalSesiones()"
            [pageSize]="tamanoSesiones()"
            [currentPage]="paginaSesiones()"
            (pageChange)="onPaginaSesiones($event)"
            (pageSizeChange)="onTamanoSesiones($event)"
          ></app-pagination>
        </section>
      }

      <!-- HU061: detalle de asistencia por estudiante -->
      @if (sesionSeleccionada(); as sesion) {
        <section class="bg-white p-4 rounded-xl border border-warm-200 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 class="font-serif font-bold text-lg text-warm-900">Asistencia · {{ sesion.nombre }}</h2>
              <p class="text-xs text-warm-500">
                {{ horario(sesion) }} ·
                {{ presentesPagina() }} presentes / {{ ausentesPagina() }} ausentes en esta página
              </p>
            </div>
            <select
              aria-label="Filtro de asistencia"
              [ngModel]="filtroAsistio()"
              (ngModelChange)="onFiltroAsistio($event)"
              class="px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
            >
              <option value="TODOS">Todos</option>
              <option value="ASISTIO">Asistieron</option>
              <option value="NO_ASISTIO">No asistieron</option>
            </select>
          </div>
          @if (errorAsistencias() && !cargandoAsistencias()) {
            <app-error-carga [error]="errorAsistencias()!" (reintentar)="cargarAsistencias()" />
          } @else if (asistencias().length === 0 && !cargandoAsistencias()) {
            <p class="text-sm text-warm-500 text-center py-6">No hay registros de asistencia para esta sesión.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                    <th scope="col" class="py-2 pr-3">Estudiante</th>
                    <th scope="col" class="py-2 pr-3">Documento</th>
                    <th scope="col" class="py-2 pr-3">Asistencia</th>
                    <th scope="col" class="py-2">Razón / causa</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of asistencias(); track a.idDetalleAsistencia) {
                    <tr class="border-b border-warm-50">
                      <td class="py-2 pr-3 font-semibold text-warm-900">{{ a.nombreCompleto }}</td>
                      <td class="py-2 pr-3 text-warm-600 font-mono text-xs">{{ a.numeroIdentificacion || '—' }}</td>
                      <td class="py-2 pr-3">
                        <app-badge [variant]="a.asistio ? 'success' : 'danger'">{{ a.asistio ? 'Asistió' : 'No asistió' }}</app-badge>
                      </td>
                      <td class="py-2 text-warm-700 text-xs">{{ a.nombreRazonCausa || a.codigoRazonCausa || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <app-pagination
            [totalItems]="totalAsistencias()"
            [pageSize]="tamanoAsistencias()"
            [currentPage]="paginaAsistencias()"
            (pageChange)="onPaginaAsistencias($event)"
            (pageSizeChange)="onTamanoAsistencias($event)"
          ></app-pagination>
        </section>
      }

      <app-coordinator-cancelar-sesion-modal
        [isOpen]="sesionACancelar() !== null"
        [nombreSesion]="sesionACancelar()?.nombre ?? ''"
        [motivos]="motivos()"
        [errorMotivos]="errorMotivos()"
        [errorMensaje]="errorCancelar()"
        [enviando]="enviandoCancelacion()"
        (confirmado)="confirmarCancelacion($event)"
        (closed)="cerrarCancelar()"
      />
    </div>
  `,
})
export class CoordinatorSesionesGrupoComponent implements OnInit, OnDestroy {
  /**
   * Con varios componentes vivos a la vez (filas del consolidado), solo el que arrancó el stream en último lugar puede
   * detenerlo al destruirse: así abrir otra fila no queda cortado por la destrucción de la anterior.
   */
  private static duenoDelStream: CoordinatorSesionesGrupoComponent | null = null;

  private readonly service = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);
  private readonly sesionesService = inject(CoordinadorSesionesService);
  readonly timeZone = inject(SessionTimeZoneService);
  private readonly realtime = inject(RealtimeService, { optional: true });
  private subRealtime?: Subscription;

  readonly grupo = input.required<GrupoSesionesRef>();
  grupoSeleccionado = signal<GrupoSesionesRef | null>(null);

  sesiones = signal<SesionGrupoItem[]>([]);
  totalSesiones = signal(0);
  paginaSesiones = signal(1);
  tamanoSesiones = signal(10);
  cargandoSesiones = signal(false);
  errorSesiones = signal<LoadErrorState | null>(null);
  desde = signal('');
  hasta = signal('');
  sesionSeleccionada = signal<SesionGrupoItem | null>(null);

  /** DEC-064: cancelación de una sesión manual por el coordinador. */
  sesionACancelar = signal<SesionGrupoItem | null>(null);
  motivos = signal<MotivoCancelacionCoordinador[]>([]);
  errorMotivos = signal<string | null>(null);
  errorCancelar = signal<string | null>(null);
  enviandoCancelacion = signal(false);
  readonly esCancelada = estaCancelada;
  readonly esPendiente = estaPendienteAprobacion;

  asistencias = signal<AsistenciaSesionItem[]>([]);
  totalAsistencias = signal(0);
  paginaAsistencias = signal(1);
  tamanoAsistencias = signal(20);
  cargandoAsistencias = signal(false);
  errorAsistencias = signal<LoadErrorState | null>(null);
  filtroAsistio = signal<FiltroAsistio>('TODOS');

  /** APP-04: hay sesiones cuyo horario no es un instante confirmado (v1 sin zona o INDETERMINADA). */
  sesionesSinZona = computed(() =>
    this.timeZone.hasUnzonedValue(this.sesiones().map((s) => this.inicio(s)))
  );

  presentesPagina = computed(() => this.asistencias().filter((a) => a.asistio).length);
  ausentesPagina = computed(() => this.asistencias().filter((a) => !a.asistio).length);

  /** Horario de la sesión en la zona efectiva; el valor sin zona se muestra literal (APP-04). */
  horario(sesion: SesionGrupoItem): string {
    return this.timeZone.formatTemporalRange(this.inicio(sesion), this.fin(sesion));
  }

  private inicio(sesion: SesionGrupoItem): string | null {
    return resolveSessionInstant(sesion.fechaHoraInicio, sesion.fechaHoraInicioUtc, sesion.estadoTemporal);
  }

  private fin(sesion: SesionGrupoItem): string | null {
    return resolveSessionInstant(sesion.fechaHoraFin, sesion.fechaHoraFinUtc, sesion.estadoTemporal);
  }

  ngOnInit(): void {
    this.seleccionarGrupo(this.grupo());
  }

  seleccionarGrupo(grupo: GrupoSesionesRef): void {
    if (this.grupoSeleccionado() && this.realtime) {
      this.realtime.stop();
    }
    this.grupoSeleccionado.set(grupo);
    this.sesionSeleccionada.set(null);
    this.asistencias.set([]);
    this.paginaSesiones.set(1);
    CoordinatorSesionesGrupoComponent.duenoDelStream = this;
    this.iniciarRealtime(grupo.id);
    this.cargarSesiones();
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

    sub.add(
      this.realtime.events().subscribe((evt: RealtimeEvent) => {
        if (!evt) return;
        const tipo = evt.type;
        if (tipo === REALTIME_EVENT_TYPE.SESION_MANUAL_CREADA) {
          const payload = evt.payload as SesionManualCreadaRealtimePayload;
          if (payload?.grupo !== grupoId) return;
          this.toast.info(
            mensajeSesionManualCreada(payload, this.timeZone.formatTemporal(payload.fechaHoraInicio))
          );
          this.cargarSesiones();
          return;
        }
        if (tipo === REALTIME_EVENT_TYPE.SESION_SOLICITUD_CREADA) {
          const payload = evt.payload as SesionSolicitudCreadaRealtimePayload;
          if (payload?.grupo !== grupoId) return;
          this.toast.info(mensajeSolicitudNueva(payload.docente));
          this.cargarSesiones();
          return;
        }
        if (tipo === REALTIME_EVENT_TYPE.SESION_CANCELADA) {
          const payload = evt.payload as SesionCanceladaRealtimePayload;
          if (payload?.grupo === grupoId) this.cargarSesiones();
          return;
        }
        if (
          tipo === REALTIME_EVENT_TYPE.ALERTA_INASISTENCIA ||
          tipo === REALTIME_EVENT_TYPE.REVISION_CANCELACION_CREADA ||
          tipo === REALTIME_EVENT_TYPE.REVISION_CANCELACION_PROPUESTA ||
          tipo === REALTIME_EVENT_TYPE.REVISION_CANCELACION_DECIDIDA ||
          tipo === REALTIME_EVENT_TYPE.REVISION_CANCELACION_RESOLUCION ||
          tipo === REALTIME_EVENT_TYPE.REVISION_CANCELACION_RESUELTA ||
          tipo === REALTIME_EVENT_TYPE.ASISTENCIAS_SESION_ACTUALIZADAS
        ) {
          this.cargarSesiones();
        }
      })
    );

    this.subRealtime = sub;
  }

  abrirCancelar(sesion: SesionGrupoItem): void {
    if (estaCancelada(sesion)) return;
    this.errorCancelar.set(null);
    this.sesionACancelar.set(sesion);
    if (this.motivos().length === 0) this.cargarMotivos();
  }

  cerrarCancelar(): void {
    this.sesionACancelar.set(null);
    this.errorCancelar.set(null);
    this.enviandoCancelacion.set(false);
  }

  private cargarMotivos(): void {
    this.errorMotivos.set(null);
    this.sesionesService.getMotivosCancelacion().subscribe({
      next: (res) => this.motivos.set(res.datos ?? []),
      error: (error: unknown) => {
        this.motivos.set([]);
        this.errorMotivos.set(getApiErrorMessage(error));
      },
    });
  }

  confirmarCancelacion(request: { codigoMotivo: string; observacion?: string }): void {
    const sesion = this.sesionACancelar();
    if (!sesion || this.enviandoCancelacion()) return;
    this.errorCancelar.set(null);
    this.enviandoCancelacion.set(true);
    this.sesionesService.cancelarSesion(sesion.id, request).subscribe({
      next: (res) => {
        this.enviandoCancelacion.set(false);
        this.toast.success(getApiSuccessMessage(res, 'Sesión cancelada.'));
        this.cerrarCancelar();
        this.cargarSesiones();
      },
      error: (error: unknown) => {
        this.enviandoCancelacion.set(false);
        this.errorCancelar.set(getApiErrorMessage(error));
      },
    });
  }

  ngOnDestroy(): void {
    this.subRealtime?.unsubscribe();
    if (this.realtime && CoordinatorSesionesGrupoComponent.duenoDelStream === this) {
      CoordinatorSesionesGrupoComponent.duenoDelStream = null;
      this.realtime.stop();
    }
  }

  filtrarSesiones(): void {
    if (this.desde() && this.hasta() && this.desde() > this.hasta()) {
      this.toast.error('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    this.paginaSesiones.set(1);
    this.cargarSesiones();
  }

  onPaginaSesiones(pagina: number): void {
    this.paginaSesiones.set(pagina);
    this.cargarSesiones();
  }

  onTamanoSesiones(tamano: number): void {
    this.tamanoSesiones.set(tamano);
    this.paginaSesiones.set(1);
    this.cargarSesiones();
  }

  seleccionarSesion(sesion: SesionGrupoItem): void {
    this.sesionSeleccionada.set(sesion);
    this.paginaAsistencias.set(1);
    this.cargarAsistencias();
  }

  onFiltroAsistio(filtro: FiltroAsistio): void {
    this.filtroAsistio.set(filtro);
    this.paginaAsistencias.set(1);
    this.cargarAsistencias();
  }

  onPaginaAsistencias(pagina: number): void {
    this.paginaAsistencias.set(pagina);
    this.cargarAsistencias();
  }

  onTamanoAsistencias(tamano: number): void {
    this.tamanoAsistencias.set(tamano);
    this.paginaAsistencias.set(1);
    this.cargarAsistencias();
  }

  cargarSesiones(): void {
    const grupo = this.grupoSeleccionado();
    if (!grupo) {
      return;
    }
    this.cargandoSesiones.set(true);
    this.errorSesiones.set(null);
    this.service
      .getSesionesGrupo(grupo.id, {
        desde: this.desde(),
        hasta: this.hasta(),
        pagina: this.paginaSesiones(),
        tamano: this.tamanoSesiones(),
      })
      .subscribe({
        next: (res) => {
          this.sesiones.set(res.datos ?? []);
          this.totalSesiones.set(Number(res.total ?? 0));
          this.cargandoSesiones.set(false);
        },
        error: (error: unknown) => {
          this.sesiones.set([]);
          this.totalSesiones.set(0);
          this.cargandoSesiones.set(false);
          this.errorSesiones.set(classifyLoadError(error));
          this.toast.error(getApiErrorMessage(error));
        },
      });
  }

  cargarAsistencias(): void {
    const sesion = this.sesionSeleccionada();
    if (!sesion) {
      return;
    }
    const filtro = this.filtroAsistio();
    this.cargandoAsistencias.set(true);
    this.errorAsistencias.set(null);
    this.service
      .getAsistenciasSesion(sesion.id, {
        asistio: filtro === 'TODOS' ? null : filtro === 'ASISTIO',
        pagina: this.paginaAsistencias(),
        tamano: this.tamanoAsistencias(),
      })
      .subscribe({
        next: (res) => {
          this.asistencias.set(res.datos ?? []);
          this.totalAsistencias.set(Number(res.total ?? 0));
          this.cargandoAsistencias.set(false);
        },
        error: (error: unknown) => {
          this.asistencias.set([]);
          this.totalAsistencias.set(0);
          this.cargandoAsistencias.set(false);
          this.errorAsistencias.set(classifyLoadError(error));
          this.toast.error(getApiErrorMessage(error));
        },
      });
  }
}

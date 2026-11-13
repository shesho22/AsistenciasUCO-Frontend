import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { BadgeComponent, BadgeVariant } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { FechaCortaPipe, RangoHorarioPipe } from '../../../shared/pipes/fecha-hora.pipes';
import { CoordinadorSesionesService } from '../../../core/services/coordinador-sesiones.service';
import { CoordinatorProgramService } from '../../../core/services/coordinator-program.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { SolicitudSesionItem } from '../../../core/models/coordinador-solicitud-sesion.model';
import { MotivoCancelacionCoordinador } from '../../../core/models/coordinador-sesion-cancelacion.model';
import { EstadoSolicitudSesion } from '../../../core/models/sesion-estado.model';
import { formatearHace } from '../../../core/utils/tiempo-relativo.util';
import { getApiErrorMessage, getApiSuccessMessage } from '../../../core/api/errors/api-error.util';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { CoordinatorCancelarSesionModalComponent } from '../coordinator-sesiones-grupo/coordinator-cancelar-sesion-modal.component';
import { CoordinatorAprobarSolicitudModalComponent } from './coordinator-aprobar-solicitud-modal.component';

/**
 * DEC-065 (2): bandeja de solicitudes de sesión extraordinaria del programa. El coordinador aprueba (con observación
 * opcional) o rechaza (con motivo del catálogo) cada solicitud pendiente. Los mensajes los entrega el backend.
 */
@Component({
  selector: 'app-coordinator-solicitudes-sesion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [
    BadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    ErrorCargaComponent,
    FechaCortaPipe,
    RangoHorarioPipe,
    CoordinatorCancelarSesionModalComponent,
    CoordinatorAprobarSolicitudModalComponent,
  ],
  template: `
    <section class="bg-white p-4 sm:p-5 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4" aria-label="Solicitudes de sesión" data-testid="solicitudes-sesion">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="font-serif font-bold text-lg text-warm-900">Solicitudes de sesión</h2>
          <p class="text-xs text-warm-600">Sesiones extraordinarias que los docentes piden para su programa.</p>
        </div>
        <label class="inline-flex items-center gap-2 text-sm text-warm-800 min-h-[44px]">
          <input
            type="checkbox"
            data-testid="solo-pendientes"
            [checked]="soloPendientes()"
            (change)="alternarSoloPendientes($any($event.target).checked)"
            class="h-4 w-4 rounded border-warm-300"
          />
          Solo pendientes
        </label>
      </div>

      @if (error() && !cargando()) {
        <app-error-carga [error]="error()!" (reintentar)="cargar()" />
      } @else if (cargando() && solicitudes().length === 0) {
        <div class="space-y-3" data-testid="solicitudes-cargando">
          @for (n of [1, 2]; track n) {
            <div class="h-14 bg-warm-100 rounded-xl animate-pulse"></div>
          }
        </div>
      } @else if (solicitudes().length === 0) {
        @if (soloPendientes()) {
          <app-empty-state
            variant="info"
            title="No hay solicitudes pendientes"
            causa="Ningún docente tiene una sesión extraordinaria esperando tu aprobación."
            accionTexto="Ver todas las solicitudes"
            (accion)="alternarSoloPendientes(false)"
          />
        } @else {
          <app-empty-state
            variant="info"
            title="Aún no hay solicitudes de sesión"
            causa="Cuando un docente solicite una sesión extraordinaria aparecerá aquí."
          />
        }
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                <th scope="col" class="py-2 pr-3">Docente</th>
                <th scope="col" class="py-2 pr-3">Grupo y asignatura</th>
                <th scope="col" class="py-2 pr-3">Fecha y horario</th>
                <th scope="col" class="py-2 pr-3">Solicitada</th>
                <th scope="col" class="py-2 pr-3">Estado</th>
                <th scope="col" class="py-2"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (s of solicitudes(); track s.idSesion) {
                <tr class="border-b border-warm-50" [attr.data-testid]="'solicitud-' + s.idSesion">
                  <td class="py-2 pr-3 font-semibold text-warm-900">{{ s.nombreDocente }}</td>
                  <td class="py-2 pr-3 text-warm-700">
                    {{ s.nombreGrupo }} · {{ s.nombreAsignatura }}
                    <span class="block text-xs text-warm-500">{{ s.nombreSesion }}</span>
                  </td>
                  <td class="py-2 pr-3 text-warm-700 text-xs">
                    {{ s.fechaHoraInicio | fechaCorta: zona() }}
                    <span class="block font-mono">{{ s.fechaHoraInicio | rangoHorario: s.fechaHoraFin : zona() }}</span>
                  </td>
                  <td class="py-2 pr-3 text-warm-600 text-xs" data-testid="solicitud-hace">{{ hace(s) }}</td>
                  <td class="py-2 pr-3">
                    <app-badge [variant]="variante(s.estadoSolicitud)" size="sm">{{ s.nombreEstadoSolicitud }}</app-badge>
                    @if (s.estadoSolicitud !== 'PENDIENTE' && s.observacion) {
                      <span class="block text-xs text-warm-600 break-words mt-1">{{ s.observacion }}</span>
                    }
                  </td>
                  <td class="py-2 text-right space-x-3 whitespace-nowrap">
                    @if (s.estadoSolicitud === 'PENDIENTE') {
                      <button type="button" data-testid="aprobar-solicitud" class="text-xs font-semibold text-primary-700 hover:underline min-h-[44px]" (click)="abrirAprobar(s)">Aprobar</button>
                      <button type="button" data-testid="rechazar-solicitud" class="text-xs font-semibold text-danger-700 hover:underline min-h-[44px]" (click)="abrirRechazar(s)">Rechazar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <app-pagination
        [totalItems]="total()"
        [pageSize]="tamano()"
        [currentPage]="pagina()"
        (pageChange)="onPagina($event)"
        (pageSizeChange)="onTamano($event)"
      />

      <app-coordinator-aprobar-solicitud-modal
        [isOpen]="aAprobar() !== null"
        [nombreSesion]="aAprobar()?.nombreSesion ?? ''"
        [errorMensaje]="errorResolucion()"
        [enviando]="enviando()"
        (confirmado)="confirmarAprobacion($event)"
        (closed)="cerrarDialogos()"
      />

      <app-coordinator-cancelar-sesion-modal
        [isOpen]="aRechazar() !== null"
        [nombreSesion]="aRechazar()?.nombreSesion ?? ''"
        [titulo]="'Rechazar solicitud ' + (aRechazar()?.nombreSesion ?? '')"
        [nota]="'La sesión queda rechazada y se notifica al docente. Los estudiantes no reciben aviso.'"
        textoConfirmar="Rechazar solicitud"
        textoEnviando="Rechazando…"
        [motivos]="motivos()"
        [errorMotivos]="errorMotivos()"
        [errorMensaje]="errorResolucion()"
        [enviando]="enviando()"
        (confirmado)="confirmarRechazo($event)"
        (closed)="cerrarDialogos()"
      />
    </section>
  `,
})
export class CoordinatorSolicitudesSesionComponent implements OnInit {
  private readonly sesionesService = inject(CoordinadorSesionesService);
  private readonly programa = inject(CoordinatorProgramService);
  private readonly toast = inject(ToastService);
  private readonly timeZone = inject(SessionTimeZoneService);

  /** Emite tras aprobar o rechazar, para que la pantalla que lo aloja refresque sus contadores. */
  readonly resuelta = output<void>();

  readonly solicitudes = signal<SolicitudSesionItem[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly tamano = signal(20);
  readonly soloPendientes = signal(true);
  readonly cargando = signal(false);
  readonly error = signal<LoadErrorState | null>(null);
  /** Instante de la última carga: «Solicitada hace…» se calcula una vez, sin timers. */
  readonly ahora = signal(new Date());

  readonly aAprobar = signal<SolicitudSesionItem | null>(null);
  readonly aRechazar = signal<SolicitudSesionItem | null>(null);
  readonly motivos = signal<MotivoCancelacionCoordinador[]>([]);
  readonly errorMotivos = signal<string | null>(null);
  readonly errorResolucion = signal<string | null>(null);
  readonly enviando = signal(false);

  ngOnInit(): void {
    // Se conocen los programas del coordinador antes de pedir datos, para enviar siempre programaId.
    this.programa.cargar().subscribe({
      next: () => this.cargar(),
      error: (e: unknown) => this.toast.error(getApiErrorMessage(e)),
    });
  }

  zona(): string {
    return this.timeZone.zone();
  }

  hace(s: SolicitudSesionItem): string {
    return formatearHace(s.fechaSolicitudUtc, this.ahora());
  }

  variante(estado: EstadoSolicitudSesion): BadgeVariant {
    if (estado === 'PENDIENTE') return 'warning';
    if (estado === 'APROBADA') return 'success';
    return 'danger';
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.sesionesService
      .consultarSolicitudes({
        soloPendientes: this.soloPendientes(),
        programaId: this.programa.programaId(),
        pagina: this.pagina(),
        tamano: this.tamano(),
      })
      .subscribe({
        next: (res) => {
          this.solicitudes.set(res.elementos ?? []);
          this.total.set(Number(res.totalElementos ?? 0));
          this.ahora.set(new Date());
          this.cargando.set(false);
        },
        error: (e: unknown) => {
          this.solicitudes.set([]);
          this.total.set(0);
          this.cargando.set(false);
          this.error.set(classifyLoadError(e));
          this.toast.error(getApiErrorMessage(e));
        },
      });
  }

  alternarSoloPendientes(valor: boolean): void {
    this.soloPendientes.set(valor);
    this.pagina.set(1);
    this.cargar();
  }

  onPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  onTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
    this.cargar();
  }

  abrirAprobar(solicitud: SolicitudSesionItem): void {
    this.errorResolucion.set(null);
    this.aAprobar.set(solicitud);
  }

  abrirRechazar(solicitud: SolicitudSesionItem): void {
    this.errorResolucion.set(null);
    this.aRechazar.set(solicitud);
    if (this.motivos().length === 0) this.cargarMotivos();
  }

  cerrarDialogos(): void {
    this.aAprobar.set(null);
    this.aRechazar.set(null);
    this.errorResolucion.set(null);
    this.enviando.set(false);
  }

  confirmarAprobacion(observacion: string | undefined): void {
    const solicitud = this.aAprobar();
    if (!solicitud || this.enviando()) return;
    this.resolver(this.sesionesService.aprobar(solicitud.idSesion, observacion), mensajeUi('UI_COORDINATOR_SOLICITUDES_SESION_001'));
  }

  confirmarRechazo(request: { codigoMotivo: string; observacion?: string }): void {
    const solicitud = this.aRechazar();
    if (!solicitud || this.enviando()) return;
    this.resolver(
      this.sesionesService.rechazar(solicitud.idSesion, request.codigoMotivo, request.observacion),
      mensajeUi('UI_COORDINATOR_SOLICITUDES_SESION_002')
    );
  }

  private resolver(llamada: ReturnType<CoordinadorSesionesService['aprobar']>, respaldo: string): void {
    this.errorResolucion.set(null);
    this.enviando.set(true);
    llamada.subscribe({
      next: (res) => {
        this.toast.success(getApiSuccessMessage(res, respaldo));
        this.cerrarDialogos();
        this.cargar();
        this.resuelta.emit();
      },
      error: (e: unknown) => {
        this.enviando.set(false);
        this.errorResolucion.set(getApiErrorMessage(e));
      },
    });
  }

  private cargarMotivos(): void {
    this.errorMotivos.set(null);
    this.sesionesService.getMotivosCancelacion().subscribe({
      next: (res) => this.motivos.set(res.datos ?? []),
      error: (e: unknown) => {
        this.motivos.set([]);
        this.errorMotivos.set(getApiErrorMessage(e));
      },
    });
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { RealtimeConnectionState } from '../../../../core/realtime/model/realtime-connection-state.model';
import {
  AsistenciaQrRegistradaPayload,
  AsistenciaQrRotadoPayload,
  REALTIME_EVENT_TYPE,
} from '../../../../core/realtime/model/realtime-event.model';
import { AsistenciaQrService } from '../../../../core/services/asistencia-qr.service';
import { QrToma } from '../../../../core/models/asistencia-qr.model';
import { TomaAsistencia } from '../../../../core/models/toma-asistencia.model';
import { ATTENDANCE_NOW } from '../../../../core/utils/attendance-now.token';
import { ActionMenuItem } from '../../../../shared/components/action-menu/action-menu.component';
import { QrProyeccionComponent } from '../../../../shared/components/qr-proyeccion/qr-proyeccion.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';

const ESTADOS_SIN_CANAL: readonly RealtimeConnectionState[] = ['RECONNECTING', 'ERROR', 'UNAUTHORIZED'];

/**
 * CULM-001 B.2 (HU175): vista de proyeccion del QR de una toma para el video beam o la tablet del docente.
 *
 * Sin temporizadores ([SUPUESTO-B-13]): el QR y el PIN llegan por HTTP al abrir y por el evento SSE
 * `ASISTENCIA_QR_ROTADO` despues; la barra de rotacion es una animacion CSS cuya duracion se calcula al recibir
 * cada QR, y "Proxima rotacion" es una hora fija derivada de `fechaRotacionUtc + rotacionSegundos`.
 */
@Component({
  selector: 'app-toma-qr-proyeccion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QrProyeccionComponent],
  template: `
    <app-qr-proyeccion
      etiqueta="Asistencia por código QR"
      [titulo]="tituloCompleto()"
      [qrPngBase64]="qrActual().qrPngBase64"
      [pin]="pinVisible()"
      altQr="Código QR para registrar la asistencia"
      [estadoVentana]="toma().estado"
      [programa]="programa()"
      [segundosRestantes]="duracionBarra()"
      [proximaRotacion]="proximaRotacion()"
      [ciclo]="ciclo()"
      etiquetaCerrar="Dejar de proyectar"
      testidCerrar="qr-dejar"
      [cerrarConEscape]="false"
      [accionesMenu]="acciones()"
      (cerrar)="dejarDeProyectarClick()"
      (accionElegida)="alElegirAccion($event)"
    >
      <div avisos class="space-y-2">
        @if (sinCanal()) {
          <div
            class="mx-4 mt-3 rounded-xl bg-warning-100 text-warning-900 px-4 py-2 text-sm font-medium"
            role="status"
            data-testid="qr-conexion-perdida"
          >
            Se perdió la conexión en vivo. Usa "Regenerar" para obtener un código nuevo.
          </div>
        }
        @if (error()) {
          <div class="mx-4 mt-3 rounded-xl bg-danger-100 text-danger-900 px-4 py-2 text-sm font-medium" role="alert" data-testid="qr-error">
            {{ error() }}
          </div>
        }
      </div>

      <p class="text-3xl font-serif font-bold text-primary-700" data-testid="qr-presentes">Presentes: {{ presentes() }}</p>
      <p detalles>Válido solo con la red Wi-Fi del campus UCO.</p>
    </app-qr-proyeccion>
  `,
})
export class TomaQrProyeccionComponent {
  private readonly realtime = inject(RealtimeService);
  private readonly qrService = inject(AsistenciaQrService);
  private readonly now = inject(ATTENDANCE_NOW);

  readonly toma = input.required<TomaAsistencia>();
  readonly qr = input.required<QrToma>();
  readonly grupoId = input.required<string>();
  readonly titulo = input<string>('');
  /** Programa seleccionado en grupos mixtos (opcional). */
  readonly programa = input<string | null>(null);

  readonly dejarDeProyectar = output<void>();
  readonly cerrarToma = output<void>();

  private readonly qrRecibido = signal<QrToma | null>(null);
  private readonly presentesRecibidos = signal<number | null>(null);
  protected readonly regenerando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly qrActual = computed(() => {
    const recibido = this.qrRecibido();
    const inicial = this.qr();
    return recibido && recibido.idToma === inicial.idToma ? recibido : inicial;
  });

  protected readonly acciones = computed<ActionMenuItem[]>(() => [
    { id: 'regenerar', label: 'Regenerar código', testid: 'qr-regenerar', disabled: this.regenerando() },
    { id: 'cerrar-toma', label: 'Cerrar toma', testid: 'qr-cerrar-toma', danger: true },
  ]);

  protected alElegirAccion(id: string): void {
    if (id === 'regenerar') this.regenerar();
    else if (id === 'cerrar-toma') this.cerrarToma.emit();
  }

  protected readonly presentes = computed(() => this.presentesRecibidos() ?? this.toma().totalPresentes);

  protected readonly pinVisible = computed(() => {
    const pin = this.qrActual().pin;
    return pin.length === 6 ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin;
  });

  private readonly estadoConexion = toSignal(this.realtime.connectionState$, {
    initialValue: 'CONNECTED' as RealtimeConnectionState,
  });
  protected readonly sinCanal = computed(() => ESTADOS_SIN_CANAL.includes(this.estadoConexion()));

  private readonly proximaRotacionMs = computed(() => {
    const qr = this.qrActual();
    return Date.parse(qr.fechaRotacionUtc) + qr.rotacionSegundos * 1000;
  });

  protected readonly proximaRotacion = computed(() => {
    const ms = this.proximaRotacionMs();
    if (Number.isNaN(ms)) return '--:--:--';
    return new Date(ms).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  });

  /** Alternar entre dos animaciones identicas reinicia la barra CSS con cada QR nuevo, sin temporizadores. */
  protected readonly ciclo = signal(0);
  protected readonly tituloCompleto = computed(() => `${this.titulo()} · Toma ${this.toma().numero}`);

  protected readonly duracionBarra = computed(() => {
    const restante = Math.round((this.proximaRotacionMs() - this.now()) / 1000);
    return Number.isFinite(restante) ? Math.max(1, restante) : this.qrActual().rotacionSegundos;
  });

  constructor() {
    effect((onCleanup) => {
      const grupo = this.grupoId();
      const idToma = this.toma().idToma;
      this.realtime.startForGroup(grupo);

      const rotado = this.realtime
        .listenType<AsistenciaQrRotadoPayload>(REALTIME_EVENT_TYPE.ASISTENCIA_QR_ROTADO)
        .subscribe((evento) => {
          const p = evento.payload;
          if (p?.toma !== idToma) return;
          this.ciclo.update((n) => n + 1);
          this.qrRecibido.set({
            idToma: p.toma,
            idSesion: p.sesion,
            idGrupo: p.grupo,
            pin: p.pin,
            urlAsistencia: p.urlAsistencia,
            qrPngBase64: p.qrPngBase64,
            fechaRotacionUtc: p.fechaRotacionUtc,
            fechaExpiracionUtc: p.fechaExpiracionUtc,
            rotacionSegundos: p.rotacionSegundos,
          });
          this.error.set(null);
        });

      const registrada = this.realtime
        .listenType<AsistenciaQrRegistradaPayload>(REALTIME_EVENT_TYPE.ASISTENCIA_QR_REGISTRADA)
        .subscribe((evento) => {
          if (evento.payload?.toma === idToma) {
            this.presentesRecibidos.set(evento.payload.totalPresentes);
          }
        });

      onCleanup(() => {
        rotado.unsubscribe();
        registrada.unsubscribe();
      });
    });
  }

  protected regenerar(): void {
    this.regenerando.set(true);
    this.error.set(null);
    this.qrService.rotarQr(this.toma().idToma).subscribe({
      next: (respuesta) => {
        this.regenerando.set(false);
        this.ciclo.update((n) => n + 1);
        this.qrRecibido.set(respuesta.datos);
      },
      error: (err: unknown) => {
        this.regenerando.set(false);
        this.error.set(getApiErrorMessage(err));
      },
    });
  }

  protected dejarDeProyectarClick(): void {
    this.qrService.cerrarQr(this.toma().idToma).subscribe({
      next: () => this.dejarDeProyectar.emit(),
      error: (err: unknown) => this.error.set(getApiErrorMessage(err)),
    });
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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
  styles: [
    `
      @keyframes toma-barra-a {
        from {
          transform: scaleX(1);
        }
        to {
          transform: scaleX(0);
        }
      }
      @keyframes toma-barra-b {
        from {
          transform: scaleX(1);
        }
        to {
          transform: scaleX(0);
        }
      }
      .toma-barra-rotacion {
        transform-origin: left center;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }
    `,
  ],
  template: `
    <div
      class="fixed inset-0 z-50 flex flex-col bg-warm-950 text-white overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Proyección del código de asistencia"
    >
      <header class="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-warm-800">
        <div class="min-w-0">
          <p class="text-xs uppercase tracking-widest text-primary-300 font-semibold">
            Asistencia por código QR
          </p>
          <h2 class="font-serif font-bold text-xl sm:text-2xl truncate" data-testid="qr-titulo">
            {{ titulo() }}<span class="text-warm-300"> · Toma {{ toma().numero }}</span>
          </h2>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="qr-pantalla-completa"
            (click)="pantallaCompleta()"
            class="min-h-[44px] min-w-[44px] px-4 rounded-xl border border-warm-600 text-sm font-semibold hover:bg-warm-800"
          >
            Pantalla completa
          </button>
          <button
            type="button"
            data-testid="qr-regenerar"
            (click)="regenerar()"
            [disabled]="regenerando()"
            class="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-primary-700 text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
          >
            Regenerar
          </button>
          <button
            type="button"
            data-testid="qr-dejar"
            (click)="dejarDeProyectarClick()"
            class="min-h-[44px] min-w-[44px] px-4 rounded-xl border border-warm-600 text-sm font-semibold hover:bg-warm-800"
          >
            Dejar de proyectar
          </button>
          <button
            type="button"
            data-testid="qr-cerrar-toma"
            (click)="cerrarToma.emit()"
            class="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-danger-600 text-sm font-semibold hover:bg-danger-700"
          >
            Cerrar toma
          </button>
        </div>
      </header>

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

      <main class="flex-1 grid gap-6 p-4 sm:p-6 items-center justify-items-center landscape:grid-cols-2 lg:grid-cols-2">
        <div class="bg-white rounded-3xl p-3 sm:p-5 flex items-center justify-center" [style.width]="'min(62vmin, 92vw)'">
          <img
            data-testid="qr-img"
            class="w-full h-auto block"
            [src]="'data:image/png;base64,' + qrActual().qrPngBase64"
            alt="Código QR para registrar la asistencia"
          />
        </div>

        <div class="text-center space-y-4 w-full">
          <p class="text-sm uppercase tracking-widest text-warm-300">O ingresa este PIN</p>
          <p
            class="font-mono font-bold tracking-widest leading-none"
            [style.font-size]="'11vmin'"
            data-testid="qr-pin"
          >
            {{ pinVisible() }}
          </p>
          <p class="text-3xl font-serif font-bold text-primary-300" data-testid="qr-presentes">
            Presentes: {{ presentes() }}
          </p>
          <div class="max-w-md mx-auto space-y-1">
            <div class="h-2 rounded-full bg-warm-800 overflow-hidden" aria-hidden="true">
              <div
                class="toma-barra-rotacion h-full w-full bg-primary-400"
                data-testid="qr-barra-rotacion"
                [style.animation-name]="nombreAnimacion()"
                [style.animation-duration.s]="duracionBarra()"
              ></div>
            </div>
            <p class="text-sm text-warm-300" data-testid="qr-proxima-rotacion">
              Próxima rotación: {{ proximaRotacion() }}
            </p>
          </div>
          <p class="text-xs text-warm-400">Válido solo con la red Wi-Fi del campus UCO.</p>
        </div>
      </main>
    </div>
  `,
})
export class TomaQrProyeccionComponent {
  private readonly realtime = inject(RealtimeService);
  private readonly qrService = inject(AsistenciaQrService);
  private readonly now = inject(ATTENDANCE_NOW);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly toma = input.required<TomaAsistencia>();
  readonly qr = input.required<QrToma>();
  readonly grupoId = input.required<string>();
  readonly titulo = input<string>('');

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
  private readonly ciclo = signal(0);
  protected readonly nombreAnimacion = computed(() => (this.ciclo() % 2 === 0 ? 'toma-barra-a' : 'toma-barra-b'));

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

  protected pantallaCompleta(): void {
    const el = this.host.nativeElement;
    if (typeof el.requestFullscreen === 'function') {
      void el.requestFullscreen().catch(() => undefined);
    }
  }
}

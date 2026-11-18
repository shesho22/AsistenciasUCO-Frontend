import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';
import { TomaAsistencia, TomasSesion } from '../../../../core/models/toma-asistencia.model';
import { detalleCancelacion, estaCancelada } from '../../../../core/models/sesion-estado.model';
import { NotificacionToma, TomaAsistenciasComponent } from './toma-asistencias.component';
import { ResumenSesionTomasComponent } from './resumen-sesion-tomas.component';
import { TomaCierreDialogComponent } from './toma-cierre-dialog.component';

const RESUMEN = 'resumen';

/** ATA D4/F: minutos antes del cierre de la ventana en que se recuerda revisar las tomas (constante de presentación). */
export const TOLERANCIA_MINUTOS = 15;

/** Mayor retardo que admite `setTimeout`; un cierre más lejano no necesita recordatorio programado. */
const MAXIMO_RETARDO_MS = 2_147_483_647;

/**
 * UX de la toma: una toma = un panel. Con varias tomas se muestran como pestañas (con desplazamiento horizontal
 * propio en móvil) más la pestaña "Resumen de la sesión"; con una sola, su lista aparece directamente. La toma
 * abierta es la activa por defecto. Presenta lo que entrega el backend; la ventana de la sesión la calcula la BD,
 * no el cliente.
 */
@Component({
    selector: 'app-session-tomas-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TomaAsistenciasComponent, ResumenSesionTomasComponent, TomaCierreDialogComponent],
    template: `
    <section
      class="superficie p-4 sm:p-5 space-y-4"
      data-testid="panel-tomas"
      aria-label="Tomas de asistencia de la sesión"
    >
      @if (tomasSesion(); as datos) {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-serif font-bold text-lg text-warm-900">Tomas de asistencia</h3>
            <p class="text-xs text-warm-600">
              {{ datos.tomas.length }} de {{ datos.maximoTomas }} tomas · {{ datos.horasSesion }} h de sesión
              @if (cancelada()) {
                · <strong class="text-warning-800">Cancelada</strong>
                @if (detalle()) {
                  <span> ({{ detalle() }})</span>
                }
              }
            </p>
          </div>
          <div class="flex flex-col items-stretch sm:items-end gap-1">
            <button
              type="button"
              data-testid="nueva-toma"
              (click)="solicitarNuevaToma()"
              [disabled]="!puedeAbrir()"
              class="min-h-[44px] px-5 rounded-xl bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ abriendo() ? 'Abriendo…' : 'Nueva toma' }}
            </button>
            @if (motivo()) {
              <p class="text-xs text-warm-600" data-testid="nueva-toma-motivo">{{ motivo() }}</p>
            }
          </div>
        </div>

        @if (recordatorioCierre()) {
          <p
            class="text-xs font-medium rounded-xl px-3.5 py-2.5 border text-warning-900 bg-warning-50 border-warning-200"
            role="status"
            data-testid="recordatorio-cierre"
          >
            La sesión termina a las {{ horaCierre() }}: revisa y cierra las tomas. Al terminar se cerrarán solas y quien no tenga registro quedará con falta.
          </p>
        }

        @if (datos.tomas.length > 1) {
          <div
            class="flex gap-1 overflow-x-auto sm:flex-wrap sm:overflow-visible border-b border-warm-200 px-1"
            role="tablist"
            aria-label="Tomas de la sesión"
            data-testid="tabs-tomas"
          >
            @for (t of datos.tomas; track t.idToma) {
              <button
                type="button"
                role="tab"
                [id]="'tab-' + t.idToma"
                [attr.data-testid]="'tab-' + t.idToma"
                [attr.aria-selected]="activa() === t.idToma"
                [attr.aria-controls]="'panel-' + t.idToma"
                (click)="seleccionar(t.idToma)"
                class="shrink-0 whitespace-nowrap min-h-[44px] px-4 text-sm border-b-2 transition-colors"
                [class]="clasesTab(activa() === t.idToma)"
              >
                Toma {{ t.numero }}
                <span class="text-xs font-normal text-warm-600">· {{ horaDe(t) }} · {{ t.modo === 'QR' ? 'QR' : 'Manual' }} · {{ t.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada' }}</span>
                @if ((sinGuardar()[t.idToma] ?? 0) > 0) {
                  <span class="ml-1 text-warning-800" [attr.data-testid]="'tab-sin-guardar-' + t.idToma">
                    <span aria-hidden="true">●</span><span class="sr-only">Cambios sin guardar</span>
                  </span>
                }
              </button>
            }
            <button
              type="button"
              role="tab"
              id="tab-resumen"
              data-testid="tab-resumen"
              [attr.aria-selected]="activa() === resumenId"
              aria-controls="panel-resumen"
              (click)="seleccionar(resumenId)"
              class="shrink-0 whitespace-nowrap min-h-[44px] px-4 text-sm border-b-2 transition-colors"
              [class]="clasesTab(activa() === resumenId)"
            >
              Resumen de la sesión
            </button>
          </div>
        }

        @if (datos.tomas.length > 0) {
          <p class="text-xs text-warm-600" data-testid="linea-puntos-control">
            Puntos de control:
            @for (t of datos.tomas; track t.idToma; let ultima = $last) {
              Toma {{ t.numero }} a las {{ horaDe(t) }}{{ ultima ? '.' : ' ·' }}
            }
          </p>
        }

        @for (t of datos.tomas; track t.idToma) {
          <div
            role="tabpanel"
            [id]="'panel-' + t.idToma"
            [attr.data-testid]="'tabpanel-' + t.idToma"
            [attr.aria-labelledby]="datos.tomas.length > 1 ? 'tab-' + t.idToma : null"
            [hidden]="activa() !== t.idToma"
          >
            <app-toma-asistencias
              [toma]="t"
              [ventanaAbierta]="ventanaAbierta()"
              (proyectarQr)="proyectarQr.emit($event)"
              (cerrarToma)="cerrarToma.emit($event)"
              (actualizado)="actualizado.emit()"
              (notificacion)="notificacion.emit($event)"
              (sinGuardar)="registrarSinGuardar(t.idToma, $event)"
            />
          </div>
        } @empty {
          <p class="text-sm text-warm-600" data-testid="sin-tomas">Aún no hay tomas abiertas en esta sesión.</p>
        }

        @if (activa() === resumenId) {
          <div role="tabpanel" id="panel-resumen" aria-labelledby="tab-resumen" data-testid="tabpanel-resumen">
            <app-resumen-sesion-tomas [tomas]="datos.tomas" [sesionId]="datos.idSesion" />
          </div>
        }
        @if (confirmandoNueva() && tomaAbierta(); as abierta) {
          <div data-testid="nueva-toma-dialogo">
            <app-toma-cierre-dialog
              modo="nueva"
              [numeroToma]="abierta.numero"
              [sinGuardar]="(sinGuardar()[abierta.idToma] ?? 0) > 0"
              (confirmar)="confirmarNueva()"
              (cancelar)="confirmandoNueva.set(false)"
            />
          </div>
        }
      } @else {
        <div class="h-16 rounded-xl bg-warm-100 animate-pulse" data-testid="panel-tomas-cargando"></div>
      }
    </section>
  `
})
export class SessionTomasPanelComponent {
  readonly tomasSesion = input<TomasSesion | null>(null);
  readonly abriendo = input<boolean>(false);

  readonly nuevaToma = output<void>();
  readonly proyectarQr = output<TomaAsistencia>();
  readonly cerrarToma = output<TomaAsistencia>();
  readonly actualizado = output<void>();
  readonly notificacion = output<NotificacionToma>();

  private readonly zona = inject(SessionTimeZoneService);
  protected readonly resumenId = RESUMEN;
  private readonly seleccion = signal<string | null>(null);
  protected readonly sinGuardar = signal<Readonly<Record<string, number | undefined>>>({});
  private tomasPrevias = 0;
  /** ATA F: se activa a `TOLERANCIA_MINUTOS` del cierre de la ventana. */
  protected readonly recordatorioCierre = signal(false);
  private temporizadorRecordatorio: ReturnType<typeof setTimeout> | null = null;

  protected readonly cancelada = computed(() => estaCancelada({ estado: this.tomasSesion()?.estado }));
  protected readonly detalle = computed(() => detalleCancelacion(this.tomasSesion()?.cancelacion));
  protected readonly ventanaAbierta = computed(() => (this.tomasSesion()?.ventana.abierta ?? false) && !this.cancelada());

  /** La toma abierta es la activa por defecto; si no hay, la más reciente. "Resumen" solo existe con varias tomas. */
  protected readonly activa = computed<string | null>(() => {
    const tomas = this.tomasSesion()?.tomas ?? [];
    const elegida = this.seleccion();
    if (elegida === RESUMEN && tomas.length > 1) return RESUMEN;
    if (elegida && tomas.some((t) => t.idToma === elegida)) return elegida;
    return (tomas.find((t) => t.estado === 'ABIERTA') ?? tomas.at(-1))?.idToma ?? null;
  });

  protected readonly motivo = computed<string | null>(() => {
    const datos = this.tomasSesion();
    if (!datos) return null;
    if (this.cancelada()) return 'La sesión está cancelada; no se pueden abrir tomas.';
    if (datos.tomas.length >= datos.maximoTomas) return `Se alcanzó el máximo de ${datos.maximoTomas} tomas por sesión.`;
    if (!datos.ventana.abierta) return 'La ventana de asistencia de la sesión está cerrada.';
    return null;
  });

  protected readonly tomaAbierta = computed(() => this.tomasSesion()?.tomas.find((t) => t.estado === 'ABIERTA') ?? null);
  /** ATA D9: confirmación previa cuando "Nueva toma" va a cerrar la toma abierta. */
  protected readonly confirmandoNueva = signal(false);

  protected readonly horaCierre = computed(() => this.zona.formatTemporal(this.tomasSesion()?.ventana.cierreUtc, 'time'));

  protected readonly puedeAbrir = computed(() => this.tomasSesion() !== null && this.motivo() === null && !this.abriendo());

  constructor() {
    // Al abrirse una toma nueva, esa pasa a ser la activa aunque el docente estuviera mirando otra pestaña.
    effect(() => {
      const cantidad = this.tomasSesion()?.tomas.length ?? 0;
      untracked(() => {
        if (cantidad > this.tomasPrevias) this.seleccion.set(null);
        this.tomasPrevias = cantidad;
      });
    });

    // Si la toma abierta desaparece (cierre automático o de otro dispositivo), la confirmación pendiente ya no aplica.
    effect(() => {
      if (!this.tomaAbierta()) untracked(() => this.confirmandoNueva.set(false));
    });

    // Recordatorio de cierre: un único setTimeout programado al instante en que empieza el aviso (sin polling).
    effect(() => {
      const cierre = this.ventanaAbierta() ? (this.tomasSesion()?.ventana.cierreUtc ?? null) : null;
      untracked(() => this.programarRecordatorio(cierre));
    });
    inject(DestroyRef).onDestroy(() => this.limpiarRecordatorio());
  }

  private programarRecordatorio(cierreUtc: string | null): void {
    this.limpiarRecordatorio();
    this.recordatorioCierre.set(false);
    const cierre = cierreUtc ? Date.parse(cierreUtc) : Number.NaN;
    if (Number.isNaN(cierre)) return;
    const faltante = cierre - Date.now();
    if (faltante <= 0) return;
    const umbral = TOLERANCIA_MINUTOS * 60_000;
    if (faltante <= umbral) {
      this.recordatorioCierre.set(true);
      return;
    }
    const espera = faltante - umbral;
    if (espera > MAXIMO_RETARDO_MS) return;
    this.temporizadorRecordatorio = setTimeout(() => {
      this.temporizadorRecordatorio = null;
      this.recordatorioCierre.set(true);
    }, espera);
  }

  private limpiarRecordatorio(): void {
    if (this.temporizadorRecordatorio !== null) clearTimeout(this.temporizadorRecordatorio);
    this.temporizadorRecordatorio = null;
  }

  protected horaDe(toma: TomaAsistencia): string {
    return this.zona.formatTemporal(toma.fechaPuntoControlUtc, 'time');
  }

  /** Con una toma abierta pide confirmación (el servidor la cierra al abrir la nueva); sin ella abre directo. */
  protected solicitarNuevaToma(): void {
    if (this.tomaAbierta()) this.confirmandoNueva.set(true);
    else this.nuevaToma.emit();
  }

  protected confirmarNueva(): void {
    this.confirmandoNueva.set(false);
    this.nuevaToma.emit();
  }

  protected seleccionar(id: string): void {
    this.seleccion.set(id);
  }

  protected registrarSinGuardar(tomaId: string, cantidad: number): void {
    this.sinGuardar.update((actual) => (actual[tomaId] === cantidad ? actual : { ...actual, [tomaId]: cantidad }));
  }

  protected clasesTab(activa: boolean): string {
    return activa
      ? 'font-bold text-primary-800 border-primary-700'
      : 'font-medium text-warm-700 border-transparent hover:text-warm-900';
  }
}

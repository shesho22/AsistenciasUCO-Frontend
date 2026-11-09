import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { TomaAsistencia, TomasSesion } from '../../../../core/models/toma-asistencia.model';
import { detalleCancelacion, estaCancelada } from '../../../../core/models/sesion-estado.model';
import { NotificacionToma, TomaAsistenciasComponent } from './toma-asistencias.component';
import { ResumenSesionTomasComponent } from './resumen-sesion-tomas.component';

const RESUMEN = 'resumen';

/**
 * UX de la toma: una toma = un panel. Con varias tomas se muestran como pestañas (con desplazamiento horizontal
 * propio en móvil) más la pestaña "Resumen de la sesión"; con una sola, su lista aparece directamente. La toma
 * abierta es la activa por defecto. Presenta lo que entrega el backend; la ventana de la sesión la calcula la BD,
 * no el cliente.
 */
@Component({
  selector: 'app-session-tomas-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TomaAsistenciasComponent, ResumenSesionTomasComponent],
  template: `
    <section
      class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm p-4 sm:p-5 space-y-4"
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
              (click)="nuevaToma.emit()"
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

        @if (datos.tomas.length > 1) {
          <div
            class="flex gap-1 overflow-x-auto border-b border-warm-200 px-1"
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
                <span class="text-xs font-normal text-warm-600">· {{ t.modo === 'QR' ? 'QR' : 'Manual' }} · {{ t.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada' }}</span>
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
            <app-resumen-sesion-tomas [tomas]="datos.tomas" [horasSesion]="datos.horasSesion" />
          </div>
        }
      } @else {
        <div class="h-16 rounded-xl bg-warm-100 animate-pulse" data-testid="panel-tomas-cargando"></div>
      }
    </section>
  `,
})
export class SessionTomasPanelComponent {
  readonly tomasSesion = input<TomasSesion | null>(null);
  readonly abriendo = input<boolean>(false);

  readonly nuevaToma = output<void>();
  readonly proyectarQr = output<TomaAsistencia>();
  readonly cerrarToma = output<TomaAsistencia>();
  readonly actualizado = output<void>();
  readonly notificacion = output<NotificacionToma>();

  protected readonly resumenId = RESUMEN;
  private readonly seleccion = signal<string | null>(null);
  protected readonly sinGuardar = signal<Readonly<Record<string, number | undefined>>>({});
  private tomasPrevias = 0;

  protected readonly cancelada = computed(() => estaCancelada({ estado: this.tomasSesion()?.estado }));
  protected readonly detalle = computed(() => detalleCancelacion(this.tomasSesion()?.cancelacion));
  protected readonly ventanaAbierta = computed(() => (this.tomasSesion()?.ventana.abierta ?? false) && !this.cancelada());

  /** La toma abierta es la activa por defecto; si no hay, la más reciente. "Resumen" solo existe con varias tomas. */
  protected readonly activa = computed<string | null>(() => {
    const tomas = this.tomasSesion()?.tomas ?? [];
    const elegida = this.seleccion();
    if (elegida === RESUMEN && tomas.length > 1) return RESUMEN;
    if (elegida && tomas.some((t) => t.idToma === elegida)) return elegida;
    return (tomas.find((t) => t.estado === 'ABIERTA') ?? tomas[tomas.length - 1])?.idToma ?? null;
  });

  protected readonly motivo = computed<string | null>(() => {
    const datos = this.tomasSesion();
    if (!datos) return null;
    if (this.cancelada()) return 'La sesión está cancelada; no se pueden abrir tomas.';
    if (datos.tomas.some((t) => t.estado === 'ABIERTA')) return 'Hay una toma abierta; ciérrala para abrir otra.';
    if (datos.tomas.length >= datos.maximoTomas) return `Se alcanzó el máximo de ${datos.maximoTomas} tomas por sesión.`;
    if (!datos.ventana.abierta) return 'La ventana de asistencia de la sesión está cerrada.';
    return null;
  });

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

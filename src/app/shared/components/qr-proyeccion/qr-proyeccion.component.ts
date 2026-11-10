import { ActionMenuComponent, ActionMenuItem } from '../action-menu/action-menu.component';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';

/**
 * CULM-001 (HU175, HU176B): vista de proyeccion compartida del QR y el PIN del docente (toma de asistencia y matricula
 * al grupo). Presentacion pura: el QR llega del backend como PNG en base64 y no se recalcula aqui. La barra de rotacion
 * es una animacion CSS cuya duracion informa el padre (`segundosRestantes`), sin temporizadores.
 */
@Component({
  selector: 'app-qr-proyeccion',
  standalone: true,
  imports: [ActionMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      @keyframes qr-barra-a {
        from {
          transform: scaleX(1);
        }
        to {
          transform: scaleX(0);
        }
      }
      @keyframes qr-barra-b {
        from {
          transform: scaleX(1);
        }
        to {
          transform: scaleX(0);
        }
      }
      .qr-barra-rotacion {
        transform-origin: left center;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }
    `,
  ],
  template: `
    <div
      class="fixed inset-0 z-50 text-warm-900 overflow-y-auto"
      [class]="ampliado() ? 'flex flex-col bg-warm-50' : 'flex items-center justify-center p-4 bg-warm-900/60 backdrop-blur-sm'"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'Proyección del código: ' + titulo()"
    >
     <div
      data-testid="qr-contenedor"
      [class]="ampliado() ? 'flex flex-col flex-1 w-full' : 'bg-warm-50 rounded-3xl border border-warm-200 shadow-warm-2xl max-w-lg w-full overflow-hidden'"
     >
      <header class="flex flex-wrap items-center justify-between gap-3 p-4 bg-primary-900 text-white">
        <div class="min-w-0">
          @if (etiqueta()) {
            <p class="text-xs uppercase tracking-widest text-success-200 font-semibold" data-testid="qr-etiqueta">{{ etiqueta() }}</p>
          }
          <h2 class="font-serif font-bold text-xl sm:text-2xl leading-tight truncate" data-testid="qr-titulo">{{ titulo() }}</h2>
          @if (subtitulo()) {
            <p class="text-xs sm:text-sm text-success-200 truncate" data-testid="qr-subtitulo">{{ subtitulo() }}</p>
          }
          <div class="flex flex-wrap gap-2 mt-1">
            @if (programa(); as prog) {
              <span class="text-[11px] font-semibold rounded-full bg-primary-800 text-primary-100 px-2 py-0.5" data-testid="qr-programa">
                Programa: {{ prog }}
              </span>
            }
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="qr-pantalla-completa"
            (click)="alternarPantallaCompleta()"
            class="min-h-[44px] min-w-[44px] px-4 rounded-xl border border-primary-300 text-sm font-semibold text-white hover:bg-primary-800"
          >
            {{ ampliado() ? 'Reducir' : 'Ampliar' }}
          </button>
          @if (mostrarCerrar()) {
            <button
              type="button"
              [attr.data-testid]="testidCerrar()"
              (click)="cerrar.emit()"
              class="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-white text-primary-900 text-sm font-semibold hover:bg-primary-100"
            >
              {{ etiquetaCerrar() }}
            </button>
          }
          <app-action-menu tone="dark" label="Más acciones de la proyección" [items]="accionesMenu()" (selected)="accionElegida.emit($event)" />
        </div>
      </header>

      <ng-content select="[avisos]" />

      <main
        class="grid items-center justify-items-center"
        [class]="ampliado() ? 'flex-1 gap-6 p-3 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)]' : 'gap-5 p-5 sm:grid-cols-2'"
      >
        <div
          data-testid="qr-tarjeta"
          class="bg-white border-2 border-warm-200 shadow-warm-sm flex items-center justify-center"
          [class]="ampliado() ? 'rounded-3xl p-2 sm:p-4' : 'rounded-xl p-2 w-40 h-40'"
          [style.width]="anchoQr()"
        >
          <img
            [attr.data-testid]="testidQr()"
            class="w-full h-auto block"
            [src]="'data:image/png;base64,' + qrPngBase64()"
            [alt]="altQr()"
          />
        </div>

        <div class="text-center space-y-4 w-full min-w-0">
          <div class="p-4 sm:p-6 rounded-2xl bg-success-50 border-2 border-success-300 shadow-warm-sm">
            <p class="text-xs font-bold uppercase tracking-wider text-success-800">{{ etiquetaPin() }}</p>
            <p
              class="font-mono font-extrabold tracking-widest leading-none text-success-950 select-all my-2 break-all"
              [class.text-3xl]="!ampliado()"
              [style.font-size]="tamanoPin()"
              [attr.data-testid]="testidPin()"
            >
              {{ pin() }}
            </p>
          </div>

          <ng-content />

          <div class="max-w-md mx-auto space-y-1">
            @if (segundosRestantes() !== null) {
              <div class="h-2 rounded-full bg-warm-200 overflow-hidden" aria-hidden="true">
                <div
                  class="qr-barra-rotacion h-full w-full bg-primary-600"
                  data-testid="qr-barra-rotacion"
                  [style.animation-name]="nombreAnimacion()"
                  [style.animation-duration.s]="segundosRestantes()"
                ></div>
              </div>
              @if (proximaRotacion()) {
                <p class="text-sm text-warm-700" data-testid="qr-proxima-rotacion">Próxima rotación: {{ proximaRotacion() }}</p>
              }
            } @else {
              <p class="text-sm text-warm-700" data-testid="qr-rotacion-automatica">El código se renueva automáticamente.</p>
            }
          </div>
          <details data-testid="qr-detalles" class="max-w-md mx-auto text-left rounded-xl border border-warm-200 bg-white/70 px-3 py-2">
            <summary class="cursor-pointer text-sm font-semibold text-warm-800 min-h-[32px] flex items-center">Detalles</summary>
            <div class="mt-2 space-y-2 text-xs text-warm-700">
              @if (estadoVentana(); as estado) {
                <p>
                  <span class="text-[11px] font-bold uppercase tracking-wider rounded-full bg-success-100 text-success-900 px-2 py-0.5" data-testid="qr-estado">
                    Ventana {{ estado }}
                  </span>
                </p>
              }
              <ng-content select="[detalles]" />
            </div>
          </details>
        </div>
      </main>
     </div>
    </div>
  `,
})
export class QrProyeccionComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly qrPngBase64 = input.required<string>();
  readonly pin = input.required<string>();
  readonly titulo = input<string>('');
  readonly subtitulo = input<string>('');
  readonly etiqueta = input<string>('');
  readonly etiquetaPin = input<string>('O ingresa este PIN');
  readonly altQr = input<string>('Código QR para escanear');
  /** Estado de la ventana (p. ej. ABIERTA); `null` lo oculta. */
  readonly estadoVentana = input<string | null>(null);
  /** Programa seleccionado en grupos mixtos; `null` lo oculta. */
  readonly programa = input<string | null>(null);
  /** Segundos que dura la barra de rotacion CSS; `null` si se desconoce el intervalo. */
  readonly segundosRestantes = input<number | null>(null);
  readonly proximaRotacion = input<string | null>(null);
  /** Cambia con cada codigo nuevo para reiniciar la barra. */
  readonly ciclo = input<number>(0);
  readonly mostrarCerrar = input<boolean>(true);
  readonly etiquetaCerrar = input<string>('Ocultar');
  readonly testidQr = input<string>('qr-img');
  readonly testidPin = input<string>('qr-pin');
  readonly testidCerrar = input<string>('qr-cerrar');
  /** Acciones secundarias (regenerar, copiar, cerrar la toma...) agrupadas en "Mas". */
  readonly accionesMenu = input<ActionMenuItem[]>([]);
  /** Si es false, Escape no cierra la proyeccion (solo reduce el QR ampliado). */
  readonly cerrarConEscape = input<boolean>(true);

  readonly cerrar = output<void>();
  readonly accionElegida = output<string>();

  private readonly enPantallaCompleta = signal(false);
  private readonly maximizado = signal(false);
  protected readonly ampliado = computed(() => this.enPantallaCompleta() || this.maximizado());

  /** Tamano normal: el de la tarjeta de matricula (sin ancho forzado); ampliado: el maximo del viewport. */
  protected readonly anchoQr = computed(() => (this.ampliado() ? 'min(88vh, 92vw)' : null));
  protected readonly tamanoPin = computed(() => (this.ampliado() ? 'clamp(2.75rem, 12vmin, 9rem)' : null));
  protected readonly nombreAnimacion = computed(() => (this.ciclo() % 2 === 0 ? 'qr-barra-a' : 'qr-barra-b'));

  @HostListener('document:fullscreenchange')
  protected alCambiarPantallaCompleta(): void {
    const activa = document.fullscreenElement === this.host.nativeElement;
    this.enPantallaCompleta.set(activa);
    if (activa) this.maximizado.set(false);
  }

  /** Escape reduce primero el QR ampliado; solo con tamano normal cierra la proyeccion. */
  @HostListener('document:keydown.escape')
  protected alPresionarEscape(): void {
    if (this.maximizado()) {
      this.maximizado.set(false);
    } else if (!this.enPantallaCompleta() && this.mostrarCerrar() && this.cerrarConEscape()) {
      this.cerrar.emit();
    }
  }

  protected alternarPantallaCompleta(): void {
    if (this.enPantallaCompleta()) {
      void document.exitFullscreen?.();
      return;
    }
    if (this.maximizado()) {
      this.maximizado.set(false);
      return;
    }
    const el = this.host.nativeElement;
    if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => this.maximizado.set(true));
    } else {
      this.maximizado.set(true);
    }
  }
}

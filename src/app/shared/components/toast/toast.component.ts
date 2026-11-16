import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect, untracked, OnDestroy } from '@angular/core';
import type { ToastType } from './toast.service';
import { mensajeUi } from '../../../core/messages/mensajes-ui';


export { ToastService } from './toast.service';
export type { ToastData, ToastType } from './toast.service';

@Component({
    selector: 'app-toast',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    @if (visible() || isExiting()) {
      <div
        [class]="containerClasses()"
        [attr.role]="type() === 'error' ? 'alert' : 'status'"
        [attr.aria-live]="type() === 'error' ? 'assertive' : 'polite'"
      >
        <div class="flex items-center gap-3">
          @switch (type()) {
            @case ('success') {
              <span class="p-1.5 bg-success-500/20 text-success-400 border border-success-500/30 rounded-xl shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            }
            @case ('info') {
              <span class="p-1.5 bg-info-500/20 text-info-400 border border-info-500/30 rounded-xl shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            }
            @case ('warning') {
              <span class="p-1.5 bg-warning-500/20 text-warning-400 border border-warning-500/30 rounded-xl shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
            }
            @case ('error') {
              <span class="p-1.5 bg-danger-500/20 text-danger-400 border border-danger-500/30 rounded-xl shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            }
          }

          <div class="flex-1 text-xs font-semibold text-warm-100 pr-2 leading-tight">
            {{ message() }}
            @if (referenciaTexto(); as texto) {
              <p class="mt-1 font-mono text-[11px] font-normal text-warm-300 select-text" data-testid="toast-referencia">{{ texto }}</p>
            }
          </div>

          <button
            type="button"
            (click)="triggerDismiss()"
            class="text-warm-400 hover:text-white p-1 rounded-lg transition-colors shrink-0 focus:outline-none"
            aria-label="Cerrar notificación"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    }
  `
})
export class ToastComponent implements OnDestroy {
  visible = input<boolean>(false);
  message = input<string>('');
  type = input<ToastType>('success');
  duration = input<number>(3500);
  /**
   * Número del aviso publicado (ToastService.secuencia). Un aviso nuevo con otro valor reinicia el temporizador y
   * cancela el cierre diferido del anterior, aunque `visible` ya fuera verdadero.
   */
  secuencia = input<number>(0);
  /** VAL OBS-14: referencia del error (correlationId); solo se muestra en los toasts de error. */
  reference = input<string | null | undefined>(null);

  dismissed = output<void>();

  isExiting = signal<boolean>(false);
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private exitTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      // Depende de `visible` y de `secuencia`: cada aviso nuevo reinicia su reloj aunque otro siguiera visible.
      this.secuencia();
      if (this.visible()) {
        untracked(() => {
          this.clearExitTimer();
          this.isExiting.set(false);
          this.startAutoDismissTimer();
        });
      }
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.clearExitTimer();
  }

  private startAutoDismissTimer(): void {
    this.clearTimer();
    this.timerId = setTimeout(() => {
      this.triggerDismiss();
    }, this.duration());
  }

  triggerDismiss(): void {
    this.clearTimer();
    this.clearExitTimer();
    this.isExiting.set(true);

    // El cierre diferido se cancela si llega un aviso nuevo antes de 250 ms: no debe ocultar al más reciente.
    this.exitTimerId = setTimeout(() => {
      this.exitTimerId = null;
      this.isExiting.set(false);
      this.dismissed.emit();
    }, 250);
  }

  private clearExitTimer(): void {
    if (this.exitTimerId) {
      clearTimeout(this.exitTimerId);
      this.exitTimerId = null;
    }
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  readonly referenciaTexto = computed(() => {
    const id = this.reference();
    return this.type() === 'error' && id ? mensajeUi('UI_ERROR_REFERENCIA', { id }) : null;
  });

  /** z-[60]: por encima de los modales (z-50); si no, el aviso de un error al enviar un modal queda oculto tras su fondo. */
  readonly containerClasses = computed(() => {
    const base = 'fixed top-16 right-6 z-[60] flex flex-col gap-2 p-3.5 bg-warm-950 text-white rounded-2xl shadow-warm-lg border border-primary-800/80 max-w-xs sm:max-w-sm w-full select-none';
    const anim = this.isExiting() ? 'animate-toast-exit' : 'animate-toast-enter';
    return `${base} ${anim}`;
  });
}

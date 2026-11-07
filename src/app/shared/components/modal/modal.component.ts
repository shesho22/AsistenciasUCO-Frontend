import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

let modalIdCounter = 0;

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="presentation"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-warm-950/40 backdrop-blur-xs transition-opacity animate-fade-in"
          (click)="close()"
          aria-hidden="true"
        ></div>

        <!-- Modal Box -->
        <div
          class="relative w-full max-w-lg bg-white rounded-2xl shadow-warm-lg border border-warm-200 p-6 z-10 animate-scale-up focus:outline-none"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          tabindex="-1"
          #dialog
        >
          <!-- Header -->
          <div class="flex items-center justify-between pb-4 border-b border-warm-100">
            <h3 [id]="titleId" class="font-serif font-semibold text-lg text-warm-900">{{ title() }}</h3>
            <button
              type="button"
              (click)="close()"
              class="text-warm-400 hover:text-warm-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 outline-none"
              aria-label="Cerrar modal"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="py-4">
            <ng-content></ng-content>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-warm-100">
            <ng-content select="[modal-footer]"></ng-content>
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('Diálogo');

  closed = output<void>();

  titleId = `modal-title-${++modalIdCounter}`;

  private readonly injector = inject(Injector);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private elementoPrevio: HTMLElement | null = null;
  private estabaAbierto = false;

  constructor() {
    effect(() => {
      const abierto = this.isOpen();
      if (abierto && !this.estabaAbierto) {
        this.estabaAbierto = true;
        this.elementoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        afterNextRender(() => this.enfocarPrimerElemento(), { injector: this.injector });
      } else if (!abierto && this.estabaAbierto) {
        this.estabaAbierto = false;
        const previo = this.elementoPrevio;
        this.elementoPrevio = null;
        if (previo && document.contains(previo)) {
          previo.focus();
        }
      }
    });
  }

  private enfocables(): HTMLElement[] {
    const raiz = this.dialog()?.nativeElement;
    if (!raiz) return [];
    return Array.from(
      raiz.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }

  private enfocarPrimerElemento(): void {
    const raiz = this.dialog()?.nativeElement;
    if (!raiz) return;
    // El primer elemento del cuerpo antes que el boton de cerrar; si no hay, el propio dialogo.
    const destino = this.enfocables().find((el) => el.getAttribute('aria-label') !== 'Cerrar modal') ?? raiz;
    destino.focus();
  }

  @HostListener('document:keydown', ['$event'])
  onTab(event: Event): void {
    const teclado = event as KeyboardEvent;
    if (!this.isOpen() || teclado.key !== 'Tab') return;
    const items = this.enfocables();
    const raiz = this.dialog()?.nativeElement;
    if (!raiz || items.length === 0) {
      teclado.preventDefault();
      raiz?.focus();
      return;
    }
    const primero = items[0];
    const ultimo = items[items.length - 1];
    const activo = document.activeElement;
    if (teclado.shiftKey && (activo === primero || activo === raiz)) {
      teclado.preventDefault();
      ultimo.focus();
    } else if (!teclado.shiftKey && activo === ultimo) {
      teclado.preventDefault();
      primero.focus();
    } else if (activo instanceof HTMLElement && !raiz.contains(activo)) {
      teclado.preventDefault();
      primero.focus();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.close();
    }
  }

  close() {
    this.closed.emit();
  }
}

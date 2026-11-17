import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';


let modalIdCounter = 0;

/** Ancho máximo del panel del diálogo. */
export type ModalTamano = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

const ANCHOS: Record<ModalTamano, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

/**
 * Pila de diálogos abiertos: solo el de arriba atiende Escape y atrapa Tab, así un diálogo de confirmación abierto
 * sobre otro no cierra los dos a la vez.
 */
const pilaAbiertos: ModalComponent[] = [];

@Component({
    selector: 'app-modal',
    imports: [],
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
          (click)="alPulsarFondo()"
          aria-hidden="true"
        ></div>

        <!-- Modal Box -->
        <div
          [class]="panelClases()"
          [attr.role]="dialogRole()"
          aria-modal="true"
          [attr.aria-describedby]="descriptionId()"
          [attr.aria-labelledby]="titleId"
          [attr.data-testid]="panelTestId()"
          tabindex="-1"
          #dialog
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-3 pb-4 border-b border-warm-100">
            <div class="flex items-center gap-3 min-w-0">
              <ng-content select="[modal-icono]"></ng-content>
              <div class="min-w-0">
                <h3 [id]="titleId" class="font-serif font-semibold text-lg text-warm-900" [attr.data-testid]="tituloTestId()">{{ title() }}</h3>
                @if (subtitulo()) {
                  <p class="text-xs text-warm-600 mt-0.5">{{ subtitulo() }}</p>
                }
                <ng-content select="[modal-encabezado]"></ng-content>
              </div>
            </div>
            <button
              type="button"
              (click)="close()"
              class="shrink-0 text-warm-400 hover:text-warm-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 outline-none"
              [attr.aria-label]="etiquetaCerrar()"
              [attr.data-testid]="cerrarTestId()"
              data-modal-cerrar
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

          <!-- Footer: se oculta cuando no hay contenido proyectado -->
          <div class="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-warm-100 empty:hidden"><ng-content select="[modal-footer]"></ng-content></div>
        </div>
      </div>
    }
  `
})
export class ModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('Diálogo');
  /** `alertdialog` para confirmaciones que interrumpen una acción destructiva. */
  dialogRole = input<'dialog' | 'alertdialog'>('dialog');
  /** id del elemento que describe el diálogo (aria-describedby). */
  descriptionId = input<string | null>(null);
  /** Ancho máximo del panel; `lg` por defecto. */
  tamano = input<ModalTamano>('lg');
  /** Línea secundaria bajo el título. Para texto con formato, la ranura `[modal-encabezado]`. */
  subtitulo = input<string | null>(null);
  /** Nombre accesible del botón de cerrar. */
  etiquetaCerrar = input<string>('Cerrar modal');
  /** `false` en formularios: un clic fuera del panel no descarta lo escrito. */
  cerrarAlPulsarFondo = input<boolean>(true);
  panelTestId = input<string | null>(null);
  tituloTestId = input<string | null>(null);
  cerrarTestId = input<string | null>(null);

  closed = output<void>();

  titleId = `modal-title-${++modalIdCounter}`;

  protected readonly panelClases = computed(
    () =>
      `relative w-full ${ANCHOS[this.tamano()]} bg-white rounded-2xl shadow-warm-lg border border-warm-200 p-6 z-10 animate-scale-up focus:outline-none`,
  );

  private readonly injector = inject(Injector);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private elementoPrevio: HTMLElement | null = null;
  private estabaAbierto = false;

  constructor() {
    effect(() => {
      const abierto = this.isOpen();
      if (abierto && !this.estabaAbierto) {
        this.estabaAbierto = true;
        pilaAbiertos.push(this);
        this.elementoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        afterNextRender(() => this.enfocarPrimerElemento(), { injector: this.injector });
      } else if (!abierto && this.estabaAbierto) {
        this.estabaAbierto = false;
        this.salirDeLaPila();
        const previo = this.elementoPrevio;
        this.elementoPrevio = null;
        if (previo && document.contains(previo)) {
          previo.focus();
        }
      }
    });
    inject(DestroyRef).onDestroy(() => this.salirDeLaPila());
  }

  private salirDeLaPila(): void {
    const i = pilaAbiertos.indexOf(this);
    if (i >= 0) pilaAbiertos.splice(i, 1);
  }

  private esElDeArriba(): boolean {
    return this.isOpen() && pilaAbiertos.at(-1) === this;
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
    const destino = this.enfocables().find((el) => !el.hasAttribute('data-modal-cerrar')) ?? raiz;
    destino.focus();
  }

  @HostListener('document:keydown', ['$event'])
  onTab(event: Event): void {
    const teclado = event as KeyboardEvent;
    if (teclado.key !== 'Tab' || !this.esElDeArriba()) return;
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
    if (this.esElDeArriba()) {
      this.close();
    }
  }

  alPulsarFondo(): void {
    if (this.cerrarAlPulsarFondo()) {
      this.close();
    }
  }

  close() {
    this.closed.emit();
  }
}

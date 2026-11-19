import { ChangeDetectionStrategy, Component, ElementRef, HostListener, effect, inject, input, output, signal } from '@angular/core';

export interface ActionMenuItem {
  id: string;
  label: string;
  testid?: string;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * CULM-001 (UX de densidad): menu "Mas acciones" accesible. Agrupa las acciones secundarias de una pantalla o tarjeta
 * para dejar visible una sola accion primaria. Presentacion pura: emite el `id` elegido y el padre decide que hacer.
 */
@Component({
  selector: 'app-action-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-block' },
  template: `
    @if (items().length > 0) {
      <button
        type="button"
        data-testid="action-menu-trigger"
        aria-haspopup="menu"
        [attr.aria-expanded]="abierto()"
        [attr.aria-label]="label()"
        (click)="alternar()"
        (keydown.arrowdown)="abrirConFlecha($event)"
        [class]="claseBoton()"
      >
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <circle cx="4" cy="10" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="16" cy="10" r="1.6" />
        </svg>
        <span>{{ texto() }}</span>
      </button>
      @if (abierto()) {
        <div
          role="menu"
          tabindex="-1"
          [attr.aria-label]="label()"
          [class]="clasePanel()"
          [style.top.px]="coordenadas()?.top ?? null"
          [style.bottom.px]="coordenadas()?.bottom ?? null"
          [style.right.px]="coordenadas()?.right ?? null"
          (keydown)="alTeclear($event)"
        >
          @for (item of items(); track item.id) {
            <button
              type="button"
              role="menuitem"
              tabindex="-1"
              [attr.data-testid]="item.testid ?? null"
              [disabled]="item.disabled ?? false"
              (click)="elegir(item)"
              class="block w-full text-left px-4 py-2.5 min-h-[44px] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
              [class]="item.danger ? 'text-danger-700 hover:bg-danger-50 focus:bg-danger-50' : 'text-warm-800 hover:bg-warm-100 focus:bg-warm-100'"
            >
              {{ item.label }}
            </button>
          }
        </div>
      }
    }
  `,
})
export class ActionMenuComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly items = input<ActionMenuItem[]>([]);
  /** Nombre accesible del boton y del menu. */
  readonly label = input<string>('Más acciones');
  /** Texto visible del boton. */
  readonly texto = input<string>('Más');
  readonly placement = input<'bottom' | 'top'>('bottom');
  /** `dark` para botones sobre cabeceras oscuras. */
  readonly tone = input<'light' | 'dark'>('light');
  /** Borde del botón con el que se alinea el panel: `end` (derecho, por defecto) o `start` (izquierdo, para botones a la izquierda de un contenedor que recorta). */
  readonly alineacion = input<'start' | 'end'>('end');
  /**
   * `true` dentro de contenedores que recortan (tablas con `overflow`): el panel se posiciona respecto a la ventana,
   * debajo del boton o encima si abajo no cabe, y se cierra al desplazar o redimensionar.
   */
  readonly flotante = input<boolean>(false);

  readonly selected = output<string>();

  protected readonly abierto = signal(false);
  /** Posicion del panel flotante en la ventana; `null` cuando el panel no flota. */
  protected readonly coordenadas = signal<{ top: number | null; bottom: number | null; right: number } | null>(null);

  constructor() {
    // El panel flotante no sigue al boton: cualquier desplazamiento (tambien el de la tabla o del contenedor
    // principal, por eso en captura) o cambio de tamano de la ventana lo cierra.
    effect((onCleanup) => {
      if (!this.abierto() || !this.flotante()) return;
      const cerrar = (): void => this.abierto.set(false);
      window.addEventListener('scroll', cerrar, true);
      window.addEventListener('resize', cerrar);
      onCleanup(() => {
        window.removeEventListener('scroll', cerrar, true);
        window.removeEventListener('resize', cerrar);
      });
    });
  }

  protected claseBoton(): string {
    const base =
      'inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3 rounded-xl border text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 outline-none';
    return this.tone() === 'dark'
      ? `${base} border-primary-300 text-white hover:bg-primary-800 focus-visible:ring-white`
      : `${base} border-warm-300 bg-white text-warm-800 hover:bg-warm-100 focus-visible:ring-primary-600`;
  }

  protected clasePanel(): string {
    // `whitespace-normal`: el menu puede vivir en una celda `whitespace-nowrap` y sus opciones van una por renglon.
    const comun = 'min-w-[13rem] max-w-[calc(100vw-2rem)] whitespace-normal rounded-xl border border-warm-200 bg-white py-1 shadow-warm-lg';
    if (this.flotante()) return `fixed z-50 ${comun}`;
    const lado = this.placement() === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
    const borde = this.alineacion() === 'start' ? 'left-0' : 'right-0';
    return `absolute ${borde} ${lado} z-40 ${comun}`;
  }

  /** Alto aproximado del panel: una fila de 44 px por accion mas el relleno. */
  private altoEstimadoPanel(): number {
    return this.items().length * 44 + 16;
  }

  private calcularCoordenadas(): void {
    if (!this.flotante()) {
      this.coordenadas.set(null);
      return;
    }
    const boton = this.host.nativeElement.querySelector<HTMLElement>('[data-testid="action-menu-trigger"]');
    if (!boton) return;
    const rect = boton.getBoundingClientRect();
    const margen = 8;
    const right = Math.max(margen, window.innerWidth - rect.right);
    const cabeAbajo = window.innerHeight - rect.bottom >= this.altoEstimadoPanel() + margen;
    const prefiereArriba = this.placement() === 'top' && rect.top >= this.altoEstimadoPanel() + margen;
    const arriba = prefiereArriba || (!cabeAbajo && rect.top > window.innerHeight - rect.bottom);
    this.coordenadas.set(
      arriba
        ? { top: null, bottom: window.innerHeight - rect.top + margen, right }
        : { top: rect.bottom + margen, bottom: null, right }
    );
  }

  protected alternar(): void {
    if (this.abierto()) {
      this.abierto.set(false);
      return;
    }
    this.abrir();
  }

  protected abrirConFlecha(ev: Event): void {
    ev.preventDefault();
    if (!this.abierto()) this.abrir();
  }

  private abrir(): void {
    this.calcularCoordenadas();
    this.abierto.set(true);
    // El menu se pinta en la deteccion de cambios que sigue al clic (antes de la proxima tarea): se enfoca la primera accion habilitada.
    setTimeout(() => this.botones()[0]?.focus(), 0);
  }

  protected elegir(item: ActionMenuItem): void {
    if (item.disabled) return;
    this.abierto.set(false);
    this.selected.emit(item.id);
  }

  protected alTeclear(ev: KeyboardEvent): void {
    const lista = this.botones();
    const actual = lista.indexOf(document.activeElement as HTMLButtonElement);
    const enfocar = (i: number): void => {
      ev.preventDefault();
      lista[i]?.focus();
    };
    switch (ev.key) {
      case 'Escape':
        this.alEscape(ev);
        break;
      case 'Tab':
        this.abierto.set(false);
        break;
      case 'ArrowDown':
        enfocar((actual + 1) % lista.length);
        break;
      case 'ArrowUp':
        enfocar((actual - 1 + lista.length) % lista.length);
        break;
      case 'Home':
        enfocar(0);
        break;
      case 'End':
        enfocar(lista.length - 1);
        break;
    }
  }

  @HostListener('keydown.escape', ['$event'])
  protected alEscape(ev: Event): void {
    if (!this.abierto()) return;
    ev.stopPropagation();
    this.abierto.set(false);
    this.host.nativeElement.querySelector<HTMLElement>('[data-testid="action-menu-trigger"]')?.focus();
  }

  @HostListener('document:click', ['$event'])
  protected alClicGlobal(ev: Event): void {
    if (this.abierto() && !this.host.nativeElement.contains(ev.target as Node)) this.abierto.set(false);
  }

  private botones(): HTMLButtonElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
  }
}

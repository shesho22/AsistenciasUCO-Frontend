import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

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
        <div role="menu" [attr.aria-label]="label()" [class]="clasePanel()" (keydown)="alTeclear($event)">
          @for (item of items(); track item.id) {
            <button
              type="button"
              role="menuitem"
              tabindex="-1"
              [attr.data-testid]="item.testid ?? null"
              [disabled]="item.disabled ?? false"
              (click)="elegir(item)"
              class="w-full text-left px-4 py-2.5 min-h-[44px] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
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

  readonly selected = output<string>();

  protected readonly abierto = signal(false);

  protected claseBoton(): string {
    const base =
      'inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3 rounded-xl border text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 outline-none';
    return this.tone() === 'dark'
      ? `${base} border-primary-300 text-white hover:bg-primary-800 focus-visible:ring-white`
      : `${base} border-warm-300 bg-white text-warm-800 hover:bg-warm-100 focus-visible:ring-primary-600`;
  }

  protected clasePanel(): string {
    const lado = this.placement() === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
    return `absolute right-0 ${lado} z-40 min-w-[13rem] max-w-[calc(100vw-2rem)] rounded-xl border border-warm-200 bg-white py-1 shadow-warm-lg`;
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
    this.abierto.set(true);
    // El menu se pinta tras el siguiente ciclo de deteccion: se enfoca la primera accion habilitada.
    queueMicrotask(() => this.botones()[0]?.focus());
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

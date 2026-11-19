import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { TabItem } from './tabs-nav.component';

/**
 * MEJORAS-SERGIO-2026-11-18 (items 3 y 11): subpestañas locales dentro de una pantalla (sin cambiar la URL) para separar
 * bloques que antes se apilaban uno debajo de otro. Mismo patrón accesible que `app-tabs-nav` (flechas, Home y End); el
 * contenido lo pinta el padre según `activa` dentro de un `role="tabpanel"` con `[id]="idPanel"`.
 */
@Component({
  selector: 'app-subpestanas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div class="flex gap-1 overflow-x-auto max-w-full p-1 rounded-xl bg-warm-100" role="tablist" [attr.aria-label]="etiqueta()">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          role="tab"
          [id]="'subtab-' + tab.id"
          [attr.data-testid]="'subpestana-' + tab.id"
          [attr.aria-controls]="idPanel()"
          [attr.aria-selected]="activa() === tab.id"
          [attr.tabindex]="activa() === tab.id ? 0 : -1"
          (keydown)="alTeclear($event)"
          (click)="activa.set(tab.id)"
          [class]="
            activa() === tab.id
              ? 'bg-white text-primary-800 font-bold shadow-warm-sm'
              : 'text-warm-600 hover:text-warm-900 hover:bg-white/60'
          "
          class="min-h-[44px] px-4 py-2 text-sm rounded-lg whitespace-nowrap shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          {{ tab.etiqueta }}
        </button>
      }
    </div>
  `,
})
export class SubpestanasComponent {
  readonly tabs = input.required<readonly TabItem[]>();
  readonly activa = model.required<string>();
  readonly etiqueta = input<string>('Secciones');
  readonly idPanel = input<string>('panel-subpestanas');

  private readonly indiceActivo = computed(() => this.tabs().findIndex((t) => t.id === this.activa()));

  alTeclear(evento: KeyboardEvent): void {
    const actual = this.indiceActivo();
    const ultimo = this.tabs().length - 1;
    let destino: number;
    if (evento.key === 'ArrowRight') destino = actual === ultimo ? 0 : actual + 1;
    else if (evento.key === 'ArrowLeft') destino = actual <= 0 ? ultimo : actual - 1;
    else if (evento.key === 'Home') destino = 0;
    else if (evento.key === 'End') destino = ultimo;
    else return;
    evento.preventDefault();
    const id = this.tabs()[destino].id;
    this.activa.set(id);
    queueMicrotask(() => document.getElementById('subtab-' + id)?.focus());
  }
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface TabRuta {
  id: string;
  etiqueta: string;
}

/**
 * Lista de pestañas accesible (WAI-ARIA tabs): una pestaña por ruta hija, navegación con flechas, Home y End, y
 * desplazamiento horizontal propio para que en móvil la página no genere scroll lateral. No navega por sí sola: emite
 * `seleccionada` y el contenedor decide la ruta.
 */
@Component({
  selector: 'app-tabs-ruta',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex border-b border-warm-200 gap-1 overflow-x-auto max-w-full"
      role="tablist"
      [attr.aria-label]="etiqueta()"
    >
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          role="tab"
          [id]="'tab-' + tab.id"
          [attr.aria-controls]="panelId()"
          [attr.aria-selected]="activa() === tab.id"
          [attr.tabindex]="activa() === tab.id ? 0 : -1"
          (keydown)="alPulsarTecla($event)"
          (click)="seleccionada.emit(tab.id)"
          [class]="
            activa() === tab.id
              ? 'border-primary-700 text-primary-800 font-bold border-b-2'
              : 'text-warm-500 hover:text-warm-700'
          "
          class="min-h-[44px] px-4 py-3 text-sm whitespace-nowrap shrink-0 transition-colors"
        >
          {{ tab.etiqueta }}
        </button>
      }
    </div>
  `,
})
export class TabsRutaComponent {
  readonly tabs = input.required<readonly TabRuta[]>();
  readonly activa = input.required<string>();
  readonly etiqueta = input<string>('Secciones');
  readonly panelId = input<string>('panel-pestanas');
  readonly seleccionada = output<string>();

  alPulsarTecla(event: KeyboardEvent): void {
    const lista = this.tabs();
    const actual = lista.findIndex((t) => t.id === this.activa());
    const ultimo = lista.length - 1;
    let destino = actual;
    if (event.key === 'ArrowRight') destino = actual === ultimo ? 0 : actual + 1;
    else if (event.key === 'ArrowLeft') destino = actual <= 0 ? ultimo : actual - 1;
    else if (event.key === 'Home') destino = 0;
    else if (event.key === 'End') destino = ultimo;
    else return;
    event.preventDefault();
    const id = lista[destino].id;
    this.seleccionada.emit(id);
    queueMicrotask(() => document.getElementById('tab-' + id)?.focus());
  }
}

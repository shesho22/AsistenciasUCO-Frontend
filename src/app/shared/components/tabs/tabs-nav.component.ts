import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

export interface TabItem {
  id: string;
  etiqueta: string;
}

/**
 * Lee `data.tab` de la ruta hija activa (hoja del árbol de la ruta actual) y lo expone como Signal. Debe llamarse en un
 * contexto de inyección (campo de un componente cascarón). Devuelve `null` si la ruta no declara pestaña.
 */
export function pestanaEnRuta() {
  const router = inject(Router);
  const route = inject(ActivatedRoute);
  return toSignal(
    router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let hoja = route;
        while (hoja.firstChild) hoja = hoja.firstChild;
        // El snapshot aún no existe mientras se construye el cascarón; NavigationEnd lo actualiza enseguida.
        const datos = (hoja.snapshot as ActivatedRoute['snapshot'] | undefined)?.data;
        return (datos?.['tab'] as string | undefined) ?? null;
      })
    ),
    { initialValue: null as string | null }
  );
}

/**
 * CULM-001 (UX de simplificación): barra de pestañas con enlace profundo. Cada pestaña es una ruta hija
 * (`[...base, id]`); se opera con ratón, flechas, Home y End, y la lista hace scroll horizontal propio en móvil para no
 * ensanchar la página. El contenido (`role="tabpanel"`) lo pone el cascarón con `[id]="idPanel"`.
 */
@Component({
  selector: 'app-tabs-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div class="flex border-b border-warm-200 gap-1 overflow-x-auto max-w-full" role="tablist" [attr.aria-label]="etiqueta()">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          role="tab"
          [id]="'tab-' + tab.id"
          [attr.aria-controls]="idPanel()"
          [attr.aria-selected]="activa() === tab.id"
          [attr.tabindex]="activa() === tab.id ? 0 : -1"
          (keydown)="onTabKeydown($event)"
          (click)="seleccionar(tab.id)"
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
export class TabsNavComponent {
  private readonly router = inject(Router);

  readonly tabs = input.required<readonly TabItem[]>();
  /** Identificador de la pestaña activa (ya resuelto por el cascarón). */
  readonly activa = input.required<string>();
  /** Comandos del router hasta la ruta padre; la pestaña se agrega al final. */
  readonly base = input.required<readonly string[]>();
  readonly etiqueta = input<string>('Secciones');
  /** Id del panel que controlan las pestañas. */
  readonly idPanel = input<string>('panel-pestanas');

  private readonly indiceActivo = computed(() => this.tabs().findIndex((t) => t.id === this.activa()));

  seleccionar(id: string): void {
    void this.router.navigate([...this.base(), id]);
  }

  onTabKeydown(event: KeyboardEvent): void {
    const actual = this.indiceActivo();
    const ultimo = this.tabs().length - 1;
    let destino = actual;
    if (event.key === 'ArrowRight') destino = actual === ultimo ? 0 : actual + 1;
    else if (event.key === 'ArrowLeft') destino = actual <= 0 ? ultimo : actual - 1;
    else if (event.key === 'Home') destino = 0;
    else if (event.key === 'End') destino = ultimo;
    else return;
    event.preventDefault();
    const id = this.tabs()[destino].id;
    this.seleccionar(id);
    queueMicrotask(() => document.getElementById('tab-' + id)?.focus());
  }
}

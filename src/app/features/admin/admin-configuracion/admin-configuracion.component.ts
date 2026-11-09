import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

export type TabConfiguracion =
  | 'parametros'
  | 'catalogos'
  | 'estados'
  | 'mensajes'
  | 'festivos'
  | 'correo'
  | 'areas'
  | 'instituciones';

export interface TabConfiguracionItem {
  id: TabConfiguracion;
  etiqueta: string;
}

/** Orden de las pestañas de la vista única de configuración del administrador. */
export const TABS_CONFIGURACION: readonly TabConfiguracionItem[] = [
  { id: 'parametros', etiqueta: 'Parámetros del sistema' },
  { id: 'catalogos', etiqueta: 'Catálogos' },
  { id: 'estados', etiqueta: 'Estados' },
  { id: 'mensajes', etiqueta: 'Mensajes' },
  { id: 'festivos', etiqueta: 'Festivos' },
  { id: 'correo', etiqueta: 'Correo y notificaciones' },
  { id: 'areas', etiqueta: 'Áreas' },
  { id: 'instituciones', etiqueta: 'Instituciones' },
];

const TAB_POR_DEFECTO: TabConfiguracion = 'parametros';

/**
 * Cascarón de la vista única de configuración del administrador: pestañas con enlace profundo
 * (`/app/admin/configuracion/:pestaña`) sobre rutas hijas que reutilizan cada pantalla existente y se descargan solo al
 * abrirse. Las operaciones (auditoría y cierre masivo) permanecen en `admin/sistema`.
 */
@Component({
  selector: 'app-admin-configuracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <div class="space-y-5 min-w-0">
      <div>
        <h1 class="text-2xl font-serif font-bold text-warm-900">Configuración</h1>
        <p class="text-sm text-warm-600">Variables, catálogos y pre-registros del sistema en un solo lugar.</p>
      </div>

      <div
        class="flex border-b border-warm-200 gap-1 overflow-x-auto max-w-full"
        role="tablist"
        aria-label="Secciones de configuración"
      >
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            role="tab"
            [id]="'tab-' + tab.id"
            aria-controls="panel-configuracion"
            [attr.aria-selected]="tabActiva() === tab.id"
            [attr.tabindex]="tabActiva() === tab.id ? 0 : -1"
            (keydown)="onTabKeydown($event)"
            (click)="seleccionar(tab.id)"
            [class]="
              tabActiva() === tab.id
                ? 'border-primary-700 text-primary-800 font-bold border-b-2'
                : 'text-warm-500 hover:text-warm-700'
            "
            class="min-h-[44px] px-4 py-3 text-sm whitespace-nowrap shrink-0 transition-colors"
          >
            {{ tab.etiqueta }}
          </button>
        }
      </div>

      <div role="tabpanel" id="panel-configuracion" [attr.aria-labelledby]="'tab-' + tabActiva()" class="min-w-0">
        <router-outlet />
      </div>
    </div>
  `,
})
export class AdminConfiguracionComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly tabs = TABS_CONFIGURACION;

  private readonly tabEnRuta = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let hoja = this.route;
        while (hoja.firstChild) hoja = hoja.firstChild;
        // El snapshot aún no existe mientras se construye el cascarón; NavigationEnd lo actualiza enseguida.
        const datos = (hoja.snapshot as ActivatedRoute['snapshot'] | undefined)?.data;
        return (datos?.['tab'] as string | undefined) ?? null;
      })
    ),
    { initialValue: null as string | null }
  );

  /** Pestaña activa: la de la ruta hija si es conocida; si no, Parámetros del sistema. */
  readonly tabActiva = computed<TabConfiguracion>(() => {
    const id = this.tabEnRuta();
    return this.tabs.find((t) => t.id === id)?.id ?? TAB_POR_DEFECTO;
  });

  seleccionar(id: TabConfiguracion): void {
    void this.router.navigate(['/app/admin/configuracion', id]);
  }

  onTabKeydown(event: KeyboardEvent): void {
    const actual = this.tabs.findIndex((t) => t.id === this.tabActiva());
    const ultimo = this.tabs.length - 1;
    let destino = actual;
    if (event.key === 'ArrowRight') destino = actual === ultimo ? 0 : actual + 1;
    else if (event.key === 'ArrowLeft') destino = actual === 0 ? ultimo : actual - 1;
    else if (event.key === 'Home') destino = 0;
    else if (event.key === 'End') destino = ultimo;
    else return;
    event.preventDefault();
    const id = this.tabs[destino].id;
    this.seleccionar(id);
    queueMicrotask(() => document.getElementById('tab-' + id)?.focus());
  }
}

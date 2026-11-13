import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TabsNavComponent, pestanaEnRuta } from '../../../shared/components/tabs/tabs-nav.component';

export type TabConfiguracion =
  | 'parametros'
  | 'catalogos'
  | 'estados'
  | 'festivos'
  | 'correo'
  | 'areas'
  | 'periodos';

export interface TabConfiguracionItem {
  id: TabConfiguracion;
  etiqueta: string;
}

/** Orden de las pestañas de la vista única de configuración del administrador. */
export const TABS_CONFIGURACION: readonly TabConfiguracionItem[] = [
  { id: 'parametros', etiqueta: 'Parámetros del sistema' },
  { id: 'catalogos', etiqueta: 'Catálogos' },
  { id: 'estados', etiqueta: 'Estados' },
  { id: 'festivos', etiqueta: 'Festivos' },
  { id: 'correo', etiqueta: 'Correo y notificaciones' },
  { id: 'areas', etiqueta: 'Áreas' },
  { id: 'periodos', etiqueta: 'Períodos' },
];

const TAB_POR_DEFECTO: TabConfiguracion = 'parametros';

/**
 * Cascarón de la vista única de configuración del administrador: pestañas con enlace profundo
 * (`/app/admin/configuracion/:pestaña`) sobre rutas hijas que reutilizan cada pantalla existente y se descargan solo al
 * abrirse. Las operaciones (auditoría y cierre masivo) permanecen en `admin/sistema`.
 */
@Component({
    selector: 'app-admin-configuracion',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet, TabsNavComponent],
    template: `
    <div class="space-y-5 min-w-0">
      <div>
        <h1 class="text-2xl font-serif font-bold text-warm-900">Configuración</h1>
        <p class="text-sm text-warm-600">Variables, catálogos, festivos, correo, áreas y períodos del sistema en un solo lugar.</p>
      </div>

      <app-tabs-nav
        [tabs]="tabs"
        [activa]="tabActiva()"
        [base]="['/app/admin/configuracion']"
        etiqueta="Secciones de configuración"
        idPanel="panel-configuracion"
      />

      <div role="tabpanel" id="panel-configuracion" [attr.aria-labelledby]="'tab-' + tabActiva()" class="min-w-0">
        <router-outlet />
      </div>
    </div>
  `
})
export class AdminConfiguracionComponent {
  readonly tabs = TABS_CONFIGURACION;

  private readonly tabEnRuta = pestanaEnRuta();

  /** Pestaña activa: la de la ruta hija si es conocida; si no, Parámetros del sistema. */
  readonly tabActiva = computed<TabConfiguracion>(() => {
    const id = this.tabEnRuta();
    return this.tabs.find((t) => t.id === id)?.id ?? TAB_POR_DEFECTO;
  });
}

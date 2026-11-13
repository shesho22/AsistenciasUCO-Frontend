import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { TabItem, TabsNavComponent, pestanaEnRuta } from '../tabs/tabs-nav.component';

/** Datos que cada ruta cascarón declara en `data` para describir su pantalla. */
export interface PestanasShellData {
  titulo: string;
  descripcion?: string;
  tabs: readonly TabItem[];
  /** Comandos del router hasta el cascarón; la pestaña activa se agrega al final. */
  base: readonly string[];
}

/**
 * CULM-001: cascarón genérico de una pantalla con pestañas por URL hija (`data.tab` en cada hija). Un solo título,
 * la barra de pestañas compartida y el contenido de la pestaña en el panel. Se configura por `data` de la ruta
 * (`titulo`, `descripcion`, `tabs`, `base`), así decano y coordinador no repiten cascarones.
 */
@Component({
    selector: 'app-pestanas-shell',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [RouterOutlet, TabsNavComponent],
    template: `
    <div class="space-y-4 min-w-0">
      <div>
        <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">{{ datos.titulo }}</h1>
        @if (datos.descripcion) {
          <p class="text-sm text-warm-600 mt-1">{{ datos.descripcion }}</p>
        }
      </div>

      <app-tabs-nav
        [tabs]="datos.tabs"
        [activa]="tabActiva()"
        [base]="datos.base"
        [etiqueta]="'Secciones de ' + datos.titulo"
        idPanel="panel-pestanas"
      />

      <div role="tabpanel" id="panel-pestanas" [attr.aria-labelledby]="'tab-' + tabActiva()" class="min-w-0">
        <router-outlet />
      </div>
    </div>
  `
})
export class PestanasShellComponent {
  readonly datos = inject(ActivatedRoute).snapshot.data as PestanasShellData;
  private readonly tabEnRuta = pestanaEnRuta();

  /** Pestaña de la ruta hija si es conocida; si no, la primera. */
  readonly tabActiva = computed(() => {
    const id = this.tabEnRuta();
    return this.datos.tabs.find((t) => t.id === id)?.id ?? this.datos.tabs[0].id;
  });
}

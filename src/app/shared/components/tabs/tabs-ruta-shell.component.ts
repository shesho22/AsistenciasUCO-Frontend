import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { TabRuta, TabsRutaComponent } from './tabs-ruta.component';

/** Configuración del cascarón, declarada en `data.shell` de la ruta padre. */
export interface TabsRutaShellConfig {
  titulo: string;
  descripcion: string;
  /** Ruta absoluta del padre, p. ej. `/app/admin/personas`; la pestaña se agrega como último segmento. */
  base: string;
  tabs: readonly TabRuta[];
  /** Pestaña que se abre cuando la ruta hija no la identifica. */
  porDefecto: string;
}

/**
 * Cascarón genérico de pestañas por ruta hija: cada hija declara `data.tab` y se carga de forma diferida.
 * Sirve a Personas, Estructura (administrador) y Mis materias (estudiante).
 */
@Component({
  selector: 'app-tabs-ruta-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, TabsRutaComponent],
  template: `
    <div class="space-y-5 min-w-0">
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-primary-700">{{ config.titulo }}</p>
        <p class="text-sm text-warm-600">{{ config.descripcion }}</p>
      </div>
      <app-tabs-ruta
        [tabs]="config.tabs"
        [activa]="tabActiva()"
        [etiqueta]="'Secciones de ' + config.titulo"
        panelId="panel-pestanas"
        (seleccionada)="seleccionar($event)"
      />
      <div role="tabpanel" id="panel-pestanas" [attr.aria-labelledby]="'tab-' + tabActiva()" class="min-w-0">
        <router-outlet />
      </div>
    </div>
  `,
})
export class TabsRutaShellComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly config = this.route.snapshot.data['shell'] as TabsRutaShellConfig;

  private readonly tabEnRuta = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let hoja = this.route;
        while (hoja.firstChild) hoja = hoja.firstChild;
        const datos = (hoja.snapshot as ActivatedRoute['snapshot'] | undefined)?.data;
        return (datos?.['tab'] as string | undefined) ?? null;
      })
    ),
    { initialValue: null as string | null }
  );

  readonly tabActiva = computed(() => {
    const id = this.tabEnRuta();
    return this.config.tabs.find((t) => t.id === id)?.id ?? this.config.porDefecto;
  });

  seleccionar(id: string): void {
    void this.router.navigate([this.config.base, id]);
  }
}

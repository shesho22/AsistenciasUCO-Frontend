import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DeanFacultyComponent } from '../dean-faculty/dean-faculty.component';
import { DeanEstructuraComponent } from '../dean-estructura/dean-estructura.component';
import { DeanProgramasGestionComponent } from '../dean-programas/components/dean-programas-gestion.component';
import { DeanProgramasCreditosComponent } from '../dean-programas/components/dean-programas-creditos.component';
import { SubpestanasComponent } from '../../../shared/components/tabs/subpestanas.component';
import { TabItem } from '../../../shared/components/tabs/tabs-nav.component';

/** Bloques de la pestaña «Programas» de Mi facultad. */
export const SECCIONES_PROGRAMAS: readonly TabItem[] = [
  { id: 'estructura', etiqueta: 'Estructura y planes' },
  { id: 'gestion', etiqueta: 'Gestión de programas' },
  { id: 'creditos', etiqueta: 'Créditos por programa' },
];

/**
 * CULM-001: pestaña «Programas» de Mi facultad. Cabecera de la facultad con tres cifras y, debajo, UNA sección a la vez
 * (MEJORAS-SERGIO-2026-11-18, item 3): el árbol de programas con sus planes (con acceso a la malla), la gestión de programas
 * y la tabla de créditos. Antes las tres se apilaban en una sola columna larga. Solo compone componentes existentes.
 */
@Component({
    selector: 'app-dean-programas-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [DeanFacultyComponent, DeanEstructuraComponent, DeanProgramasGestionComponent, DeanProgramasCreditosComponent, SubpestanasComponent],
    template: `
    <div class="space-y-4 min-w-0">
      <app-dean-faculty />
      <app-subpestanas [tabs]="secciones" [(activa)]="seccion" etiqueta="Secciones de programas" idPanel="panel-programas-facultad" />
      <div role="tabpanel" id="panel-programas-facultad" [attr.aria-labelledby]="'subtab-' + seccion()" class="min-w-0">
        @switch (seccion()) {
          @case ('gestion') {
            <app-dean-programas-gestion />
          }
          @case ('creditos') {
            <app-dean-programas-creditos />
          }
          @default {
            <app-dean-estructura [embebido]="true" />
          }
        }
      </div>
    </div>
  `
})
export class DeanProgramasTabComponent {
  readonly secciones = SECCIONES_PROGRAMAS;
  readonly seccion = signal<string>('estructura');
}

import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
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
 *
 * Cada sección se monta la primera vez que se abre y luego solo se oculta (`[hidden]`): cambiar de subpestaña no destruye
 * los filtros ni un formulario abierto en «Gestión de programas». Montarlas solo al visitarlas evita pedir al entrar los
 * datos de las tres secciones.
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
        @if (visitada('estructura')) {
          <div [hidden]="seccion() !== 'estructura'" data-testid="seccion-estructura">
            <app-dean-estructura [embebido]="true" />
          </div>
        }
        @if (visitada('gestion')) {
          <div [hidden]="seccion() !== 'gestion'" data-testid="seccion-gestion">
            <app-dean-programas-gestion />
          </div>
        }
        @if (visitada('creditos')) {
          <div [hidden]="seccion() !== 'creditos'" data-testid="seccion-creditos">
            <app-dean-programas-creditos />
          </div>
        }
      </div>
    </div>
  `
})
export class DeanProgramasTabComponent {
  readonly secciones = SECCIONES_PROGRAMAS;
  readonly seccion = signal<string>('estructura');
  /** Secciones ya abiertas: siguen montadas (ocultas) para conservar su estado. */
  private readonly visitadas = signal<ReadonlySet<string>>(new Set(['estructura']));

  constructor() {
    effect(() => {
      const actual = this.seccion();
      const previas = this.visitadas();
      if (!previas.has(actual)) this.visitadas.set(new Set([...previas, actual]));
    });
  }

  visitada(id: string): boolean {
    return this.visitadas().has(id) || this.seccion() === id;
  }
}

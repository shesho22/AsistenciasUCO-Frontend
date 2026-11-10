import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DeanFacultyComponent } from '../dean-faculty/dean-faculty.component';
import { DeanEstructuraComponent } from '../dean-estructura/dean-estructura.component';
import { DeanProgramasComponent } from '../dean-programas/dean-programas.component';

/**
 * CULM-001: pestaña «Programas» de Mi facultad. Fusiona las antiguas pantallas de facultad, estructura y programas:
 * cabecera de la facultad con tres cifras, el árbol de programas con sus planes (con acceso a la malla) y la gestión
 * y los créditos de los programas. Solo compone componentes existentes.
 */
@Component({
  selector: 'app-dean-programas-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [DeanFacultyComponent, DeanEstructuraComponent, DeanProgramasComponent],
  template: `
    <div class="space-y-4 min-w-0">
      <app-dean-faculty />
      <app-dean-estructura [embebido]="true" />
      <app-dean-programas [embebido]="true" />
    </div>
  `,
})
export class DeanProgramasTabComponent {}

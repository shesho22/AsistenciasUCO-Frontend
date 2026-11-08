import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CoordinatorProgramService } from '../../../core/services/coordinator-program.service';

/**
 * CULM-001 B2NM (S4): selector del programa activo del coordinador. Solo aparece cuando el coordinador tiene más de un
 * programa; la selección se conserva en la sesión y cada consulta del coordinador la envía como `programaId`.
 */
@Component({
  selector: 'app-coordinator-program-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (programa.requiereSelector()) {
      <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <label for="coordinador-programa" class="text-xs font-semibold text-warm-700">Programa</label>
        <select
          id="coordinador-programa"
          class="w-full sm:w-auto rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-warm-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          (change)="cambiar($any($event.target).value)"
        >
          @for (p of programa.programas(); track p.idPrograma) {
            <option [value]="p.idPrograma" [selected]="p.idPrograma === programa.programaId()">{{ p.nombrePrograma }}</option>
          }
        </select>
      </div>
    }
  `,
})
export class CoordinatorProgramSelectorComponent {
  readonly programa = inject(CoordinatorProgramService);
  /** Emite el programa elegido para que la pantalla recargue sus datos. */
  readonly programaCambiado = output<string>();

  cambiar(idPrograma: string): void {
    this.programa.seleccionar(idPrograma);
    this.programaCambiado.emit(idPrograma);
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ProgramaAcademico } from '../../../../core/models/programa-academico.model';

/** Confirmación de activación o desactivación de un programa (HU078). El error lo redacta el backend. */
@Component({
    selector: 'app-dean-programa-estado-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalComponent],
    template: `
    <app-modal [isOpen]="true" [title]="estadoDestino() ? 'Activar programa' : 'Desactivar programa'" (closed)="cancelar()">
      <div class="space-y-4">
        <p class="text-sm text-warm-700">
          {{ estadoDestino() ? '¿Activar' : '¿Desactivar' }} el programa
          <strong class="text-warm-900">{{ programa().nombre }}</strong>?
        </p>
        @if (error()) {
          <p class="text-xs font-semibold text-danger-600" role="alert">{{ error() }}</p>
        }
        <div class="flex justify-end gap-2">
          <button type="button" (click)="cancelar()" class="px-3.5 py-2 rounded-xl bg-warm-50 hover:bg-warm-100 text-xs font-semibold text-warm-700 border border-warm-200">
            Cancelar
          </button>
          <button type="button" (click)="aceptar()" class="px-3.5 py-2 rounded-xl bg-primary-700 hover:bg-primary-800 text-xs font-bold text-white">
            {{ estadoDestino() ? 'Activar' : 'Desactivar' }}
          </button>
        </div>
      </div>
    </app-modal>
  `
})
export class DeanProgramaEstadoModalComponent {
  readonly programa = input.required<ProgramaAcademico>();
  readonly error = input<string>('');
  readonly confirmar = output<boolean>();
  readonly cerrar = output<void>();

  readonly estadoDestino = computed(() => !this.programa().estaActivo);

  aceptar(): void {
    this.confirmar.emit(this.estadoDestino());
  }

  cancelar(): void {
    this.cerrar.emit();
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CoordinadorItem } from '../../../../core/models/role-management.model';

/**
 * HU122: confirmación para desactivar o reactivar a un coordinador. La regla de negocio (p. ej. no se puede
 * desactivar a quien coordina un programa activo) la decide el backend y su mensaje se muestra tal cual.
 */
@Component({
    selector: 'app-dean-coordinador-estado-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalComponent],
    template: `
    <app-modal [isOpen]="true" [title]="titulo()" (closed)="cancelar.emit()">
      <div class="space-y-3 text-sm text-warm-700">
        @if (activo()) {
          <p>
            ¿Desactivar a <span class="font-semibold text-warm-900">{{ coordinador().nombres }} {{ coordinador().apellidos }}</span>?
          </p>
          <p class="text-xs text-warm-600">
            Perderá el acceso como coordinador. Si no tiene otro rol activo, su cuenta de acceso también se deshabilitará.
          </p>
        } @else {
          <p>
            ¿Reactivar a <span class="font-semibold text-warm-900">{{ coordinador().nombres }} {{ coordinador().apellidos }}</span>?
          </p>
          <p class="text-xs text-warm-600">Recuperará el acceso como coordinador y su cuenta de acceso se habilitará.</p>
        }
      </div>

      <div modal-footer class="flex items-center gap-3">
        <button
          type="button"
          data-accion="cancelar"
          (click)="cancelar.emit()"
          class="text-xs px-3 py-2 rounded-xl border border-warm-300 text-warm-700 hover:bg-warm-100 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          data-accion="confirmar"
          (click)="confirmar.emit()"
          class="text-xs px-3 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          {{ activo() ? 'Desactivar' : 'Reactivar' }}
        </button>
      </div>
    </app-modal>
  `
})
export class DeanCoordinadorEstadoModalComponent {
  coordinador = input.required<CoordinadorItem>();
  confirmar = output<void>();
  cancelar = output<void>();

  activo = computed(() => this.coordinador().estado === 'ACTIVO');
  titulo = computed(() => (this.activo() ? 'Desactivar coordinador' : 'Reactivar coordinador'));
}

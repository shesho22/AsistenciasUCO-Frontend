import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';

let confirmDialogCounter = 0;

/**
 * Confirmación modal accesible (role=alertdialog, foco atrapado y devuelto, Escape cancela). Sustituye a
 * window.confirm, que bloquea el hilo y no se puede estilizar ni probar.
 */
@Component({
    selector: 'app-confirm-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalComponent],
    template: `
    <app-modal
      [isOpen]="isOpen()"
      [title]="title()"
      dialogRole="alertdialog"
      [descriptionId]="descripcionId"
      (closed)="cancelled.emit()"
    >
      <p [id]="descripcionId" class="text-sm text-warm-700">{{ message() }}</p>

      <div modal-footer class="flex items-center gap-3">
        <button
          type="button"
          data-accion="cancelar"
          (click)="cancelled.emit()"
          class="min-h-[44px] text-xs px-4 rounded-xl border border-warm-300 text-warm-700 hover:bg-warm-100 transition-colors"
        >
          {{ cancelLabel() }}
        </button>
        <button
          type="button"
          data-accion="confirmar"
          (click)="confirmed.emit()"
          [class]="
            'min-h-[44px] text-xs px-4 rounded-xl font-bold text-white transition-colors ' +
            (destructive() ? 'bg-danger-700 hover:bg-danger-800' : 'bg-primary-700 hover:bg-primary-800')
          "
        >
          {{ confirmLabel() }}
        </button>
      </div>
    </app-modal>
  `
})
export class ConfirmDialogComponent {
  readonly isOpen = input<boolean>(false);
  readonly title = input<string>('Confirmar acción');
  readonly message = input<string>('');
  readonly confirmLabel = input<string>('Confirmar');
  readonly cancelLabel = input<string>('Cancelar');
  readonly destructive = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly descripcionId = `confirm-dialog-desc-${++confirmDialogCounter}`;
}
